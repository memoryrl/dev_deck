# DevDeck 설계 노트

GitHub에서 제품을 먼저 보고 싶다면 저장소 루트 [README.md](../README.md)와 [라이브 사이트](https://devdeck-blue.vercel.app)를 보면 됩니다. 이 폴더는 그 사이트가 **왜 이렇게 생겼는지**를 적는 곳입니다.

DevDeck은 프롬프트, 커리어, Steam 라이브러리를 한 허브에 묶는 1인 포트폴리오 제품입니다. 방문자는 읽고, 소유자만 고칩니다. 멀티테넌트 SaaS가 아니라 권한 경계를 짧게 둔 MVP입니다.

---

## 지금 사이트가 하는 일

랜딩은 좌측 카피를 고정한 채, 히어로 전체를 클래식(우측 하단 카드)과 3D 오피스 토폴로지로 오갑니다. 오피스의 책상은 사이트 메뉴이고, 로봇은 그 모듈의 안내자입니다. 메뉴나 링크를 눌러 화면을 옮길 때도 로봇이 문까지 안내한 뒤 이동합니다. 그 아래로 PromptKit · CareerLog · Steam Tracker가 공개 쇼케이스로 이어집니다.

UI 크롬은 한국어와 English를 쿠키·쿼리로 유지합니다. 글·댓글·메뉴 본문은 자동 번역하지 않고 작성 언어를 그대로 둡니다. 라이트가 기본이고, 다크는 토글입니다.

소유자는 Google로 들어와 PromptKit, CareerLog, Steam, 게시판, 메뉴, 업로드, 접속 이력, 공유 링크, 약관, 사이트 설정을 같은 대시보드에서 다룹니다. 그 외 로그인은 회원(`/account`)입니다. 회원은 콘텐츠(프롬프트·커리어·Steam)를 고칠 수 없고, 게시판 중 쓰기 권한이 `member`인 곳(자유게시판)에만 글을 씁니다.

이 맥에 설치한 로컬 LLM(Ollama)도 붙어 있습니다. 로그인한 회원이 공개 커리어·프롬프트를 근거로 답하는 **포트폴리오 안내원**에게 묻고, 게시판 글쓰기에서는 **AI 템플릿**이 양식 초안을 채웁니다. 관리자는 `/site/ollama-chat`에서 모델을 직접 시험하고 `/site/portfolio-asks`에서 방문자 질문을 봅니다. 자세한 건 [15-llm.md](./15-llm.md).

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
| 11 | [11-notifications.md](./11-notifications.md) | 종 배지·토스트·패널, 1분 폴링과 DB 트리거 |
| 12 | [12-share.md](./12-share.md) | 게시물·프롬프트·커리어·리뷰 공유 링크와 접속 기록 |
| 13 | [13-security.md](./13-security.md) | 보안 점검 반영 내역, SQL 적용 순서, 남은 과제 |
| 14 | [14-opensource-list.md](./14-opensource-list.md) | `/opensource` 목록을 `package.json`에서 자동 생성 |
| 15 | [15-llm.md](./15-llm.md) | 로컬 Ollama: 테스트 채팅, 포트폴리오 안내원, 게시판 AI 템플릿 |

---

## 제품 결정, 짧게

- **앱:** Next.js App Router, TypeScript, Tailwind, shadcn/ui (New York)
- **데이터:** 기존 Supabase 프로젝트. 테이블은 스키마 `devdeck`만. `public`은 유지
- **호스트:** Vercel. 공개 주소 [devdeck-blue.vercel.app](https://devdeck-blue.vercel.app)
- **모듈:** PromptKit, CareerLog, Steam Tracker
- **CareerLog:** 쓰기는 `/career`, 읽기는 `/work`. 공유 링크는 공개 글이면 유지
- **Steam 키:** DB에 넣지 않음. 서버 환경 변수만
- **AI Runner:** v2. 이번 사이클은 인터페이스만 예약
- **LLM:** 이 맥의 Ollama(`exaone3.5:2.4b`, `qwen2.5-coder:3b`). 외부 API 키 없음. Vercel에서는 사이트 설정의 터널 주소(`app_env`)로 붙고, 그 주소는 저장소에 올리지 않음
- **공개 프롬프트:** 비로그인 상세(`/p/[id]`) 허용. 랜딩 목록은 최근 글만
- **권한:** 소유자만 콘텐츠·관리 화면. 그 외 로그인은 회원(게시판별 `write_role`이 `member`인 곳에만 쓰기, 안내원 질문 가능)
- **언어:** UI만 `ko`/`en`. 본문은 작성 언어
- **업로드:** 에디터 이미지는 압축 후 Route Handler, 범용 첨부는 브라우저가 Storage에 직접 (TUS)
- **토폴로지:** 데스크톱에서만. 모바일은 클래식 히어로
- **원격:** 공개 GitHub [`memoryrl/dev_deck`](https://github.com/memoryrl/dev_deck). env·키·NDA 본문은 올리지 않음

---

## 문서를 고칠 때

스키마, API, 화면이 바뀌면 해당 문서와 [01-prd.md](./01-prd.md)의 범위 표를 같이 고칩니다. 코드와 설명이 어긋나면 설명을 먼저 맞춘 뒤 코드를 따라가게 합니다.
