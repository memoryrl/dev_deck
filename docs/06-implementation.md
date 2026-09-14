# 06. Implementation Guide

설계가 확정된 뒤에만 코드를 연다. 구현 Agent는 이 문서의 단계 순서를 건너뛰지 않는다.

## 1. 전제

- Node.js 20+
- 기존 Supabase [tcmtqfpkyojqypbfnpgb](https://supabase.com/dashboard/project/tcmtqfpkyojqypbfnpgb). 스키마 `devdeck`만 추가
- Auth: 기존 프로젝트의 Google. Redirect URL만 DevDeck 콜백을 **추가**
- Steam Web API Key, SteamID64
- 로컬 `.env.local`은 `.env.example`을 복사
- `git init` 후 `bash scripts/setup-git-hooks.sh` (커밋 전 `._*` 삭제)

### AppleDouble (`._*`)

T7 등 외장 볼륨에서 macOS가 `._파일명`을 만든다. 생성을 OS 차원에서 완전히 막을 수는 없다.

- `.gitignore` / `.vercelignore`로 원격에 올리지 않는다
- `scripts/clean-appledouble.sh`로 작업 트리에서 지운다
- pre-commit / pre-push와 GitHub Action이 남은 파일을 제거한다
- Vercel `installCommand`가 빌드 전에 한 번 더 지운다

## 2. 단계

### Phase 0 — 문서 고정

- [x] PRD / Architecture / DB / API / UI 작성
- [x] 미결 Q1·Q3·Q5 확정 (공개 상세 링크 유지, 목록만 6개, 라이트 기본, 카테고리 자유 텍스트)
- [x] CareerLog(세 번째 모듈) 문서 반영
- [x] 기존 Supabase 프로젝트 + `devdeck` 스키마 격리 확정

### Phase 1 — 앱 스캐폴드

1. Next.js App Router + TypeScript + Tailwind + ESLint
2. shadcn/ui (New York + Neutral) + Tailwind CSS 변수 토큰. Tailwind 4/`base-nova`는 쓰지 않는다.
3. 폴더 트리를 [02-architecture.md](./02-architecture.md) §3 대로 생성
4. `.env.example` 작성
5. 랜딩 정적 카피 + 대시보드 셸(사이드바, 빈 페이지)

완료 조건: `/`, `/p/[id]`, `/work`, `/work/[id]`, `/login`, `/promptkit`, `/career`, `/career/skills`, `/steam`이 라우팅되고 사이드바·테마 토글이 움직인다. 데이터는 목(mock)이어도 된다.

### Phase 2 — Supabase

1. `@supabase/ssr`, `@supabase/supabase-js` — `db: { schema: 'devdeck' }`
2. `lib/supabase/{client,server,middleware}.ts` + `ensureProfile`
3. `app/auth/callback/route.ts`
4. `middleware.ts` 세션 + 대시보드 가드
5. SQL Editor에 `supabase/schema.sql` 적용. **기존 `public` 객체를 지우지 않는다**
6. Dashboard → API → Exposed schemas에 `devdeck` 추가
6b. 이미 스키마를 적용한 DB는 SQL Editor에 `supabase/patch-owner-writes.sql` 실행 (쓰기 = 관리자만)
7. Auth Redirect URL에 DevDeck 콜백 추가
8. 로그인/로그아웃 연결

완료 조건: OAuth 후 `/promptkit` 진입, 새로고침해도 세션 유지, 비로그인 대시보드 접근 시 `/login`.

### Phase 3 — PromptKit

1. `types/prompt.ts`
2. Server Actions CRUD
3. 목록 / 생성 / 상세 / 복사 / 공개 토글
4. 랜딩 최근 6개 + `/p/[id]` 공개 상세 (`is_public`이면 6개 밖도 열림)

완료 조건: PRD §6 항목 2.

### Phase 4 — CareerLog

1. `types/career.ts`
2. `career_posts` / `career_skills` Server Actions
3. 대시보드 게시판·상세·스킬 페이지
4. 공개 `/work`, `/work/[id]`
5. 랜딩 티저 6개 + 공개 스킬 칩

완료 조건: PRD §6 항목 3.

### Phase 5 — Steam

1. `lib/steam/client.ts`, `images.ts`, `types/steam.ts`
2. `GET /api/steam/games` (세션 가드)
3. 목록: 프록시 + `game_reviews` 조인
4. 상세: 리뷰 upsert

완료 조건: PRD §6 항목 4–5.

### Phase 6 — 마무리

1. 빈/에러/스켈레톤 상태
2. Markdown sanitize
3. `/api/ai/run` 501 자리만
4. README (로컬 실행, env, schema 적용 방법)

v2 (명시적으로 나중에): AI Runner, 리뷰 공개, Steam 캐시, 프롬프트 공개 목록 페이지네이션, 커리어 슬러그·댓글·커버 이미지·이력서 PDF.

## 3. 구현 중 금지

- `profiles.steam_api_key` 컬럼 추가
- 클라이언트에서 Steam/OpenAI 키 fetch
- service_role을 브라우저 또는 일반 RSC에 전달
- 문서에 없는 테이블/라우트를 “일단” 추가 (필요하면 문서부터)
- Prompt Runner를 MVP에 몰래 넣기
- Envato Fugu 원본 CSS/HTML을 저장소에 복사
- 기존 Supabase `public` 테이블·트리거·함수 DROP/REPLACE
- DevDeck 클라이언트로 `public` 스키마 조회

## 4. 검증 체크리스트

브라우저 또는 그에 준하는 수단으로 확인한다. 스크린샷 한 장으로 완료하지 않는다.

- [ ] 랜딩이 렌더되고 로그인 CTA가 동작한다
- [ ] Google 로그인: `memoryrl@gmail.com`은 대시보드, 그 외는 `/account` (편집 불가)
- [ ] 프롬프트 생성 → 목록 → 복사 → 수정 → 삭제
- [ ] 공개 토글 후 시크릿 창에서 랜딩에 최근 6개가 보이고 `/p/[id]` 전문이 열린다
- [ ] 공개 글이 7개일 때 랜딩에는 최근 6개만 보이고, 7번째 `/p/[id]` 공유 링크는 열린다
- [ ] 커리어 글·스킬 생성 후 공개하면 `/work`와 `/work/[id]`에 보이고, 비공개면 404
- [ ] 커리어 공개 글이 7개일 때 랜딩에는 6개, `/work`에는 7개 모두 보인다
- [ ] 메뉴 이동 시 헤더는 유지되고 본문에 스켈레톤이 보인다
- [ ] `/steam`에 보유 게임이 뜨고 이미지가 로드된다
- [ ] 목록에서 최근 플레이·2주·Deck 정보가 보인다
- [ ] 게임 상세에 누적 시간과 상점 소개(가능한 경우)가 보인다
- [ ] 리뷰 저장 후 상세를 다시 열어도 값이 남는다
- [ ] DevDeck 쿼리가 `devdeck` 스키마를 쓰고, 기존 `public` 테이블을 건드리지 않는다
- [ ] 비로그인으로 `/steam` 진입 시 `/login`
- [ ] Steam env를 비우면 키가 응답에 없고 에러 메시지만 있다

## 5. Cursor Agent 킥오프 프롬프트

설계 확정 후 Agent에 아래만 붙여 넣는다.

```text
docs/ 설계문서를 단일 소스로 구현해라.

읽는 순서: docs/README.md → 01-prd.md → 02-architecture.md → 03-database.md → 04-api.md → 05-ui.md → 06-implementation.md

Phase 1부터 순서대로 진행하고, 문서에 없는 기능(특히 AI Runner, steam_api_key 컬럼)은 넣지 마라.
UI는 한국어. 완료 전 06절 검증 체크리스트를 수행해라.
```

## 6. 미결 사항 (구현 전 확인)

아래는 코드가 아니라 사람이 고른다. 고르면 해당 문서에 반영한 뒤 Phase 1을 연다.

| ID | 질문 | 상태 |
| --- | --- | --- |
| Q1 | 공개 프롬프트 상세를 비로그인에 열까? | **확정.** `/p/[id]`는 `is_public`이면 링크 유지. **목록만** 최근 6개 |
| Q2 | `game_reviews`를 랜딩에 공개할까? | **확정.** 공개. `/games`는 비로그인 열람, `/steam`은 편집 전용 |
| Q3 | 테마 기본? | **확정.** 라이트 기본, 다크 토글 허용 |
| Q4 | Steam 목록 캐시? | MVP는 매 요청 |
| Q5 | 카테고리 고정 enum? | **확정.** 자유 텍스트 + 기본값 `General` (미리 정한 선택지가 아님) |
| Q6 | 세 번째 모듈? | **확정.** CareerLog. 대시보드 `/career`, 공개 게시판·블로그 `/work` |
| Q7 | Supabase를 새로 만들까? | **확정.** 기존 [tcmtqfpkyojqypbfnpgb](https://supabase.com/dashboard/project/tcmtqfpkyojqypbfnpgb)에 스키마 `devdeck`만 추가 |
| Q8 | UI 키트? | **확정.** shadcn/ui (New York, Neutral, CSS 변수). Tailwind 3 + Radix |

원본 초안 대비 확정 변경:

1. DB에 Steam API 키를 저장하지 않는다.
2. AI Execution은 v2. 라우트만 예약.
3. 게임 목록·리뷰는 공개 포트폴리오. 로그인는 편집만.
4. `@supabase/ssr` + `/auth/callback`을 인증 경로로 명시한다.
5. 공개 프롬프트는 비로그인 상세(`/p/[id]`, 공유 링크 유지). 랜딩 목록만 최근 6개.
6. 테마는 라이트 기본, 다크 토글.
7. CareerLog: 글(`career_posts`) + 스킬 인벤토리(`career_skills`). 랜딩 티저 6개, `/work`는 공개 글 전부.
8. DB는 기존 Supabase 프로젝트. 테이블은 `devdeck` 스키마. 기존 `public`은 읽지 않는다.
9. UI는 shadcn/ui. Envato 원본 파일은 커밋하지 않는다.
