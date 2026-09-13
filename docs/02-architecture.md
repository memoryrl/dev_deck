# 02. System Architecture

## 1. 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| Framework | Next.js 14+ App Router | Server Components, Server Actions, Route Handler |
| Language | TypeScript | 스키마·API 타입을 문서와 맞추기 쉽음 |
| UI | Tailwind CSS, shadcn/ui, Lucide | 빠른 대시보드 UI, 일관된 토큰 |
| Backend | Supabase Auth + Postgres + RLS | 별도 API 서버 없이 권한 경계 |
| Hosting | Vercel | App Router / Serverless와 맞음 |
| Steam | Web API `IPlayerService/GetOwnedGames` | 보유 게임·플레이타임 |
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
│   ├── ui/                       # shadcn
│   ├── layout/                   # Sidebar, TopNav
│   ├── promptkit/
│   ├── career/
│   └── steam/
├── lib/
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

1. 사용자가 `/login`에서 GitHub 또는 Google을 고른다.
2. Supabase OAuth → 제공자 동의 → `/auth/callback?code=...`
3. Route Handler가 `exchangeCodeForSession` 후 `/promptkit`으로 리다이렉트.
4. `middleware.ts`가 쿠키 세션을 갱신한다.
5. `(dashboard)/*` 는 세션 없으면 `/login`으로 보낸다. `/`, `/p/[id]`, `/work`, `/work/[id]` 는 가드하지 않는다.
6. `auth.users` INSERT 시 트리거가 `public.profiles` 행을 만든다.

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
Owner ── GET /api/steam/games  (세션 필수)
         └── lib/steam/client.ts
             └── STEAM_API_KEY, STEAM_ID (process.env)
                 └── GetOwnedGames/v1

Owner ── Server Action upsert game_reviews
         └── user_id + app_id UNIQUE
```

게임 마스터 데이터는 DB에 미러하지 않는다. Steam 응답 + 로컬 리뷰를 `app_id`로 조인한다.

실패 시:

| 상황 | 동작 |
| --- | --- |
| env 누락 | 500, 키 값은 로그/응답에 넣지 않음 |
| Steam 4xx/5xx | 502 + 짧은 메시지 |
| 세션 없음 | 401 |

### 5.4 AI Runner (v2, 예약)

`POST /api/ai/run` — 로그인 필수, 프롬프트 id 또는 raw content, provider 선택. MVP는 구현하지 않고 파일만 두거나 `501 Not Implemented`를 반환한다.

## 6. 환경변수

`.env.example`에 이름만 두고 값은 커밋하지 않는다.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # 마이그레이션/어드민 스크립트 전용. 클라이언트·일반 RSC 금지

STEAM_API_KEY=
STEAM_ID=                           # SteamID64, 17자리

# v2
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

- `NEXT_PUBLIC_*` 만 브라우저에 노출된다.
- Steam / AI 키는 서버 전용.
- `profiles.steam_id`는 UI에 “연결된 ID”를 보여 줄 때 쓰는 **공개 가능한 ID**다. API 키가 아니다.

## 7. 보안 경계

| 경계 | 규칙 |
| --- | --- |
| 브라우저 | anon key + 사용자 JWT만. Steam/AI 시크릿 없음 |
| RSC / Server Action | 사용자 세션 클라이언트. RLS가 최종 권한 |
| Route Handler `/api/steam/*` | 세션 확인 후 env 키로 서버 fetch |
| service_role | `schema.sql` 적용 등 로컬/CI만. 앱 런타임 경로에 넣지 않음 |

원본 초안의 `profiles.steam_api_key`는 제거한다. 키가 Postgres와 클라이언트 번들에 남을 위험이 크기 때문이다.

## 8. 배포

- Preview / Production 모두 Vercel
- Supabase 프로젝트는 환경(dev/prod)을 나누는 것을 권장
- OAuth redirect URL: `https://<domain>/auth/callback` 및 로컬 `http://localhost:3000/auth/callback`
