-- DevDeck schema only. Do not DROP or REPLACE existing public objects.
CREATE SCHEMA IF NOT EXISTS devdeck;

GRANT USAGE ON SCHEMA devdeck TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA devdeck TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA devdeck TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA devdeck
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA devdeck
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS devdeck.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT now(),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  steam_id TEXT
);

CREATE TABLE IF NOT EXISTS devdeck.prompts (
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

CREATE TABLE IF NOT EXISTS devdeck.career_posts (
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

CREATE TABLE IF NOT EXISTS devdeck.career_skills (
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

CREATE TABLE IF NOT EXISTS devdeck.game_reviews (
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

CREATE INDEX IF NOT EXISTS prompts_user_id_idx ON devdeck.prompts (user_id);
CREATE INDEX IF NOT EXISTS prompts_is_public_idx ON devdeck.prompts (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS prompts_category_idx ON devdeck.prompts (category);
CREATE INDEX IF NOT EXISTS prompts_tags_idx ON devdeck.prompts USING GIN (tags);

CREATE INDEX IF NOT EXISTS career_posts_user_id_idx ON devdeck.career_posts (user_id);
CREATE INDEX IF NOT EXISTS career_posts_is_public_idx ON devdeck.career_posts (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS career_posts_type_idx ON devdeck.career_posts (post_type);
CREATE INDEX IF NOT EXISTS career_posts_company_idx ON devdeck.career_posts (company);
CREATE INDEX IF NOT EXISTS career_posts_tags_idx ON devdeck.career_posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS career_posts_skills_idx ON devdeck.career_posts USING GIN (skills);

CREATE INDEX IF NOT EXISTS career_skills_user_id_idx ON devdeck.career_skills (user_id);
CREATE INDEX IF NOT EXISTS career_skills_is_public_idx ON devdeck.career_skills (is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS career_skills_sort_idx ON devdeck.career_skills (user_id, sort_order);

CREATE INDEX IF NOT EXISTS game_reviews_user_id_idx ON devdeck.game_reviews (user_id);
CREATE INDEX IF NOT EXISTS game_reviews_app_id_idx ON devdeck.game_reviews (app_id);
CREATE INDEX IF NOT EXISTS game_reviews_favorite_idx ON devdeck.game_reviews (user_id) WHERE is_favorite = true;

CREATE OR REPLACE FUNCTION devdeck.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = devdeck, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.profiles
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.prompts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.prompts
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.career_posts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.career_posts
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.career_skills;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.career_skills
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.game_reviews;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.game_reviews
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

CREATE OR REPLACE FUNCTION devdeck.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck, public
AS $$
BEGIN
  INSERT INTO devdeck.profiles (id, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS devdeck_on_auth_user_created ON auth.users;
CREATE TRIGGER devdeck_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION devdeck.handle_new_user();

CREATE OR REPLACE FUNCTION devdeck.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'memoryrl@gmail.com'
$$;

GRANT EXECUTE ON FUNCTION devdeck.is_owner() TO anon, authenticated;

ALTER TABLE devdeck.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.career_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.career_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.game_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON devdeck.profiles;
CREATE POLICY profiles_select_own ON devdeck.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_select_owner ON devdeck.profiles;
CREATE POLICY profiles_select_owner ON devdeck.profiles
  FOR SELECT TO authenticated USING (devdeck.is_owner());

DROP POLICY IF EXISTS profiles_update_own ON devdeck.profiles;
CREATE POLICY profiles_update_own ON devdeck.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON devdeck.profiles;
CREATE POLICY profiles_insert_own ON devdeck.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS prompts_select_own ON devdeck.prompts;
CREATE POLICY prompts_select_own ON devdeck.prompts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS prompts_select_public ON devdeck.prompts;
CREATE POLICY prompts_select_public ON devdeck.prompts
  FOR SELECT TO anon, authenticated USING (is_public = true);

DROP POLICY IF EXISTS prompts_insert_own ON devdeck.prompts;
CREATE POLICY prompts_insert_own ON devdeck.prompts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS prompts_update_own ON devdeck.prompts;
CREATE POLICY prompts_update_own ON devdeck.prompts
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS prompts_delete_own ON devdeck.prompts;
CREATE POLICY prompts_delete_own ON devdeck.prompts
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_posts_select_own ON devdeck.career_posts;
CREATE POLICY career_posts_select_own ON devdeck.career_posts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS career_posts_select_public ON devdeck.career_posts;
CREATE POLICY career_posts_select_public ON devdeck.career_posts
  FOR SELECT TO anon, authenticated USING (is_public = true);

DROP POLICY IF EXISTS career_posts_insert_own ON devdeck.career_posts;
CREATE POLICY career_posts_insert_own ON devdeck.career_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_posts_update_own ON devdeck.career_posts;
CREATE POLICY career_posts_update_own ON devdeck.career_posts
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_posts_delete_own ON devdeck.career_posts;
CREATE POLICY career_posts_delete_own ON devdeck.career_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_skills_select_own ON devdeck.career_skills;
CREATE POLICY career_skills_select_own ON devdeck.career_skills
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS career_skills_select_public ON devdeck.career_skills;
CREATE POLICY career_skills_select_public ON devdeck.career_skills
  FOR SELECT TO anon, authenticated USING (is_public = true);

DROP POLICY IF EXISTS career_skills_insert_own ON devdeck.career_skills;
CREATE POLICY career_skills_insert_own ON devdeck.career_skills
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_skills_update_own ON devdeck.career_skills;
CREATE POLICY career_skills_update_own ON devdeck.career_skills
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_skills_delete_own ON devdeck.career_skills;
CREATE POLICY career_skills_delete_own ON devdeck.career_skills
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS reviews_select_own ON devdeck.game_reviews;
CREATE POLICY reviews_select_own ON devdeck.game_reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS reviews_select_public ON devdeck.game_reviews;
CREATE POLICY reviews_select_public ON devdeck.game_reviews
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS reviews_insert_own ON devdeck.game_reviews;
CREATE POLICY reviews_insert_own ON devdeck.game_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS reviews_update_own ON devdeck.game_reviews;
CREATE POLICY reviews_update_own ON devdeck.game_reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS reviews_delete_own ON devdeck.game_reviews;
CREATE POLICY reviews_delete_own ON devdeck.game_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());


-- Generic boards + DB-driven menus
-- Generic boards + DB-driven menus. Safe to re-run.
CREATE OR REPLACE FUNCTION devdeck.current_access_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN lower(coalesce(auth.jwt() ->> 'email', '')) = 'memoryrl@gmail.com' THEN 'owner'
    WHEN auth.uid() IS NOT NULL THEN 'member'
    ELSE 'visitor'
  END
$$;

CREATE OR REPLACE FUNCTION devdeck.role_at_least(required text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT CASE devdeck.current_access_role()
    WHEN 'owner' THEN true
    WHEN 'member' THEN required IN ('visitor', 'member')
    ELSE required = 'visitor'
  END
$$;

GRANT EXECUTE ON FUNCTION devdeck.current_access_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION devdeck.role_at_least(text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS devdeck.boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'generic'
    CHECK (kind IN ('generic', 'prompts', 'career', 'steam')),
  view_role TEXT NOT NULL DEFAULT 'visitor'
    CHECK (view_role IN ('visitor', 'member', 'owner')),
  write_role TEXT NOT NULL DEFAULT 'owner'
    CHECK (write_role IN ('member', 'owner')),
  comment_role TEXT NOT NULL DEFAULT 'visitor'
    CHECK (comment_role IN ('visitor', 'member', 'owner')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT boards_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX IF NOT EXISTS boards_system_kind_uidx
  ON devdeck.boards (kind)
  WHERE kind <> 'generic';

INSERT INTO devdeck.boards (slug, name, description, kind, view_role, write_role, is_active, sort_order)
VALUES
  ('prompts', 'AI Prompt', 'PromptKit 공개 프롬프트', 'prompts', 'visitor', 'owner', true, 10),
  ('career', '개발업무', 'CareerLog 공개 글', 'career', 'visitor', 'owner', true, 20),
  ('steam', 'Steam 리뷰', 'Steam Tracker 공개 리뷰', 'steam', 'visitor', 'owner', true, 30)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS devdeck.board_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES devdeck.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES devdeck.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_popup BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devdeck.menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES devdeck.menus(id) ON DELETE CASCADE,
  board_id UUID REFERENCES devdeck.boards(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  label_key TEXT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  icon TEXT,
  href TEXT,
  location TEXT NOT NULL DEFAULT 'header'
    CHECK (location IN ('header', 'footer', 'admin')),
  view_role TEXT NOT NULL DEFAULT 'visitor'
    CHECK (view_role IN ('visitor', 'member', 'owner')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS boards_active_idx ON devdeck.boards (is_active, sort_order);
CREATE INDEX IF NOT EXISTS board_posts_board_idx ON devdeck.board_posts (board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS board_posts_published_idx ON devdeck.board_posts (board_id) WHERE is_published = true;
CREATE UNIQUE INDEX IF NOT EXISTS board_posts_popup_uidx ON devdeck.board_posts ((true)) WHERE is_popup = true;
CREATE INDEX IF NOT EXISTS menus_location_idx ON devdeck.menus (location, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS menus_board_idx ON devdeck.menus (board_id);

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.boards;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.boards
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.board_posts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.board_posts
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.menus;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.menus
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

ALTER TABLE devdeck.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boards_select ON devdeck.boards;
CREATE POLICY boards_select ON devdeck.boards
  FOR SELECT TO anon, authenticated
  USING (devdeck.is_owner() OR (is_active AND devdeck.role_at_least(view_role)));

DROP POLICY IF EXISTS boards_write ON devdeck.boards;
CREATE POLICY boards_write ON devdeck.boards
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

DROP POLICY IF EXISTS board_posts_select ON devdeck.board_posts;
CREATE POLICY board_posts_select ON devdeck.board_posts
  FOR SELECT TO anon, authenticated
  USING (
    devdeck.is_owner()
    OR user_id = auth.uid()
    OR (
      is_published
      AND EXISTS (
        SELECT 1 FROM devdeck.boards b
        WHERE b.id = board_id
          AND b.is_active
          AND devdeck.role_at_least(b.view_role)
      )
    )
  );

DROP POLICY IF EXISTS board_posts_insert ON devdeck.board_posts;
CREATE POLICY board_posts_insert ON devdeck.board_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      devdeck.is_owner()
      OR EXISTS (
        SELECT 1 FROM devdeck.boards b
        WHERE b.id = board_id
          AND b.is_active
          AND devdeck.role_at_least(b.write_role)
      )
    )
  );

DROP POLICY IF EXISTS board_posts_update ON devdeck.board_posts;
CREATE POLICY board_posts_update ON devdeck.board_posts
  FOR UPDATE TO authenticated
  USING (
    devdeck.is_owner()
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM devdeck.boards b
        WHERE b.id = board_id
          AND b.is_active
          AND devdeck.role_at_least(b.write_role)
      )
    )
  );

DROP POLICY IF EXISTS board_posts_delete ON devdeck.board_posts;
CREATE POLICY board_posts_delete ON devdeck.board_posts
  FOR DELETE TO authenticated
  USING (
    devdeck.is_owner()
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM devdeck.boards b
        WHERE b.id = board_id
          AND b.is_active
          AND devdeck.role_at_least(b.write_role)
      )
    )
  );

DROP POLICY IF EXISTS menus_select ON devdeck.menus;
CREATE POLICY menus_select ON devdeck.menus
  FOR SELECT TO anon, authenticated
  USING (devdeck.is_owner() OR (is_active AND devdeck.role_at_least(view_role)));

DROP POLICY IF EXISTS menus_write ON devdeck.menus;
CREATE POLICY menus_write ON devdeck.menus
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

GRANT ALL ON TABLE devdeck.boards TO anon, authenticated, service_role;
GRANT ALL ON TABLE devdeck.board_posts TO anon, authenticated, service_role;
GRANT ALL ON TABLE devdeck.menus TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS devdeck.supabase_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok BOOLEAN NOT NULL,
  duration_ms INTEGER,
  auth_ok BOOLEAN,
  auth_status INTEGER,
  db_ok BOOLEAN,
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supabase_health_checks_checked_at
  ON devdeck.supabase_health_checks (checked_at DESC);

ALTER TABLE devdeck.supabase_health_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_read_supabase_health_checks ON devdeck.supabase_health_checks;
CREATE POLICY owner_read_supabase_health_checks
  ON devdeck.supabase_health_checks
  FOR SELECT
  TO authenticated
  USING (devdeck.is_owner());

DROP POLICY IF EXISTS service_role_manage_supabase_health_checks ON devdeck.supabase_health_checks;
CREATE POLICY service_role_manage_supabase_health_checks
  ON devdeck.supabase_health_checks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON TABLE devdeck.supabase_health_checks TO authenticated;
GRANT ALL ON TABLE devdeck.supabase_health_checks TO service_role;

-- Comments + profanity filter
-- 댓글(무한 트리) + 욕설 치환 단어. 기존 스키마에 추가할 때 이 파일만 실행.
CREATE TABLE IF NOT EXISTS devdeck.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL
    CHECK (target_type IN ('prompt', 'career', 'board', 'steam')),
  target_id TEXT NOT NULL,
  parent_id UUID REFERENCES devdeck.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES devdeck.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  ip_region TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT comments_body_len CHECK (char_length(body) BETWEEN 1 AND 20000),
  CONSTRAINT comments_name_len CHECK (char_length(author_name) BETWEEN 1 AND 40)
);

CREATE INDEX IF NOT EXISTS comments_target_idx
  ON devdeck.comments (target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_idx
  ON devdeck.comments (parent_id);

CREATE TABLE IF NOT EXISTS devdeck.profanity_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  replacement TEXT NOT NULL DEFAULT '**',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION devdeck.mask_profanity(input text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = devdeck, public
AS $$
DECLARE
  result text := coalesce(input, '');
  rec record;
  escaped text;
BEGIN
  FOR rec IN
    SELECT word, replacement
    FROM devdeck.profanity_words
    ORDER BY char_length(word) DESC
  LOOP
    escaped := regexp_replace(rec.word, '([!$()*+.:<=>?[\\\]^{|}-])', '\\\1', 'g');
    result := regexp_replace(result, escaped, rec.replacement, 'gi');
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION devdeck.comments_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck, public
AS $$
BEGIN
  NEW.author_name := left(btrim(NEW.author_name), 40);
  NEW.body := left(btrim(devdeck.mask_profanity(NEW.body)), 20000);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_before_write ON devdeck.comments;
CREATE TRIGGER comments_before_write
  BEFORE INSERT OR UPDATE OF body, author_name ON devdeck.comments
  FOR EACH ROW EXECUTE FUNCTION devdeck.comments_before_write();

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.comments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.comments
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

CREATE OR REPLACE FUNCTION devdeck.normalize_profanity_word()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = devdeck, public
AS $$
BEGIN
  NEW.word := lower(btrim(NEW.word));
  IF NEW.replacement IS NULL OR btrim(NEW.replacement) = '' THEN
    NEW.replacement := '**';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_profanity_word ON devdeck.profanity_words;
CREATE TRIGGER normalize_profanity_word
  BEFORE INSERT OR UPDATE ON devdeck.profanity_words
  FOR EACH ROW EXECUTE FUNCTION devdeck.normalize_profanity_word();

INSERT INTO devdeck.profanity_words (word, replacement) VALUES
  ('시발', '**'),
  ('씨발', '**'),
  ('ㅅㅂ', '**'),
  ('ㅂㅅ', '**'),
  ('개새끼', '**'),
  ('병신', '**'),
  ('좆', '**'),
  ('존나', '**'),
  ('fuck', '**'),
  ('shit', '**'),
  ('bitch', '**')
ON CONFLICT (word) DO NOTHING;

ALTER TABLE devdeck.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.profanity_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_select ON devdeck.comments;
CREATE POLICY comments_select ON devdeck.comments
  FOR SELECT TO anon, authenticated
  USING (is_hidden = false OR devdeck.is_owner());

DROP POLICY IF EXISTS comments_insert ON devdeck.comments;
CREATE POLICY comments_insert ON devdeck.comments
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    is_hidden = false
    AND (
      target_type <> 'board'
      OR EXISTS (
        SELECT 1
        FROM devdeck.board_posts p
        JOIN devdeck.boards b ON b.id = p.board_id
        WHERE p.id::text = target_id
          AND b.is_active
          AND devdeck.role_at_least(COALESCE(b.comment_role, 'visitor'))
      )
    )
  );

DROP POLICY IF EXISTS comments_owner ON devdeck.comments;
CREATE POLICY comments_owner ON devdeck.comments
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

DROP POLICY IF EXISTS profanity_owner ON devdeck.profanity_words;
CREATE POLICY profanity_owner ON devdeck.profanity_words
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

GRANT ALL ON TABLE devdeck.comments TO anon, authenticated, service_role;
GRANT ALL ON TABLE devdeck.profanity_words TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION devdeck.mask_profanity(text) TO anon, authenticated, service_role;

-- Login + visit history (OAuth sign-ins AND anonymous page visits) —
-- see supabase/patch-login-history.sql
CREATE TABLE IF NOT EXISTS devdeck.login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  provider TEXT,
  event_type TEXT NOT NULL DEFAULT 'login'
    CHECK (event_type IN ('login', 'visit')),
  ip_address TEXT NOT NULL,
  ip_region TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_history_created_idx
  ON devdeck.login_history (created_at DESC);
CREATE INDEX IF NOT EXISTS login_history_user_idx
  ON devdeck.login_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS login_history_event_type_idx
  ON devdeck.login_history (event_type, created_at DESC);

ALTER TABLE devdeck.login_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS login_history_select_owner ON devdeck.login_history;
CREATE POLICY login_history_select_owner ON devdeck.login_history
  FOR SELECT TO authenticated
  USING (devdeck.is_owner());

DROP POLICY IF EXISTS login_history_insert_self ON devdeck.login_history;
DROP POLICY IF EXISTS login_history_insert ON devdeck.login_history;
CREATE POLICY login_history_insert ON devdeck.login_history
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL AND event_type = 'visit')
    OR (user_id = auth.uid())
  );

DROP POLICY IF EXISTS login_history_delete_owner ON devdeck.login_history;
CREATE POLICY login_history_delete_owner ON devdeck.login_history
  FOR DELETE TO authenticated
  USING (devdeck.is_owner());

GRANT ALL ON TABLE devdeck.login_history TO anon, authenticated, service_role;

-- Page view detail per session (login_history.id를 세션 식별자로 재사용) —
-- see supabase/patch-page-views.sql, docs/10-login-history.md
CREATE TABLE IF NOT EXISTS devdeck.page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES devdeck.login_history(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_views_visit_idx
  ON devdeck.page_views (visit_id, created_at);

ALTER TABLE devdeck.page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS page_views_select_owner ON devdeck.page_views;
CREATE POLICY page_views_select_owner ON devdeck.page_views
  FOR SELECT TO authenticated
  USING (devdeck.is_owner());

DROP POLICY IF EXISTS page_views_insert ON devdeck.page_views;
CREATE POLICY page_views_insert ON devdeck.page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS page_views_delete_owner ON devdeck.page_views;
CREATE POLICY page_views_delete_owner ON devdeck.page_views
  FOR DELETE TO authenticated
  USING (devdeck.is_owner());

GRANT ALL ON TABLE devdeck.page_views TO anon, authenticated, service_role;

-- Signup / withdraw events (survives auth.users CASCADE) —
-- see supabase/patch-member-events.sql
CREATE TABLE IF NOT EXISTS devdeck.member_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'withdraw')),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_events_type_created_idx
  ON devdeck.member_events (event_type, created_at);

ALTER TABLE devdeck.member_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_events_select_owner ON devdeck.member_events;
CREATE POLICY member_events_select_owner ON devdeck.member_events
  FOR SELECT TO authenticated
  USING (devdeck.is_owner());

GRANT ALL ON TABLE devdeck.member_events TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION devdeck.record_profile_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
BEGIN
  INSERT INTO devdeck.member_events (event_type, user_id, created_at)
  VALUES ('signup', NEW.id, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_events_on_profile_insert ON devdeck.profiles;
CREATE TRIGGER member_events_on_profile_insert
  AFTER INSERT ON devdeck.profiles
  FOR EACH ROW EXECUTE FUNCTION devdeck.record_profile_signup();

INSERT INTO devdeck.member_events (event_type, user_id, created_at)
SELECT 'signup', p.id, COALESCE(u.created_at, now())
FROM devdeck.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE NOT EXISTS (
  SELECT 1
  FROM devdeck.member_events e
  WHERE e.event_type = 'signup' AND e.user_id = p.id
);

CREATE TABLE IF NOT EXISTS devdeck.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS site_settings_key_uidx
  ON devdeck.site_settings (key);

ALTER TABLE devdeck.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_select_public ON devdeck.site_settings;
CREATE POLICY site_settings_select_public ON devdeck.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS site_settings_write_owner ON devdeck.site_settings;
CREATE POLICY site_settings_write_owner ON devdeck.site_settings
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

GRANT SELECT ON TABLE devdeck.site_settings TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE devdeck.site_settings TO authenticated, service_role;

INSERT INTO devdeck.site_settings (key, value) VALUES
  ('siteName', 'DevDeck'),
  ('siteDescription', 'AI 프롬프트, 커리어, 게임 리뷰를 기록하는 개인 포트폴리오'),
  ('siteKeywords', 'AI, 프롬프트, 포트폴리오, 게임 리뷰, 커리어'),
  ('footerText', '© 2024 DevDeck. All rights reserved.'),
  ('socialImage', ''),
  ('googleAnalyticsId', ''),
  ('noticePopupMode', 'layer'),
  ('maintenanceMode', 'false')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS devdeck.app_env (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_env_key_uidx
  ON devdeck.app_env (key);

ALTER TABLE devdeck.app_env ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_env_owner_all ON devdeck.app_env;
CREATE POLICY app_env_owner_all ON devdeck.app_env
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

REVOKE ALL ON TABLE devdeck.app_env FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE devdeck.app_env TO authenticated, service_role;

INSERT INTO devdeck.app_env (key, value) VALUES
  ('OLLAMA_BASE_URL', 'https://slots-cure-depending-inexpensive.trycloudflare.com')
ON CONFLICT (key) DO NOTHING;
