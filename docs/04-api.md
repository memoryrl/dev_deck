# 04. API & Integrations

앱 내부 계약은 **Route Handler(외부 프록시)** 와 **Server Actions(CRUD)** 두 종류다. 브라우저가 Supabase REST를 직접 두들기는 것도 RLS상 가능하지만, 쓰기는 Server Action으로 모아 검증을 한곳에 둔다.

## 1. Route Handlers

### 1.1 `GET /api/steam/games`

Steam CORS를 피하고 API 키를 숨긴다.

**인증:** 쿠키 세션 필수. 없으면 `401`.

**쿼리 (optional, MVP는 무시해도 됨):**

| 이름 | 설명 |
| --- | --- |
| include_played_free_games | 기본 `1` |
| include_appinfo | 기본 `1` |

**서버 동작:**

1. `createServerClient`로 세션 확인
2. `STEAM_API_KEY`, `STEAM_ID` 없으면 `500` (`Steam is not configured`)
3. 아래 URL로 fetch

```text
https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/
  ?key={STEAM_API_KEY}
  &steamid={STEAM_ID}
  &include_appinfo=1
  &include_played_free_games=1
```

4. 실패 시 `502`
5. 성공 시 앱이 쓰는 형태로 정규화

**응답 200:**

```ts
type SteamGamesResponse = {
  steam_id: string
  game_count: number
  games: SteamGame[]
}

type SteamGame = {
  app_id: number
  name: string
  playtime_forever_minutes: number
  playtime_2weeks_minutes: number | null
  img_icon_url: string | null
  header_image_url: string
}
```

`header_image_url` 규칙:

```text
https://cdn.akamai.steamstatic.com/steam/apps/{app_id}/header.jpg
```

아이콘 (Steam이 hash를 줄 때):

```text
https://media.steampowered.com/steamcommunity/public/images/apps/{app_id}/{img_icon_url}.jpg
```

**에러 본문:** `{ "error": string }` — 키·스팀 ID 원문 금지.

**캐시:** MVP는 매 요청 fetch. v2에서 `Cache-Control` 또는 Supabase 스냅샷 테이블을 검토.

### 1.2 `POST /api/ai/run` (v2)

MVP: 파일만 생성하고 `501` + `{ "error": "Not implemented" }`.

예약 계약:

```ts
type AiRunRequest = {
  prompt_id?: string
  content?: string
  provider: "openai" | "anthropic"
}

type AiRunResponse = {
  output: string
  provider: string
}
```

세션 필수. `prompt_id`가 있으면 본인 또는 공개 프롬프트만 읽는다.

## 2. Server Actions

위치: `app/(dashboard)/promptkit/actions.ts`, `app/(dashboard)/career/actions.ts`, `app/(dashboard)/steam/actions.ts`, `app/(dashboard)/site/actions.ts`, `app/b/actions.ts`.

공통:

- `"use server"`
- `createServerClient` + `auth.getUser()`
- 실패는 `{ ok: false, error: string }`, 성공은 `{ ok: true, data }`
- 성공 후 `revalidatePath` (`/`, `/promptkit`, `/promptkit/[id]`, `/career`, `/career/[id]`, `/career/skills`, `/work`, `/work/[id]`, `/steam`, `/steam/[appid]`)

### 2.1 PromptKit

| Action | 입력 | 검증 |
| --- | --- | --- |
| `createPrompt` | title, content, category?, tags?, is_public? | title/content 비어 있으면 거부. tags는 string[] |
| `updatePrompt` | id + 부분 필드 | 소유 행만 (RLS) |
| `deletePrompt` | id | 소유 행만 |
| `togglePromptPublic` | id, is_public | boolean |

본문은 CKEditor HTML을 저장한다. 보기 모드 sanitize는 **렌더 시점**(`RichContent`)에서 한다. 태그가 없는 예전 Markdown 글은 Markdown으로 렌더한다.

### 2.2 CareerLog

| Action | 입력 | 검증 |
| --- | --- | --- |
| `createCareerPost` | title, content, post_type, excerpt?, company?, role?, period_start?, period_end?, skills?, tags?, is_public? | title/content 필수. post_type 세 값만. 기간 역전 거부 |
| `updateCareerPost` | id + 부분 필드 | 소유 행만 |
| `deleteCareerPost` | id | 소유 행만 |
| `toggleCareerPostPublic` | id, is_public | boolean |
| `upsertCareerSkill` | name, category?, proficiency?, years?, summary?, is_public?, sort_order? | name 필수. `(user_id, name)` 유니크 |
| `deleteCareerSkill` | id | 소유 행만 |
| `reorderCareerSkills` | `{ id, sort_order }[]` | 본인 스킬만 |

### 2.3 Site boards & menus

