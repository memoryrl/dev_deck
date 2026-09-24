# 15. 로컬 LLM (Ollama)

이 맥에 설치한 Ollama 모델로 세 가지를 한다. 외부 LLM API 키는 쓰지 않는다.

| 기능 | 누가 쓰나 | 경로 |
| --- | --- | --- |
| 모델 테스트 채팅 | 관리자 | `/site/ollama-chat` |
| 포트폴리오 안내원 (우하단 위젯) | 로그인한 회원 | 모든 공개 페이지 |
| 게시판 글쓰기 AI 템플릿 | 그 게시판에 쓸 수 있는 사람 | 게시판 글쓰기 폼 |

모델은 두 개다. 한국어 일반 대화·양식은 `exaone3.5:2.4b`, 코드·프롬프트 질문은 `qwen2.5-coder:3b`. 둘 다 3B 미만이라 **지어내기를 전제로** 만든다(아래 "왜 이렇게 만들었나").

## Ollama에 붙는 법

`lib/ollama/client.ts`의 `getOllamaConnection()`이 정한다.

- **로컬 개발**: 항상 `http://127.0.0.1:11434`.
- **Vercel**: 서버리스 함수는 이 맥의 localhost에 닿지 못한다. `app_env` 테이블의 `OLLAMA_BASE_URL`(Cloudflare 터널 주소)이 우선이고, 없으면 환경 변수 `OLLAMA_BASE_URL`. loopback 주소를 넣으면 막는다.
- 터널 주소는 관리자 **사이트 설정 > Ollama 주소**에서 넣는다. `app_env`는 RLS로 관리자만 읽고 쓴다(`supabase/patch-app-env.sql`).
- 터널이 `Host` 헤더 때문에 403/530이면 `cloudflared`를 `--http-host-header 127.0.0.1`로 다시 켠다.

> **실제 터널 주소를 SQL·코드·문서에 적지 않는다.** 이 저장소는 공개이고, Ollama API에는 인증이 없다. 주소를 아는 사람은 레이트리밋도 근거 자료 제한도 거치지 않고 이 맥의 모델에 바로 붙는다. `trycloudflare.com` 임시 주소는 `cloudflared`를 다시 켜면 바뀌므로, 오래 쓸 거면 Named Tunnel + Access를 권한다.

## 관리자 테스트 채팅

`/site/ollama-chat`(`requireOwner`). 설치된 모델 목록은 `GET /api/tags`로 읽고, 꺼져 있으면 기본 두 모델을 보여 준다. 대화는 저장하지 않는다. 서버 액션 `sendOllamaMessage`가 모델 이름(정규식)·메시지 수(40)·길이(8,000자)를 검증한다.

## 포트폴리오 안내원

`lib/portfolio-assistant/`. 방문자가 이 사이트의 커리어·스킬·프롬프트에 대해 묻는다.

- **로그인 필요.** 비회원은 위젯에서 로그인으로 안내된다. 사용자당 5분 10회(`checkRateLimitPersistent`).
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
