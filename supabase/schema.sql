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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devdeck.menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES devdeck.menus(id) ON DELETE CASCADE,
  board_id UUID REFERENCES devdeck.boards(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  href TEXT,
  location TEXT NOT NULL DEFAULT 'header'
    CHECK (location IN ('header', 'footer')),
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
