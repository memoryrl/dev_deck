# 02. System Architecture

## 1. 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| Framework | Next.js 14+ App Router | Server Components, Server Actions, Route Handler |
| Language | TypeScript | 스키마·API 타입을 문서와 맞추기 쉽음 |
| UI | Tailwind CSS, Lucide, shadcn/ui | New York + Neutral. Tailwind 3 + Radix |
| Backend | Supabase Auth + Postgres + RLS | 별도 API 서버 없이 권한 경계 |
| Hosting | Vercel | App Router / Serverless와 맞음 |
| Steam | Web API `GetOwnedGames` + `GetPlayerSummaries` + `GetPlayerAchievements`, Store `appdetails` | 라이브러리·프로필·업적·상점 메타 |
| AI (v2) | OpenAI / Claude | Prompt Runner 예약 |

런타임: Node.js 서버 함수. Steam/AI 프록시는 Edge보다 Node를 기본으로 한다 (외부 fetch + 시크릿).

## 2. 논리 구조

```text
Visitor ──► app/page.tsx (Landing: 프롬프트 6 · 커리어 글 6 · 스킬 칩)
                ├── /p/[id]         공개 프롬프트
                ├── /work           공개 커리어 게시판 (공개 글 전부)
                └── /work/[id]      공개 커리어 블로그 상세
                
Owner ──► (auth)/login ──OAuth──► Supabase Auth
                │
                ▼
         (dashboard)/layout.tsx  Sidebar
                ├── /promptkit      prompts
                ├── /promptkit/[id]
                ├── /career         career_posts
                ├── /career/[id]
                ├── /career/skills  career_skills
                ├── /steam          Steam API + game_reviews
                └── /steam/[appid]
```

외부 시스템:

```text
Browser
  │  RSC / Server Actions
  ▼
Next.js (Vercel)
  ├── Supabase JS (쿠키 세션, RLS 적용)
  ├── /api/steam/games  ──► api.steampowered.com
  └── /api/ai/run (v2)  ──► OpenAI / Anthropic
```

## 3. 폴더 구조 (목표)

구현 시 이 트리를 그대로 만든다. 문서에 없는 폴더를 추가하면 이 절을 먼저 고친다.

```text
devdeck/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── promptkit/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── career/
│   │   │   ├── page.tsx
│   │   │   ├── skills/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── steam/
│   │       ├── page.tsx
│   │       └── [appid]/page.tsx
│   ├── api/
│   │   ├── ai/
│   │   │   └── run/route.ts      # v2. MVP는 501 또는 미구현 가드
│   │   └── steam/
│   │       └── games/route.ts
│   ├── auth/
│   │   └── callback/route.ts     # Supabase OAuth code exchange
│   ├── p/
│   │   └── [id]/page.tsx         # 공개 프롬프트 상세
│   ├── work/
│   │   ├── page.tsx              # 공개 커리어 게시판
│   │   └── [id]/page.tsx         # 공개 커리어 블로그
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                       # shadcn/ui 프리미티브
│   ├── layout/                   # Sidebar, TopNav
│   ├── promptkit/
│   ├── career/
│   └── steam/
├── lib/
│   ├── auth/                     # Owner 이메일, 회원 리다이렉트
│   ├── supabase/
│   │   ├── client.ts             # 브라우저
│   │   ├── server.ts             # 서버 컴포넌트 / actions
│   │   └── middleware.ts
│   ├── steam/
│   │   ├── client.ts             # GetOwnedGames fetch
│   │   └── images.ts             # CDN URL 헬퍼
│   ├── ai/                       # v2
│   └── utils.ts
├── types/
│   ├── prompt.ts
│   ├── career.ts
│   ├── steam.ts
│   └── profile.ts
├── supabase/
│   └── schema.sql
├── middleware.ts                 # 세션 갱신 + 대시보드 가드
├── docs/                         # 이 설계문서
└── .env.example
```

## 4. 인증 흐름

1. 사용자가 `/login`에서 Google로 로그인한다.
2. Supabase OAuth → 제공자 동의 → `/auth/callback?code=...`
3. Route Handler가 `exchangeCodeForSession` 후 Owner는 `/promptkit`, 회원은 `/account`로 보낸다.
4. `middleware.ts`가 쿠키 세션을 갱신한다.
5. `(dashboard)/*` 는 세션 없으면 `/login`으로 보낸다. `/`, `/p/[id]`, `/work`, `/work/[id]` 는 가드하지 않는다.
6. `auth.users` INSERT 시 **추가** 트리거 `devdeck_on_auth_user_created`가 `devdeck.profiles`를 만든다. 기존 public 트리거는 그대로 둔다. 기존 유저는 첫 세션 `ensureProfile` upsert.

로그아웃은 Server Action 또는 클라이언트 `signOut` 후 `/`로 이동.

