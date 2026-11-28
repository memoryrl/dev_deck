# 15. 로컬 LLM (Ollama)

이 맥에 설치한 Ollama 모델로 세 가지를 한다. 포트폴리오 안내원만 Gemini 무료 등급을 먼저 쓰고 Ollama를 대체로 쓴다.

| 기능 | 누가 쓰나 | 경로 |
| --- | --- | --- |
| 모델 테스트 채팅 | 관리자 | `/site/ollama-chat` |
| 포트폴리오 안내원 (우하단 위젯) | 누구나 (횟수 제한) | 모든 공개 페이지 |
| 게시판 글쓰기 AI 템플릿 | 그 게시판에 쓸 수 있는 사람 | 게시판 글쓰기 폼 |

모델은 두 개다. 한국어 일반 대화·양식은 `exaone3.5:2.4b`, 코드·프롬프트 질문은 `qwen2.5-coder:3b`. 둘 다 3B 미만이라 **지어내기를 전제로** 만든다(아래 "왜 이렇게 만들었나").

## Ollama에 붙는 법

`lib/ollama/client.ts`의 `getOllamaConnection()`이 정한다.

- **로컬 개발**: 항상 `http://127.0.0.1:11434`.
- **Vercel**: 서버리스 함수는 이 맥의 localhost에 닿지 못한다. `app_env` 테이블의 `OLLAMA_BASE_URL`(Cloudflare 터널 주소)이 우선이고, 없으면 환경 변수 `OLLAMA_BASE_URL`. loopback 주소를 넣으면 막는다.
- 터널 주소는 맥미니가 스스로 등록한다(아래 "맥미니 상시 실행"). 사이트 설정 > Ollama 주소에서 손으로 넣어도 된다. `app_env`는 RLS로 관리자만 쓰고, 읽기는 서버에서 서비스 롤로 한다(비회원 질문도 터널 주소가 필요해서).
- Vercel은 모든 Ollama 요청에 `X-DevDeck-Key: $OLLAMA_PROXY_KEY` 헤더를 붙인다.

> **실제 터널 주소와 키를 SQL·코드·문서에 적지 않는다.** 이 저장소는 공개다.

## 맥미니 상시 실행 (재부팅해도 손댈 것 없음)

```
Vercel ──X-DevDeck-Key──▶ trycloudflare 임시 터널 ──▶ Caddy 127.0.0.1:11435 ──▶ Ollama 127.0.0.1:11434
```

- **Caddy 문지기**: 키가 맞는 `/api/chat`, `/api/tags`만 통과시킨다. 모델 받기·삭제·생성 등 나머지는 404. Host 헤더도 Caddy가 `127.0.0.1:11434`로 바꿔 주므로 `OLLAMA_ORIGINS`나 `--http-host-header`는 필요 없다.
- **자동 등록**: cloudflared가 새 주소를 받으면 스크립트가 `POST /api/ollama-tunnel`(Bearer `OLLAMA_PROXY_KEY`, `https://*.trycloudflare.com`만 허용)로 `app_env`를 갱신한다. 실패하면 60초마다 다시 시도한다.
- 파일 (맥미니, 저장소 밖):
  - `~/.config/devdeck-ollama/` — `key`(600), `Caddyfile`(600, 키 포함), `tunnel.sh`
  - `~/Library/LaunchAgents/com.devdeck.ollama.plist` — 로그인 시 `OLLAMA_KEEP_ALIVE=-1` 설정 후 Ollama.app 실행
  - `~/Library/LaunchAgents/com.devdeck.caddy.plist`, `com.devdeck.ollama-tunnel.plist` — 죽으면 launchd가 다시 켠다
  - 로그: `~/Library/Logs/devdeck-caddy.log`, `devdeck-ollama-tunnel.log`
- **키 교체**: `openssl rand -hex 32 > ~/.config/devdeck-ollama/key` → Caddyfile의 키 값 교체 → Vercel `OLLAMA_PROXY_KEY` 교체·재배포 → `launchctl kickstart -k gui/$(id -u)/com.devdeck.caddy` 와 `com.devdeck.ollama-tunnel`.
- LaunchAgent는 로그인해야 돈다. 재부팅 후 자동으로 돌게 하려면 macOS 자동 로그인을 켠다.

## 관리자 테스트 채팅

`/site/ollama-chat`(`requireOwner`). 설치된 모델 목록은 `GET /api/tags`로 읽고, 꺼져 있으면 기본 두 모델을 보여 준다. 대화는 저장하지 않는다. 서버 액션 `sendOllamaMessage`가 모델 이름(정규식)·메시지 수(40)·길이(8,000자)를 검증한다.