| Action | 입력 | 검증 |
| --- | --- | --- |
| `upsertBoard` | name, slug, view_role, write_role, … | owner. slug 형식. 시스템 게시판은 slug/write_role 고정 |
| `deleteBoard` | id | owner. 시스템 kind는 거부. 범용 글 CASCADE |
| `ensureSystemBoards` | — | owner 페이지에서 prompts/career/steam 시드 |
| `upsertMenu` | label, location, parent_id?, board_id?, href?, view_role | owner |
| `deleteMenu` | id | owner. 하위 CASCADE |
| `upsertBoardPost` / `deleteBoardPost` | 대시보드 글 | owner |
| `savePublicPost` / `removePublicPost` | 공개 게시판 글쓰기 | write_role 충족 회원/관리자 |

### 2.4 Steam Reviews

| Action | 입력 | 검증 |
| --- | --- | --- |
| `upsertGameReview` | app_id, game_title, review_text?, rating?, umpc_preset?, is_favorite? | app_id > 0, rating 0–5, title 필수 |
| `deleteGameReview` | app_id 또는 id | 소유 행만 |

`upsert`는 `(user_id, app_id)` 유니크를 이용한다.

### 2.4 Auth

| Action | 동작 |
| --- | --- |
| `signOut` | 세션 종료 후 `/` |

OAuth 시작은 클라이언트 `supabase.auth.signInWithOAuth`. Google은 `prompt=select_account`로 계정 선택 화면을 연다.

## 3. Steam 유틸 (`lib/steam`)

```ts
// images.ts
function steamHeaderUrl(appId: number): string
function steamIconUrl(appId: number, hash: string | null): string | null

// client.ts
function fetchOwnedGames(): Promise<SteamGamesResponse>
```

`fetchOwnedGames`는 Route Handler와 테스트만 호출한다. 클라이언트 컴포넌트에서 import하지 않는다.

## 4. Supabase 클라이언트

| 파일 | 사용처 |
| --- | --- |
| `lib/supabase/client.ts` | Client Components (OAuth 버튼, 드물게 realtime) |
| `lib/supabase/server.ts` | RSC, Server Actions, Route Handler |
| `lib/supabase/middleware.ts` | `middleware.ts` 세션 리프레시 |

`@supabase/ssr` 쿠키 어댑터를 쓴다. 구 `auth-helpers`는 쓰지 않는다.

세 클라이언트 모두 기본 스키마를 `devdeck`으로 둔다. `from('prompts')`가 `public.prompts`가 아니라 `devdeck.prompts`를 보게 한다.

```ts
{
  db: { schema: "devdeck" },
}
```

Auth는 스키마와 무관하다 (`auth.getUser()` 그대로). `public` 테이블은 DevDeck 코드에서 조회하지 않는다.

공개 조회는 **서버 컴포넌트 + anon 세션**으로 `is_public = true`만 읽는다. **랜딩 티저는 각 최대 4개**.

```ts
const PUBLIC_PROMPT_LIMIT = 6

// lib/prompts/public.ts
function listRecentPublicPrompts(limit = 6): Promise<Prompt[]>
  // 랜딩은 limit 4. is_public + 시스템 게시판(prompts) 활성·view_role

function getPublicPromptById(id: string): Promise<Prompt | null>
  // .eq('id', id).eq('is_public', true) — 목록 한도와 무관. 없으면 null → notFound()

const PUBLIC_CAREER_TEASER_LIMIT = 6

// lib/career/public.ts
function listRecentPublicCareerPosts(limit = 6): Promise<CareerPost[]>
  // 랜딩: is_public + 시스템 게시판(career) 활성·view_role, limit 4

function listPublicCareerPosts(): Promise<CareerPost[]>
  // /work: is_public + 시스템 게시판(career) 활성·view_role

function getPublicCareerPostById(id: string): Promise<CareerPost | null>
  // id + is_public + 시스템 게시판 권한. 없으면 null → notFound()

function listPublicCareerSkills(): Promise<CareerSkill[]>
  // is_public + 시스템 게시판(career) 활성·view_role

function listPublicGameReviews(): Promise<GameReview[]>
  // 시스템 게시판(steam) 활성·view_role
```

RLS는 모든 `is_public` SELECT를 허용한다. 프롬프트·커리어 **랜딩** `LIMIT 6`만 쿼리 한도다. `/work`는 공개 글 전부. Owner 대시보드는 limit 없이 본인 행 전부.

## 5. 외부 API 한도 / 실패

| 소스 | 메모 |
| --- | --- |
| Steam | 키당 rate limit 있음. MVP는 Owner 혼자라 목록 페이지 진입 때만 호출 |
| 프로필 비공개 | GetOwnedGames가 빈 목록/실패할 수 있음. UI에 “프로필을 공개로 두세요” 안내 |
| 이미지 404 | header.jpg 없으면 placeholder |

## 6. 공개하지 않는 것

- Steam API Key, SteamID를 JSON 이외의 디버그 필드로 노출
- service_role 키
- 비공개 프롬프트·커리어 content를 비로그인 RSC에서 select
- 비공개 글을 `/p/[id]` 또는 `/work/[id]`로 열어 주기
