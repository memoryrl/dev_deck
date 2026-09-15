# DevDeck 설계문서

대외 소개·GitHub 랜딩은 저장소 루트 [README.md](../README.md)를 본다.

DevDeck은 **AI 프롬프트(PromptKit)**, **회사 참여 개발·스킬 정리(CareerLog)**, **Steam 라이브러리/리뷰(Steam Tracker)**를 한 대시보드에 묶는 1인 개발·AX 기반 SaaS MVP다.

이 폴더는 구현 전에 확정하는 설계의 단일 소스다. 코드보다 문서를 먼저 맞추고, 이후 Cursor Agent는 아래 읽는 순서대로 구현한다.

## 읽는 순서

| 순서 | 문서 | 목적 |
| --- | --- | --- |
| 1 | [01-prd.md](./01-prd.md) | 제품 범위, 사용자, 기능, MVP / 비범위 |
| 2 | [02-architecture.md](./02-architecture.md) | 스택, 폴더, 런타임, 인증·데이터 흐름 |
| 3 | [03-database.md](./03-database.md) | 테이블, 인덱스, RLS, 트리거 |
| 4 | [04-api.md](./04-api.md) | Route Handler, Server Actions, 외부 API |
| 5 | [05-ui.md](./05-ui.md) | 라우트, 레이아웃, 화면 상태, 컴포넌트 |
| 6 | [06-implementation.md](./06-implementation.md) | 단계별 구현 순서와 Agent 킥오프 프롬프트 |
| 7 | [07-uploads.md](./07-uploads.md) | Uppy 첨부 컴포넌트, CKEditor 이미지 업로드/압축 설계 |

## 핵심 결정 (요약)

- **프레임워크:** Next.js App Router + TypeScript + Tailwind. UI는 **shadcn/ui** (New York / Neutral)
- **백엔드:** 기존 Supabase [tcmtqfpkyojqypbfnpgb](https://supabase.com/dashboard/project/tcmtqfpkyojqypbfnpgb). 앱 테이블은 스키마 `devdeck`. Auth는 공유. 기존 `public`은 유지
- **호스팅:** Vercel
- **모듈:** PromptKit, CareerLog, Steam Tracker — 사이드바로 전환
- **CareerLog:** 대시보드 `/career` (쓰기), 공개 게시판·블로그 `/work` (읽기). 랜딩 티저는 최근 공개 글 6개. 공유 링크는 `is_public`이면 유지
- **Steam 키:** DB에 저장하지 않는다. 서버 환경변수만 사용 (1인 MVP)
- **AI Runner:** v2. 초기 구현에서 제외하고 인터페이스만 예약
- **공개 프롬프트:** 비로그인 상세(`/p/[id]`) 허용. **목록만** 최근 6개. 공유 링크는 `is_public`이면 유지
- **권한:** 관리자 `memoryrl@gmail.com`만 게시물 편집. 그 외 로그인은 회원(`/account`), 편집 없음
- **테마:** 라이트 기본, 다크 토글 허용
- **카테고리:** 고정 목록이 아니라 문자열 입력 (기본값 `General`)
- **원격:** 공개 GitHub [`memoryrl/dev_deck`](https://github.com/memoryrl/dev_deck). 포트폴리오 용도이므로 env·키·NDA 본문은 올리지 않는다.

## 문서 변경 규칙

- 스키마·API·화면이 바뀌면 해당 문서와 `01-prd.md`의 범위 표를 같이 고친다.
- 구현 중 문서와 코드가 어긋나면 **문서를 먼저 고친 뒤** 코드를 맞춘다.
