# 03. Database Design

Supabase PostgreSQL. 소스 오브 트루스는 구현 시 `supabase/schema.sql` 한 파일이다. 이 문서와 SQL이 어긋나면 문서를 먼저 고친다.

## 1. ERD

```text
auth.users
    │ 1:1
    ▼
public.profiles
    │
    ├── 1:N  public.prompts
    ├── 1:N  public.career_posts
    ├── 1:N  public.career_skills
    └── 1:N  public.game_reviews   UNIQUE (user_id, app_id)
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
| content | TEXT | NOT NULL | Markdown |
| category | TEXT | DEFAULT `'General'` | 자유 문자열. enum 아님. 예: `React`, `바이브코딩` |
| tags | TEXT[] | | 예: `{AX,Claude,Refactoring}` |
| is_public | BOOLEAN | DEFAULT false | 공개 읽기 |
| created_at | timestamptz | DEFAULT now() | 공개 “최근 6개” 정렬 기준 |
| updated_at | timestamptz | DEFAULT now() | 트리거로 갱신 |

**카테고리 = 자유 텍스트:** Postgres `ENUM`이나 허용 값 CHECK를 두지 않는다. UI는 텍스트 입력이고, 나중에 자주 쓰는 값을 datalist로 제안하는 것은 선택이다.

공개 목록 6개 한도는 컬럼이 아니다. 랜딩 조회만 `WHERE is_public ORDER BY created_at DESC LIMIT 6`. 공개 상세는 `id` + `is_public`이면 한도와 무관하게 읽는다.

### 2.3 `career_posts`

회사 참여 개발을 게시판·블로그로 남기는 글.

| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| id | UUID | PK, `gen_random_uuid()` | |
| user_id | UUID | NOT NULL, FK → profiles(id) CASCADE | |
| title | TEXT | NOT NULL | |
| excerpt | TEXT | | 목록·랜딩 요약. 비면 본문 앞부분으로 대체 가능 |
| content | TEXT | NOT NULL | Markdown |
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

## 3. 인덱스

```sql
CREATE INDEX prompts_user_id_idx ON public.prompts (user_id);
CREATE INDEX prompts_is_public_idx ON public.prompts (is_public) WHERE is_public = true;
CREATE INDEX prompts_category_idx ON public.prompts (category);
CREATE INDEX prompts_tags_idx ON public.prompts USING GIN (tags);

CREATE INDEX career_posts_user_id_idx ON public.career_posts (user_id);
CREATE INDEX career_posts_is_public_idx ON public.career_posts (is_public) WHERE is_public = true;
CREATE INDEX career_posts_type_idx ON public.career_posts (post_type);
CREATE INDEX career_posts_company_idx ON public.career_posts (company);
CREATE INDEX career_posts_tags_idx ON public.career_posts USING GIN (tags);
CREATE INDEX career_posts_skills_idx ON public.career_posts USING GIN (skills);

CREATE INDEX career_skills_user_id_idx ON public.career_skills (user_id);
CREATE INDEX career_skills_is_public_idx ON public.career_skills (is_public) WHERE is_public = true;
CREATE INDEX career_skills_sort_idx ON public.career_skills (user_id, sort_order);

CREATE INDEX game_reviews_user_id_idx ON public.game_reviews (user_id);
CREATE INDEX game_reviews_app_id_idx ON public.game_reviews (app_id);
CREATE INDEX game_reviews_favorite_idx ON public.game_reviews (user_id) WHERE is_favorite = true;
```

## 4. 트리거

### 4.1 `updated_at`

`prompts`, `career_posts`, `career_skills`, `game_reviews`, `profiles` 모두 `BEFORE UPDATE`에서 `updated_at = now()`.

### 4.2 회원가입 시 프로필

```text
ON auth.users INSERT
  → INSERT public.profiles (id, full_name, avatar_url, username)
    raw_user_meta_data에서 가능한 필드만
```

함수는 `SECURITY DEFINER`, search_path는 `public`으로 고정한다.

## 5. RLS

모든 테이블 RLS ENABLE. 앱은 anon/authenticated 키만 쓴다.

### 5.1 `profiles`

| Policy | 역할 | 명령 | 조건 |
| --- | --- | --- | --- |
| profiles_select_own | authenticated | SELECT | `id = auth.uid()` |
| profiles_update_own | authenticated | UPDATE | `id = auth.uid()` |
| INSERT | — | — | 트리거만. 클라이언트 INSERT 없음 |

방문자에게 프로필을 공개할 필요는 MVP에 없다.

### 5.2 `prompts`

| Policy | 역할 | 명령 | 조건 |
| --- | --- | --- | --- |
| prompts_select_own | authenticated | SELECT | `user_id = auth.uid()` |
| prompts_select_public | anon, authenticated | SELECT | `is_public = true` |
| prompts_insert_own | authenticated | INSERT | `user_id = auth.uid()` |
| prompts_update_own | authenticated | UPDATE | `user_id = auth.uid()` |
| prompts_delete_own | authenticated | DELETE | `user_id = auth.uid()` |

공개 행은 로그인 없이 읽힌다. 쓰기는 본인만.

### 5.3 `career_posts` / `career_skills`

`prompts`와 동일 패턴. 본인 CRUD + `is_public = true` SELECT (anon, authenticated).

### 5.4 `game_reviews`

| Policy | 역할 | 명령 | 조건 |
| --- | --- | --- | --- |
| reviews_select_own | authenticated | SELECT | `user_id = auth.uid()` |
| reviews_insert_own | authenticated | INSERT | `user_id = auth.uid()` |
| reviews_update_own | authenticated | UPDATE | `user_id = auth.uid()` |
| reviews_delete_own | authenticated | DELETE | `user_id = auth.uid()` |

MVP에서 리뷰는 비공개. 랜딩 쇼케이스가 필요해지면 `is_public` 컬럼을 추가하는 마이그레이션으로 연다.

## 6. 목표 SQL 스케치

구현 단계의 `schema.sql`은 아래를 빠짐없이 포함한다. 아래는 설계 스케치이며, 적용 전 Supabase SQL Editor에서 한 번 더 검증한다.

```sql
-- profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT now(),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  steam_id TEXT
);

-- prompts
CREATE TABLE public.prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- career_posts
CREATE TABLE public.career_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
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
CREATE TABLE public.career_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
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
CREATE TABLE public.game_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
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