## 포트폴리오 안내원

`lib/portfolio-assistant/`. 방문자가 이 사이트의 커리어·스킬·프롬프트에 대해 묻는다.

- **횟수 제한**(`checkRateLimitPersistent`, 하루는 KST 기준): 관리자는 없음. 회원은 5분 10회 + 하루 20회. 비회원은 IP당 하루 3회 + 비회원 전체 하루 300회. 비회원 대화는 `portfolio_asks`에 남기지 않는다.
- **제공자**(`llm.ts`): Gemini 무료 등급(`lib/gemini/client.ts`)이 먼저, 실패하거나 무료 한도가 차면 맥미니 Ollama.
- **근거 자료**(`context.ts`): 공개된 커리어 글·스킬·프롬프트를 통째로 압축해 매번 시스템 프롬프트에 넣는다. 검색은 하지 않는다 — 콘텐츠가 수십 건이면 전량 주입이 더 단순하고 빠뜨리지 않는다. 섹션이 비었으면 "(아직 공개된 항목이 없습니다.)"를 적어 준다.
- **모델 선택**: 질문에 코드·함수·버그·프롬프트 등이 있으면 qwen, 아니면 exaone. `temperature 0.2`.
- **지어낸 링크 차단**: 답에 `http(s)://`가 있거나 자료에 없는 `/work/…`·`/p/…`가 있으면 답 전체를 버리고 안내 문구로 바꾼다.
- **기록**: 질문·답변은 `portfolio_asks`에 남고(`supabase/patch-portfolio-asks.sql`), 관리자는 `/site/portfolio-asks`에서 누가 뭘 물었는지 본다. 회원은 본인 것만, 관리자는 전체를 읽는다.

## 게시판 AI 템플릿

`components/board/ai-template-picker.tsx` + `lib/boards/ai-template*.ts`. 글쓰기 폼의 "AI 템플릿" 버튼.

- **목록은 고정**(`ai-templates.ts`): 공지사항(점검·업데이트·이벤트), 자유게시판(후기·질문·팁), 스킬(기술 정리), 그 외 게시판은 범용(소개 글·안내문). 소형 모델에게 "목록까지" 시키면 흔들려서, 구조는 코드가 쥐고 AI는 칸의 내용만 채운다.
- **조립은 코드가**: 모델은 `섹션 제목: 내용`만 쓰고, HTML(제목·표·목록·인용)은 `ai-template-generate.ts`가 만든다. 제목과 내용이 다른 줄에 오거나 마크다운·이모지가 섞여도 알려진 제목을 기준으로 묶고 정리한다.
- **캐시**: 게시판×템플릿당 한 건을 `ai_board_templates`에 저장하고, 이후엔 AI를 부르지 않는다(`supabase/patch-ai-board-templates.sql`). 읽을 때와 쓸 때 모두 `sanitizeRichHtml`을 거친다.
- **권한**: `canWriteBoard`(로그인 + 그 게시판의 `write_role`)를 그대로 쓴다. 생성 사용자당 10분 10회.
- **UX**: 생성 중엔 패널 테두리가 회전하고, CKEditor는 `enableReadOnlyMode`로 잠기며, 패널은 바깥 클릭·Esc·닫기로도 닫히지 않는다. 이미 본문이 있으면 덮어쓰기 전에 확인한다.
- 에디터는 `RichEditorClient`의 `onEditorReady`로 인스턴스를 내보내 부모가 `setData`를 부른다.

## 왜 이렇게 만들었나

3B급 모델은 프롬프트로 "지어내지 마"라고 해도 없는 프로젝트와 가짜 URL을 만들었다(자료가 비었을 때 실측). 그래서 세 겹으로 막는다: ① 비어 있음을 자료에 명시 ② 낮은 temperature ③ 답변 후처리(링크 검증). 템플릿은 반대로 "자유 생성"을 최대한 줄이고 파서를 방어적으로 짰다(모델이 제목과 내용을 다른 줄에 쓰면 세 번 중 한 번은 통째로 실패했다).

## 적용

Supabase SQL Editor에서 순서대로 실행한다(모두 재실행해도 안전).

1. `patch-app-env.sql` — 서버 환경값 테이블(터널 주소는 빈 값으로 만들어진다)
2. `patch-ollama-chat-menu.sql` — 관리자 사이드바 "로컬 LLM 테스트"
3. `patch-portfolio-asks.sql` — 안내원 질문 기록 + 사이드바 "포트폴리오 질문"
4. `patch-ai-board-templates.sql` — AI 템플릿 캐시

그다음 `/site/settings`에서 Ollama 주소를 넣는다(Vercel에서만 필요).
