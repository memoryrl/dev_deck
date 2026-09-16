# 03. Database Design

Supabase PostgreSQL. 소스 오브 트루스는 구현 시 `supabase/schema.sql` 한 파일이다. 이 문서와 SQL이 어긋나면 문서를 먼저 고친다.

## 0. 기존 프로젝트 + 전용 스키마

새 프로젝트를 만들지 않는다. 이미 쓰는 프로젝트에 **Postgres 스키마 `devdeck`** 만 추가한다.

| 항목 | 값 |
| --- | --- |
| Project | [tcmtqfpkyojqypbfnpgb](https://supabase.com/dashboard/project/tcmtqfpkyojqypbfnpgb) |
| API URL | `https://tcmtqfpkyojqypbfnpgb.supabase.co` |
| App tables | `devdeck.*` |
| Auth / 기존 앱 | `auth.*`, 기존 `public.*` — **읽거나 수정하지 않는다** |

이유: `profiles`, `prompts` 같은 이름이 기존 `public`과 겹칠 수 있다. 스키마로 격리하면 테이블을 건드리지 않고 DevDeck만 올린다.

Auth는 프로젝트당 하나다. DevDeck 로그인은 **같은 `auth.users` 풀**을 쓴다. 기존 앱 가입자가 DevDeck에도 같은 uid로 들어온다.

가드:

1. 기존 `public` 트리거·함수·테이블을 DROP / REPLACE 하지 않는다.
2. 신규 트리거는 `devdeck.handle_new_user`처럼 **스키마·이름 접두**를 쓴다. `on_auth_user_created` 같은 기존 이름을 덮지 않는다.
3. 이미 있는 유저는 INSERT 트리거가 안 돈다. 첫 DevDeck 세션에서 `devdeck.profiles`를 upsert 한다.
4. Dashboard → Settings → API → **Exposed schemas**에 `devdeck`을 추가한다. (`public`, `storage`는 그대로)
5. `anon` / `authenticated`에 `USAGE` + 테이블 권한을 준다. RLS가 최종 권한이다.
6. SQL Editor에서 `schema.sql`을 적용하기 전에 기존 객체 목록을 확인한다.

## 1. ERD

```text
auth.users                         -- 기존. 공유
    │ 1:1
    ▼
devdeck.profiles
    │
    ├── 1:N  devdeck.prompts
    ├── 1:N  devdeck.career_posts
    ├── 1:N  devdeck.career_skills
    ├── 1:N  devdeck.game_reviews   UNIQUE (user_id, app_id)
    └── 1:N  devdeck.board_posts

devdeck.boards 1:N board_posts
devdeck.boards 1:N menus (optional board_id)
devdeck.menus parent_id → menus (트리)
devdeck.comments parent_id → comments (무한 트리)
devdeck.profanity_words
```

Steam 게임 마스터 테이블은 없다. `app_id`는 Steam AppID를 그대로 저장한다. `career_posts.skills`와 `career_skills.name`은 MVP에서 FK로 묶지 않는다.

## 2. 테이블

### 2.1 `profiles`

로그인 사용자 프로필. Auth 유저와 1:1.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK, `REFERENCES auth.users ON DELETE CASCADE` | Auth uid |
| updated_at | timestamptz | DEFAULT now() | |
| username | TEXT | UNIQUE, nullable | 표시용 핸들 |
| full_name | TEXT | | OAuth에서 복사 가능 |
| avatar_url | TEXT | | |
| steam_id | TEXT | | SteamID64. API 키 아님 |

**의도적 삭제:** `steam_api_key` 컬럼을 만들지 않는다. 키는 `STEAM_API_KEY` env만 사용한다.

### 2.2 `prompts`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK, `gen_random_uuid()` | |
| user_id | UUID | NOT NULL, FK → profiles(id) CASCADE | |
| title | TEXT | NOT NULL | |
| content | TEXT | NOT NULL | 프롬프트 본문. CKEditor HTML |
| result_html | TEXT | NOT NULL, DEFAULT `''` | 예상 결과물. 공개 상세 상단에 표시 |
| category | TEXT | DEFAULT `'General'` | 자유 문자열. enum 아님. 예: `React`, `바이브코딩` |
| tags | TEXT[] | | 예: `{AX,Claude,Refactoring}` |
| is_public | BOOLEAN | DEFAULT false | 공개 읽기 |
| created_at | timestamptz | DEFAULT now() | 공개 “최근 6개” 정렬 기준 |
| updated_at | timestamptz | DEFAULT now() | 트리거로 갱신 |

**카테고리 = 자유 텍스트:** Postgres `ENUM`이나 허용 값 CHECK를 두지 않는다. UI는 텍스트 입력이고, 나중에 자주 쓰는 값을 datalist로 제안하는 것은 선택이다.

공개 목록 6개 한도는 컬럼이 아니다. 랜딩 조회만 `WHERE is_public ORDER BY created_at DESC LIMIT 6`. 공개 상세는 `id` + `is_public`이면 한도와 무관하게 읽는다.

기존 DB는 `supabase/patch-prompts-result.sql`을 실행한다.

### 2.3 `career_posts`

회사 참여 개발을 게시판·블로그로 남기는 글.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK, `gen_random_uuid()` | |
| user_id | UUID | NOT NULL, FK → profiles(id) CASCADE | |
| title | TEXT | NOT NULL | |
| excerpt | TEXT | | 목록·랜딩 요약. 비면 본문 앞부분으로 대체 가능 |
| content | TEXT | NOT NULL | CKEditor HTML. 예전 Markdown 호환 |
| post_type | TEXT | NOT NULL, DEFAULT `'project'` | `project` / `skill` / `note` |
| company | TEXT | | 프로젝트 글용. 예: `삼성SDS` |
| role | TEXT | | 예: `Tech Lead`, `백엔드` |
| period_start | DATE | | |
| period_end | DATE | | NULL = 진행 중 |
| skills | TEXT[] | | 관련 스킬 이름. FK 아님 |
| tags | TEXT[] | | |
| is_public | BOOLEAN | DEFAULT false | |
| created_at | timestamptz | DEFAULT now() | 목록·랜딩 정렬 |
| updated_at | timestamptz | DEFAULT now() | |

제약:

- `CHECK (post_type IN ('project', 'skill', 'note'))`
- `CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)`

### 2.4 `career_skills`

스킬 인벤토리. 긴 글이 아니라 카드·칩용 정리.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK, `gen_random_uuid()` | |
| user_id | UUID | NOT NULL, FK → profiles(id) CASCADE | |
| name | TEXT | NOT NULL | 예: `PostgreSQL`, `Next.js` |
| category | TEXT | DEFAULT `'General'` | 자유 텍스트. 예: `Language`, `Infra` |
| proficiency | TEXT | | 자유 텍스트. 예: `실무`, `리드`, `학습중` |
| years | NUMERIC(3,1) | | 사용 연차. 예: `4.5` |
| summary | TEXT | | 한 줄~짧은 설명 |
| is_public | BOOLEAN | DEFAULT false | |
| sort_order | INT | DEFAULT 0 | 낮을수록 앞 |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

제약: `UNIQUE (user_id, name)`

### 2.5 `game_reviews`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK, `gen_random_uuid()` | |
| user_id | UUID | NOT NULL, FK → profiles(id) CASCADE | |
| app_id | INT | NOT NULL | Steam AppID |
| game_title | TEXT | NOT NULL | 목록 표시용 스냅샷 |
| review_text | TEXT | | |
| rating | NUMERIC(2,1) | DEFAULT 5.0 | 0.0–5.0, 0.5 단위 권장 |
| umpc_preset | TEXT | | 예: `ROG Ally / LS ON / 15W / 1080p60` |
| is_favorite | BOOLEAN | DEFAULT false | |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

제약:

- `UNIQUE (user_id, app_id)`
- `CHECK (rating >= 0 AND rating <= 5)`

### 2.6 `boards`

범용 게시판 마스터. 관리자가 추가한다. PromptKit·CareerLog·Steam은 `kind` 시스템 게시판으로 시드되며 삭제·슬러그 변경이 불가하다. 글은 전용 테이블에 남는다.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK | |
| slug | TEXT | UNIQUE, `^[a-z0-9]+(?:-[a-z0-9]+)*$` | 공개 URL `/b/{slug}` |
| name | TEXT | NOT NULL | |
| description | TEXT | | |
| kind | TEXT | `generic` / `prompts` / `career` / `steam` | 시스템 kind는 행 1개 |
| view_role | TEXT | `visitor` / `member` / `owner` | 읽기 최소 권한 |
| write_role | TEXT | `member` / `owner` | 글쓰기 최소 권한. 시스템은 owner 고정. 공지 `owner`, 자유게시판 `member` |
| comment_role | TEXT | `visitor` / `member` / `owner` | 댓글 최소 권한. 기본 `visitor`. 공지·자유게시판은 `member` |
| is_active | BOOLEAN | DEFAULT true | |
| sort_order | INT | DEFAULT 0 | |
| created_at / updated_at | timestamptz | | |

### 2.7 `board_posts`

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK | |
| board_id | UUID | FK → boards CASCADE | |
| user_id | UUID | FK → profiles CASCADE | 작성자 |
| title / excerpt / content | TEXT | title·content NOT NULL | CKEditor HTML |
| is_published | BOOLEAN | DEFAULT false | 공개 글 |

### 2.8 `menus`

헤더·푸터 메뉴. `board_id`가 있으면 href 대신 `/b/{slug}`.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK | |
| parent_id | UUID | FK → menus CASCADE, nullable | 하위 메뉴 |
| board_id | UUID | FK → boards SET NULL | 게시판 연결 |
| label | TEXT | NOT NULL | |
| href | TEXT | | 직접 링크. 게시판 연결 시 비움 |
| location | TEXT | `header` / `footer` | |
| view_role | TEXT | `visitor` / `member` / `owner` | 보이는 최소 권한 |
| is_active | BOOLEAN | DEFAULT true | |
| sort_order | INT | DEFAULT 0 | |

기존 DB는 `supabase/patch-boards-menus.sql`을 SQL Editor에서 실행한다. `kind` 컬럼과 시스템 게시판 시드가 포함된다.

### 2.9 `comments`

모든 공개 상세(프롬프트·커리어·범용글·Steam) 댓글. `parent_id`로 무한 트리.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK | |
| target_type | TEXT | prompt/career/board/steam | |
| target_id | TEXT | | 글 UUID 또는 Steam appid |
| parent_id | UUID | FK → comments CASCADE, nullable | 답글 |
| user_id | UUID | FK → profiles SET NULL, nullable | 비회원은 null |
| author_name | TEXT | 1–40자 | |
| body | TEXT | 1–20000자 HTML. 트리거가 욕설 치환. 앱은 본문 텍스트 2000자 | |
| ip_address | TEXT | | 서버가 기록 |
| ip_region | TEXT | | 도시·국가 |
| is_hidden | BOOLEAN | DEFAULT false | 관리자 숨김 |

### 2.10 `profanity_words`

저장 시 `mask_profanity()`가 단어 단위로 치환. 관리자만 CRUD.

기존 DB는 `supabase/patch-comments.sql`을 실행한다. 댓글 본문을 CKEditor HTML로 쓰려면 `supabase/patch-comments-html.sql`도 실행한다. 커뮤니티 게시판 권한(공지 관리자 글쓰기, 댓글 회원 이상, 자유게시판 회원 글쓰기)은 `supabase/patch-community-roles.sql`이다.

### 2.11 `supabase_health_checks`

Vercel Cron keep-alive 결과. INSERT는 `service_role`만.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK | |
| checked_at | timestamptz | NOT NULL | ping 시각 |
| ok | BOOLEAN | NOT NULL | Auth+DB 모두 도달 |
| duration_ms | INTEGER | | |
| auth_ok / auth_status | BOOLEAN / INT | | `/auth/v1/health` |
| db_ok | BOOLEAN | | `devdeck.profiles` limit 1 (RLS 거절도 도달로 봄) |
| error_message | TEXT | | |
| details | JSONB | DEFAULT `{}` | |

기존 DB는 `supabase/patch-health-checks.sql`을 SQL Editor에서 실행한다.

## 3. 인덱스

```sql
CREATE INDEX prompts_user_id_idx ON devdeck.prompts (user_id);
CREATE INDEX prompts_is_public_idx ON devdeck.prompts (is_public) WHERE is_public = true;
CREATE INDEX prompts_category_idx ON devdeck.prompts (category);
CREATE INDEX prompts_tags_idx ON devdeck.prompts USING GIN (tags);

CREATE INDEX career_posts_user_id_idx ON devdeck.career_posts (user_id);
CREATE INDEX career_posts_is_public_idx ON devdeck.career_posts (is_public) WHERE is_public = true;
CREATE INDEX career_posts_type_idx ON devdeck.career_posts (post_type);
CREATE INDEX career_posts_company_idx ON devdeck.career_posts (company);
CREATE INDEX career_posts_tags_idx ON devdeck.career_posts USING GIN (tags);
CREATE INDEX career_posts_skills_idx ON devdeck.career_posts USING GIN (skills);

CREATE INDEX career_skills_user_id_idx ON devdeck.career_skills (user_id);
CREATE INDEX career_skills_is_public_idx ON devdeck.career_skills (is_public) WHERE is_public = true;
CREATE INDEX career_skills_sort_idx ON devdeck.career_skills (user_id, sort_order);

CREATE INDEX game_reviews_user_id_idx ON devdeck.game_reviews (user_id);
CREATE INDEX game_reviews_app_id_idx ON devdeck.game_reviews (app_id);
CREATE INDEX game_reviews_favorite_idx ON devdeck.game_reviews (user_id) WHERE is_favorite = true;

CREATE UNIQUE INDEX boards_system_kind_uidx ON devdeck.boards (kind) WHERE kind <> 'generic';
```

## 4. 트리거

### 4.1 `updated_at`

`prompts`, `career_posts`, `career_skills`, `game_reviews`, `profiles`, `boards`, `board_posts`, `menus` 모두 `BEFORE UPDATE`에서 `updated_at = now()`.

### 4.2 회원가입 시 프로필

```text
ON auth.users INSERT
  → INSERT devdeck.profiles (id, full_name, avatar_url, username)
    raw_user_meta_data에서 가능한 필드만
```

함수 이름: `devdeck.handle_new_user`. 트리거 이름: `devdeck_on_auth_user_created`.
기존 `public.handle_new_user` / `on_auth_user_created`를 덮거나 삭제하지 않는다.
`SECURITY DEFINER`, `search_path = devdeck, public`.
이미 있는 유저는 앱의 `ensureProfile` upsert가 `devdeck.profiles`를 만든다.

## 5. RLS

모든 테이블 RLS ENABLE. 앱은 anon/authenticated 키만 쓴다.

`devdeck.is_owner()` 는 JWT 이메일이 `memoryrl@gmail.com` 인지 본다. 콘텐츠 쓰기는 이 함수가 true일 때만 허용한다. 이미 적용한 DB는 `supabase/patch-owner-writes.sql`을 SQL Editor에서 실행한다.

### 5.1 `profiles`

| Policy | 역할 | 명령 | 조건 |
| --- | --- | --- | --- |
| profiles_select_own | authenticated | SELECT | `id = auth.uid()` |
| profiles_update_own | authenticated | UPDATE | `id = auth.uid()` |
| profiles_insert_own | authenticated | INSERT | `id = auth.uid()` (기존 유저 첫 로그인 upsert) |

방문자에게 프로필을 공개할 필요는 MVP에 없다.

### 5.2 `prompts`

| Policy | 역할 | 명령 | 조건 |
| --- | --- | --- | --- |
| prompts_select_own | authenticated | SELECT | `user_id = auth.uid()` |
| prompts_select_public | anon, authenticated | SELECT | `is_public = true` |
| prompts_insert_own | authenticated | INSERT | `user_id = auth.uid() AND devdeck.is_owner()` |
| prompts_update_own | authenticated | UPDATE | `user_id = auth.uid() AND devdeck.is_owner()` |
| prompts_delete_own | authenticated | DELETE | `user_id = auth.uid() AND devdeck.is_owner()` |

공개 행은 로그인 없이 읽힌다. 쓰기는 관리자(`memoryrl@gmail.com`, `devdeck.is_owner()`)만.

### 5.3 `career_posts` / `career_skills`

`prompts`와 동일 패턴. 공개 SELECT + 관리자만 INSERT/UPDATE/DELETE.

### 5.4 `game_reviews`

| Policy | 역할 | 명령 | 조건 |
| --- | --- | --- | --- |
| reviews_select_own | authenticated | SELECT | `user_id = auth.uid()` |
| reviews_select_public | anon, authenticated | SELECT | `true` (포트폴리오 공개) |
| reviews_insert_own | authenticated | INSERT | `user_id = auth.uid() AND devdeck.is_owner()` |
| reviews_update_own | authenticated | UPDATE | `user_id = auth.uid() AND devdeck.is_owner()` |
| reviews_delete_own | authenticated | DELETE | `user_id = auth.uid() AND devdeck.is_owner()` |

리뷰는 포트폴리오용으로 공개 SELECT. INSERT/UPDATE/DELETE는 본인만.

### 5.5 `boards` / `board_posts` / `menus`

권한 함수: `devdeck.current_access_role()`, `devdeck.role_at_least(required)`.

| 대상 | SELECT | 쓰기 |
| --- | --- | --- |
| boards | owner 또는 (활성 + view_role 충족) | owner |
| board_posts | owner / 작성자 / (공개 + 게시판 읽기 권한) | owner는 모든 글. 그 외는 작성자 + write_role 충족 |
| menus | owner 또는 (활성 + view_role 충족) | owner |

### 5.6 `supabase_health_checks`

| Policy | 역할 | 명령 | 조건 |
| --- | --- | --- | --- |
| owner_read | authenticated | SELECT | `devdeck.is_owner()` |
| service_role_manage | service_role | ALL | true |

anon INSERT 없음. Cron이 service_role 키로만 쓴다.

## 6. 목표 SQL 스케치

구현 단계의 `schema.sql`은 아래를 빠짐없이 포함한다. 아래는 설계 스케치이며, 적용 전 Supabase SQL Editor에서 한 번 더 검증한다.

```sql
CREATE SCHEMA IF NOT EXISTS devdeck;

GRANT USAGE ON SCHEMA devdeck TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA devdeck TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA devdeck TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA devdeck
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA devdeck
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- profiles
CREATE TABLE devdeck.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT now(),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  steam_id TEXT
);

-- prompts
CREATE TABLE devdeck.prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES devdeck.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  result_html TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'General',
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- career_posts
CREATE TABLE devdeck.career_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES devdeck.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'project',
  company TEXT,
  role TEXT,
  period_start DATE,
  period_end DATE,
  skills TEXT[],
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT career_posts_type_check CHECK (post_type IN ('project', 'skill', 'note')),
  CONSTRAINT career_posts_period_check CHECK (
    period_end IS NULL OR period_start IS NULL OR period_end >= period_start
  )
);

-- career_skills
CREATE TABLE devdeck.career_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES devdeck.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  proficiency TEXT,
  years NUMERIC(3, 1),
  summary TEXT,
  is_public BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, name)
);

-- game_reviews
CREATE TABLE devdeck.game_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES devdeck.profiles(id) ON DELETE CASCADE NOT NULL,
  app_id INT NOT NULL,
  game_title TEXT NOT NULL,
  review_text TEXT,
  rating NUMERIC(2, 1) DEFAULT 5.0,
  umpc_preset TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, app_id),
  CONSTRAINT game_reviews_rating_range CHECK (rating >= 0 AND rating <= 5)
);
```

RLS·트리거·인덱스 SQL은 구현 시 이 문서 3–5절을 그대로 옮긴다.

## 7. 타입 매핑

`types/`는 테이블과 1:1로 맞춘다.

```ts
// types/profile.ts
type Profile = {
  id: string
  updated_at: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  steam_id: string | null
}

// types/prompt.ts
type Prompt = {
  id: string
  user_id: string
  title: string
  content: string
  category: string
  tags: string[] | null
  is_public: boolean
  created_at: string
  updated_at: string
}

// types/career.ts
type CareerPostType = "project" | "skill" | "note"

type CareerPost = {
  id: string
  user_id: string
  title: string
  excerpt: string | null
  content: string
  post_type: CareerPostType
  company: string | null
  role: string | null
  period_start: string | null
  period_end: string | null
  skills: string[] | null
  tags: string[] | null
  is_public: boolean
  created_at: string
  updated_at: string
}

type CareerSkill = {
  id: string
  user_id: string
  name: string
  category: string
  proficiency: string | null
  years: number | null
  summary: string | null
  is_public: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// types/steam.ts — DB 리뷰
type GameReview = {
  id: string
  user_id: string
  app_id: number
  game_title: string
  review_text: string | null
  rating: number
  umpc_preset: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}
```

Steam API 응답 타입은 테이블이 아니라 [04-api.md](./04-api.md)에 둔다.
