# DevDeck

**AI 프롬프트, 업무정보, 게임리뷰를 하나의 덱에서...**

AI로 일하는 방식, 회사 프로젝트에서 쌓인 역할, Steam에서 보낸 시간을 같은 언어로 보여 주는 개인 개발자 허브입니다. 방문자는 로그인 없이 읽고, 작성자만 대시보드에서 고칩니다.

[사이트 열기](https://devdeck-blue.vercel.app) · [저장소](https://github.com/memoryrl/dev_deck)

한국어 / English · Next.js 15 · Supabase · Vercel · three.js · Steam Web API

---

## 한 번에 보이는 포트폴리오

이력서 한 장으로는 안 담기는 것들이 있습니다. 바이브 코딩에 쓰는 프롬프트, 참여한 프로젝트의 맥락, 주말에 붙잡은 게임과 한줄평. DevDeck은 그 세 층을 한 사이트에 올려 두었습니다.

랜딩 히어로는 **클래식 카피**와 **3D 오피스 토폴로지**를 오갑니다. 오른쪽 화살표를 누르면 책상 위의 로봇이 모듈을 안내하고, 책상을 클릭하면 그 영역의 최신 글로 이어집니다. 화면 아래에서는 PromptKit · CareerLog · Steam Tracker가 숫자 줄, 스킬 칩, 라이브러리 커버로 이어지고, 스크롤에 맞춰 구간이 나타납니다.

라이트 기본, 다크 토글. 공개 페이지는 푸터에서 언어를 고를 수 있습니다.

---

## 방문자가 둘러보는 곳

| 모듈 | 경로 | 무엇을 보나요 |
| --- | --- | --- |
| **PromptKit** | `/p/[id]`, `/b/prompts` | 재사용 가능한 바이브 코딩 템플릿. 상세에서 예상 결과물을 보고 본문을 한 번에 복사합니다. |
| **CareerLog** | [`/work`](https://devdeck-blue.vercel.app/work) | 참여 프로젝트, 스킬, 노트. 회사·역할·기간이 붙은 게시판과 블로그 본문입니다. |
| **Steam Tracker** | [`/games`](https://devdeck-blue.vercel.app/games) | 보유 게임, 누적 플레이타임, 별점과 한줄 리뷰, UMPC 프리셋. |
| **게시판** | `/b/[slug]` | 사이트 메뉴로 연 범용 게시판. 댓글과 글 크기 조절 리더가 따라갑니다. |
| **오픈소스** | [`/opensource`](https://devdeck-blue.vercel.app/opensource) | Frontend / Backend에서 쓰는 패키지명, 버전, 라이선스. |

헤더는 넓은 화면에서 메가메뉴, 좁은 화면에서 슬라이드 메뉴입니다. 컬러는 Ink / Umber / Gold / Stone / Parchment 다섯 색을 제품 토큰으로 씁니다.

---

## 세 모듈

### PromptKit — 다시 쓰는 프롬프트

카테고리와 태그를 붙여 저장하고, 본문은 CKEditor 5로 씁니다. 21st.dev 같은 공개 미리보기 링크는 상세와 목록 썸네일에 그대로 붙습니다. 공개 글의 공유 링크(`/p/[id]`)는 목록에서 내려가도 살아 있습니다.

### CareerLog — 일한 기록

글 종류는 프로젝트 / 스킬 / 노트입니다. 프로젝트에는 회사와 역할, 기간을 붙이고, 스킬은 숙련도와 한 줄 요약으로 따로 모아 둡니다. 기밀이나 NDA 내용은 비공개가 기본입니다.

### Steam Tracker — 플레이한 시간의 기록

서버가 Steam Web API로 라이브러리와 플레이타임을 가져오고, 상점 소개·장르·Deck 호환·업적을 상세에 붙입니다. API 키는 브라우저와 DB에 두지 않습니다. 리뷰와 별점, UMPC 프리셋은 DevDeck에만 저장되는 개인 기록입니다.

---

## 지금 들어가 있는 것

최근에 사이트에 붙은 것들입니다.

- **3D 토폴로지 히어로** — 아이소메트릭 오피스, 책상별 로봇, 클릭 시 카메라·말풍선 안내
- **한국어 / English** — UI 크롬만 번역. 글·댓글·메뉴 본문은 작성한 언어 그대로
- **댓글과 게시판** — 트리 댓글, 욕설 필터, 목록 페이저
- **읽기 경험** — 본문 글자 크기 독, 맨 위로, 화면 전환 시 스켈레톤, 모바일 대시보드 서랍
- **접속 이력** — 소유자만. 로그인·방문 세션, 본 화면 경로, Vercel 봇/실제 방문자 구분
- **업로드** — 에디터 이미지 압축 업로드, Uppy 첨부 (Supabase Storage)
- **권한** — 방문객은 읽기, Google 회원은 계정만, 쓰기는 소유자만 (RLS와 서버 액션이 같은 규칙)

```text
Visitor  ──►  랜딩 · 공개 글 · 게임 라이브러리
Owner    ──►  Google ──►  PromptKit · CareerLog · Steam · 게시판 · 메뉴 · 접속 이력
```

---

## 스택

| 영역 | |
| --- | --- |
| App | Next.js 15 App Router, React 19, TypeScript |
| UI | Tailwind, shadcn/ui, Lucide, CKEditor 5, three.js |
| Auth / Data | Supabase Auth (Google), Postgres 스키마 `devdeck`, RLS |
| Steam | Web API 서버 프록시. 키는 환경 변수만 |
| Host | Vercel |

기존 Supabase 프로젝트의 `public` 스키마는 건드리지 않습니다. DevDeck 테이블은 `devdeck`에만 둡니다.

---

## 로컬에서 실행

```bash
cp .env.example .env.local
npm install
npm run dev
```

`.env.local`에 Supabase anon 키와 Steam 값을 넣습니다. 시크릿은 커밋하지 않습니다.

1. Supabase SQL Editor에 [`supabase/schema.sql`](./supabase/schema.sql)을 적용합니다. 이미 있는 DB는 `supabase/patch-*.sql`을 순서대로 재실행합니다.
2. API **Exposed schemas**에 `devdeck`을 추가합니다.
3. Auth Redirect URL에 로컬과 프로덕션을 둘 다 넣습니다. Site URL을 localhost로 두면 배포 로그인이 로컬로 떨어집니다.
4. Vercel에 `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`을 넣습니다.

```bash
npm run lint
npm run build
```

---

## 설계를 더 보고 싶다면

구현과 어긋나면 문서를 먼저 고칩니다. 입구는 [docs/README.md](./docs/README.md)입니다.

| 문서 | 내용 |
| --- | --- |
| [01 PRD](./docs/01-prd.md) | 범위와 페르소나 |
| [02 Architecture](./docs/02-architecture.md) | 런타임과 데이터 흐름 |
| [03 Database](./docs/03-database.md) | 테이블, RLS |
| [04 API](./docs/04-api.md) | Steam 프록시, Server Actions |
| [05 UI](./docs/05-ui.md) | 라우트와 화면 |
| [06 Implementation](./docs/06-implementation.md) | 구현 단계 |
| [07 Uploads](./docs/07-uploads.md) | 에디터 이미지 · Uppy |
| [08 Topology](./docs/08-landing-topology.md) | 랜딩 3D 오피스 |
| [09 i18n](./docs/09-i18n.md) | 한국어 / English |
| [10 Login history](./docs/10-login-history.md) | 로그인·접속·페이지뷰 |
| [11 Notifications](./docs/11-notifications.md) | 알림 종·토스트·패널 |
| [12 Share](./docs/12-share.md) | 공유 링크 |
| [13 Security](./docs/13-security.md) | 보안 점검 반영 |
| [14 Open source list](./docs/14-opensource-list.md) | `/opensource` 자동 목록 |
| [15 LLM](./docs/15-llm.md) | 로컬 Ollama: 안내원 · AI 템플릿 |

---

## 작성자

**김남철 (Namcheol Kim)** · Tech Lead  
[github.com/memoryrl](https://github.com/memoryrl) · memoryrl@gmail.com

포트폴리오 공개 저장소입니다. env, API 키, NDA 본문은 올리지 않습니다.
