# DevDeck 설계 노트

GitHub에서 제품을 먼저 보고 싶다면 저장소 루트 [README.md](../README.md)와 [라이브 사이트](https://devdeck-blue.vercel.app)를 보면 됩니다. 이 폴더는 그 사이트가 **왜 이렇게 생겼는지**를 적는 곳입니다.

DevDeck은 프롬프트, 커리어, Steam 라이브러리를 한 허브에 묶는 1인 포트폴리오 제품입니다. 방문자는 읽고, 소유자만 고칩니다. 멀티테넌트 SaaS가 아니라 권한 경계를 짧게 둔 MVP입니다.

---

## 지금 사이트가 하는 일

랜딩은 좌측 카피를 고정한 채, 히어로 전체를 클래식(우측 하단 카드)과 3D 오피스 토폴로지로 오갑니다. 오피스의 책상은 사이트 메뉴이고, 로봇은 그 모듈의 안내자입니다. 그 아래로 PromptKit · CareerLog · Steam Tracker가 공개 쇼케이스로 이어집니다.

UI 크롬은 한국어와 English를 쿠키·쿼리로 유지합니다. 글·댓글·메뉴 본문은 자동 번역하지 않고 작성 언어를 그대로 둡니다. 라이트가 기본이고, 다크는 토글입니다.

소유자는 Google로 들어와 PromptKit, CareerLog, Steam, 게시판, 메뉴, 업로드, 접속 이력을 같은 대시보드에서 다룹니다. 그 외 로그인은 회원(`/account`)이며 글을 쓰지 못합니다.

---

## 문서 지도

관심 있는 층만 읽어도 됩니다. 전체를 따라갈 때는 번호 순서입니다.

| # | 문서 | 이 문서를 읽는 이유 |
| --- | --- | --- |
| 1 | [01-prd.md](./01-prd.md) | 무엇을 만들고, 무엇을 이번에 안 하는지 |
| 2 | [02-architecture.md](./02-architecture.md) | Next.js · Supabase · Vercel이 어떻게 붙는지 |
| 3 | [03-database.md](./03-database.md) | `devdeck` 스키마, RLS, 트리거 |
| 4 | [04-api.md](./04-api.md) | Steam 프록시, Server Actions, 헬스 체크 |
| 5 | [05-ui.md](./05-ui.md) | 라우트, 헤더·푸터, 토큰, 공개/대시보드 화면 |
| 6 | [06-implementation.md](./06-implementation.md) | 단계별 구현과 검증 메모 |
| 7 | [07-uploads.md](./07-uploads.md) | CKEditor 이미지와 Uppy 첨부가 Storage로 가는 길 |
| 8 | [08-landing-topology.md](./08-landing-topology.md) | 아이소메트릭 오피스, 로봇, 카메라·클릭 안내 |
| 9 | [09-i18n.md](./09-i18n.md) | `ko` / `en` 쿠키 SSR. i18next 없이 사전 JSON |
| 10 | [10-login-history.md](./10-login-history.md) | 로그인·접속·페이지뷰 이력, 세션 식별자와 성능 근거 |

---

## 제품 결정, 짧게

- **앱:** Next.js App Router, TypeScript, Tailwind, shadcn/ui (New York)
- **데이터:** 기존 Supabase 프로젝트. 테이블은 스키마 `devdeck`만. `public`은 유지
- **호스트:** Vercel. 공개 주소 [devdeck-blue.vercel.app](https://devdeck-blue.vercel.app)
- **모듈:** PromptKit, CareerLog, Steam Tracker
- **CareerLog:** 쓰기는 `/career`, 읽기는 `/work`. 공유 링크는 공개 글이면 유지
- **Steam 키:** DB에 넣지 않음. 서버 환경 변수만
- **AI Runner:** v2. 이번 사이클은 인터페이스만 예약
- **공개 프롬프트:** 비로그인 상세(`/p/[id]`) 허용. 랜딩 목록은 최근 글만
- **권한:** 소유자만 게시물 편집. 그 외 로그인은 회원
- **언어:** UI만 `ko`/`en`. 본문은 작성 언어
- **업로드:** 에디터 이미지는 압축 후 Route Handler, 범용 첨부는 브라우저가 Storage에 직접 (TUS)
- **토폴로지:** 데스크톱에서만. 모바일은 클래식 히어로
- **원격:** 공개 GitHub [`memoryrl/dev_deck`](https://github.com/memoryrl/dev_deck). env·키·NDA 본문은 올리지 않음

---

## 문서를 고칠 때

스키마, API, 화면이 바뀌면 해당 문서와 [01-prd.md](./01-prd.md)의 범위 표를 같이 고칩니다. 코드와 설명이 어긋나면 설명을 먼저 맞춘 뒤 코드를 따라가게 합니다.