## 5. 데이터 흐름

### 5.1 PromptKit

```text
Owner ── Server Action (create/update/delete)
         └── supabase.from('prompts')  (RLS: user_id = auth.uid())

Visitor ── RSC (`/` , `/p/[id]`)
         └── is_public = true
             ├── 목록 `/`: created_at DESC LIMIT 6
             └── 상세 `/p/[id]`: id + is_public. 아니면 notFound()
```

복사(PK-03)는 브라우저 `navigator.clipboard`만 사용. 서버를 거치지 않는다.

### 5.2 CareerLog

```text
Owner ── Server Action (posts / skills CRUD)
         └── career_posts, career_skills  (RLS: user_id = auth.uid())

Visitor ── RSC (`/` , `/work` , `/work/[id]`)
         └── is_public = true
             ├── 랜딩 글: created_at DESC LIMIT 6
             ├── 랜딩 스킬: is_public, sort_order ASC
             ├── 게시판 `/work`: 공개 글 전부, created_at DESC
             └── 상세 `/work/[id]`: id + is_public. 아니면 notFound()
```

글의 `skills` 배열은 이름 문자열이다. `career_skills`와 FK로 묶지 않는다 (MVP).

### 5.3 Steam Tracker

```text
Owner ── GET /api/steam/games
         └── lib/steam/client.ts
             └── STEAM_API_KEY, STEAM_ID (process.env)
                 ├── GetOwnedGames/v1
                 └── GetPlayerSummaries/v2

상세 `/steam/[appid]`, `/games/[appid]`
         └── fetchGamePageData
             ├── GetOwnedGames (캐시)
             ├── Store appdetails (하루 캐시, 실패해도 페이지는 유지)
             └── GetPlayerAchievements (스탯 공개 게임만)

Owner ── Server Action upsert game_reviews
         └── user_id + app_id UNIQUE
```

게임 마스터 데이터는 DB에 미러하지 않는다. Steam 응답 + 로컬 리뷰를 `app_id`로 조인한다.

실패 시:

| 상황 | 동작 |
| --- | --- |
| env 누락 | 500, 키 값은 로그/응답에 넣지 않음 |
| Steam 4xx/5xx | 502 + 짧은 메시지 |
| Store appdetails 실패 | 소개·스크린샷만 생략, 페이지는 유지 |

### 5.4 AI Runner (v2, 예약)

`POST /api/ai/run` — 로그인 필수, 프롬프트 id 또는 raw content, provider 선택. MVP는 구현하지 않고 파일만 두거나 `501 Not Implemented`를 반환한다.

## 6. 환경변수

`.env.example`에 이름만 두고 값은 커밋하지 않는다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tcmtqfpkyojqypbfnpgb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Dashboard에서 복사. 커밋 금지
SUPABASE_SERVICE_ROLE_KEY=          # 마이그레이션 전용. 앱 런타임·커밋 금지

STEAM_API_KEY=
STEAM_ID=                           # SteamID64, 17자리

# v2
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

- 프로젝트: [tcmtqfpkyojqypbfnpgb](https://supabase.com/dashboard/project/tcmtqfpkyojqypbfnpgb). 신규 프로젝트 없음.
- 앱 테이블은 `devdeck` 스키마. 클라이언트는 `db: { schema: 'devdeck' }`.
- `NEXT_PUBLIC_*` 만 브라우저에 노출된다. URL은 공개되어도 되고, anon/service 키는 `.env.local`만.
- Steam / AI 키는 서버 전용.
- `devdeck.profiles.steam_id`는 표시용 ID다. API 키가 아니다.

## 7. 보안 경계

| 경계 | 규칙 |
| --- | --- |
| 브라우저 | anon key + 사용자 JWT만. Steam/AI 시크릿 없음 |
| RSC / Server Action | 사용자 세션 클라이언트. RLS가 최종 권한 |
| Route Handler `/api/steam/*` | 세션 확인 후 env 키로 서버 fetch |
| service_role | `schema.sql` 적용 등 로컬/CI만. 앱 런타임 경로에 넣지 않음 |

원본 초안의 `profiles.steam_api_key`는 제거한다. 키가 Postgres와 클라이언트 번들에 남을 위험이 크기 때문이다.

## 8. 배포

- Preview / Production 모두 Vercel. DB는 기존 프로젝트의 `devdeck` 스키마를 공유한다.
- 기존 앱의 `public` 스키마와 키를 같이 쓰므로, DevDeck RLS가 다른 스키마를 열지 않게 클라이언트를 `devdeck`으로 고정한다.
- OAuth redirect URL을 **기존 목록에 추가**한다: `http://localhost:3000/auth/callback`, `https://<domain>/auth/callback`. 기존 앱 URL은 삭제하지 않는다.
