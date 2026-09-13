# DevDeck

**프롬프트 · 커리어 · 게임을 한 덱에 모은 개인 포트폴리오 허브.**

바이브 코딩 템플릿, 회사 참여 이력, Steam 라이브러리를 같은 제품 언어로 공개합니다.  
방문자는 로그인 없이 읽고, 작성자는 Google 로그인 후 대시보드에서만 편집합니다.

[저장소](https://github.com/memoryrl/dev_deck) · Next.js 14 · TypeScript · Supabase · Vercel · Steam Web API

---

## 이 프로젝트가 풀려는 문제

Tech Lead로 일하며 쌓인 자산이 도구마다 흩어져 있었습니다.

- AI 프롬프트는 메모장, 채팅, 로컬 파일에 남는다.
- 프로젝트·역할·스킬은 이력서 한 장과 기억에만 남는다.
- Steam 플레이타임·한줄평·UMPC 프리셋은 스프레드시트에 남는다.
- 세 영역을 한 포트폴리오로 보여 줄 공간이 없다.

DevDeck은 이를 **공개 쇼케이스 + 소유자 전용 CMS**로 묶습니다. 멀티테넌트 SaaS가 아니라, 1인 운영을 전제로 권한·스키마·API 경계를 분명히 둔 제품입니다.

---

## 방문자가 보는 것

랜딩(`/`)은 히어로, 모듈 마퀴, 최신 콘텐츠, Steam 티저를 한 흐름으로 보여 줍니다.

| 영역 | 공개 경로 | 내용 |
| --- | --- | --- |
| AI Prompt | `/#prompts`, `/p/[id]`, `/b/prompts` | 공개 프롬프트 최신 4건. 상세에서 본문 읽기·원클릭 복사 |
| 개발업무 | `/#career`, `/work`, `/work/[id]` | 프로젝트·스킬·노트. 회사·역할·기간·스킬 칩 |
| Steam | `/#games`, `/games`, `/games/[appid]` | 누적 시간 순위(1위 2행 + 4장)와 최신 리뷰 탭 |
| 범용 게시판 | `/b/[slug]` | DB로 추가한 게시판. 읽기 권한은 방문객 / 회원 / 관리자 |

헤더는 `lg+` 메가메뉴, 좁은 화면은 우측 슬라이드 메뉴입니다. 라이트 기본, 다크 토글. 컬러는 Coolors 5색(Ink / Umber / Gold / Stone / Parchment)을 shadcn 토큰에 매핑했습니다.

---

## 세 모듈

### PromptKit — 바이브 코딩 템플릿

프롬프트를 카테고리·태그·공개 여부와 함께 저장합니다. 본문은 **CKEditor 5**로 편집하고, 예전 Markdown 글은 보기 모드에서 그대로 렌더합니다. 공개 글은 비로그인 상세(`/p/[id]`)가 유지되므로 공유 링크가 깨지지 않습니다.

### CareerLog — 참여 이력과 스킬

글 종류는 `project` / `skill` / `note`입니다. 프로젝트에는 회사, 역할, 기간을 붙일 수 있고, 스킬 인벤토리는 숙련도·연차·한 줄 요약으로 따로 관리합니다. 기밀·NDA 내용은 기본 비공개입니다.

### Steam Tracker — 라이브러리와 포트폴리오 리뷰

서버 프록시(`/api/steam/games`)가 Steam Web API `GetOwnedGames`를 호출합니다. API 키는 **브라우저와 DB에 두지 않고** 서버 env만 사용합니다.

리뷰·별점(0.5 단위)·UMPC 프리셋·즐겨찾기는 DevDeck의 `game_reviews`에 저장됩니다. Steam 상점 리뷰를 대신 올리는 기능은 아닙니다. 커버 이미지는 Steam CDN `header.jpg`를 사용합니다.

---

## 권한과 데이터 경계

| 역할 | 할 수 있는 일 |
| --- | --- |
| 방문객 | 랜딩, 공개 글·리뷰 열람 |
| 회원 (그 외 Google 로그인) | `/account`. 게시물 쓰기 UI·Server Action·RLS 쓰기 차단 |
| Owner | `/promptkit`, `/career`, `/steam`, `/site/boards`, `/site/menus` |

핵심 결정:

- 쓰기는 Owner 이메일만. RLS와 Server Action이 같은 규칙을 공유합니다.
- PromptKit / CareerLog / Steam은 **시스템 게시판**으로 `/site/boards`에서 이름·읽기 권한·활성만 제어합니다. 글은 전용 테이블에 남기고 범용 `board_posts`로 이관하지 않습니다.
- 비활성·권한 미달 시스템 게시판은 랜딩 티저와 공개 목록에서 빠집니다.
- 본문 HTML은 저장 후 렌더 시점에 sanitize 합니다.

```text
Visitor ──► 랜딩 / 공개 상세
                │
Owner  ──► Google OAuth ──► 대시보드
                ├── PromptKit     prompts
                ├── CareerLog     career_posts · career_skills
                ├── Steam         game_reviews + Steam API
                └── Site          boards · menus
```

---

## 스택

| 영역 | 선택 |
| --- | --- |
| App | Next.js 14 App Router, React 18, TypeScript |
| UI | Tailwind 3, shadcn/ui (New York), Lucide, CKEditor 5 |
| Auth | Supabase Auth, Google OAuth only |
| Data | Postgres 스키마 `devdeck`, Row Level Security |
| Steam | Web API 서버 프록시, 키는 env |
| Host | Vercel |

기존 Supabase 프로젝트를 재사용하고, 앱 테이블은 `devdeck` 스키마에만 둡니다. `public` 스키마는 건드리지 않습니다.

---

## 로컬 실행

```bash
cp .env.example .env.local
npm install
npm run dev
```

`.env.local`에 Supabase anon 키와 Steam 값을 채웁니다. 시크릿은 커밋하지 않습니다.

1. Supabase SQL Editor에 [`supabase/schema.sql`](./supabase/schema.sql)을 적용합니다. 이미 있는 DB는 [`supabase/patch-boards-menus.sql`](./supabase/patch-boards-menus.sql)을 재실행합니다.
2. API **Exposed schemas**에 `devdeck`을 추가합니다.
3. Auth Redirect URL에 `http://localhost:3000/auth/callback`을 넣습니다.

```bash
npm run lint
npm run build
```

외장 볼륨의 AppleDouble(`._*`)은 `npm run clean:apple` 또는 빌드 훅에서 제거합니다.

---

## 설계문서

구현과 어긋나면 문서를 먼저 고칩니다. 읽는 순서는 [docs/README.md](./docs/README.md)입니다.

| 문서 | 내용 |
| --- | --- |
| [01 PRD](./docs/01-prd.md) | 범위, 페르소나, MVP / 비범위 |
| [02 Architecture](./docs/02-architecture.md) | 런타임, 폴더, 인증·데이터 흐름 |
| [03 Database](./docs/03-database.md) | 테이블, 인덱스, RLS |
| [04 API](./docs/04-api.md) | Steam 프록시, Server Actions |
| [05 UI](./docs/05-ui.md) | 라우트, 화면 상태, 토큰 |
| [06 Implementation](./docs/06-implementation.md) | 구현 단계와 검증 |

---

## 작성자

**김남철 (Namcheol Kim)** · Tech Lead  
[github.com/memoryrl](https://github.com/memoryrl) · memoryrl@gmail.com

Personal Developer Hub. 포트폴리오 공개 저장소이므로 env, API 키, NDA 본문은 올리지 않습니다.
