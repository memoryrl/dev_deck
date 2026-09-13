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

ALTER TABLE devdeck.boards
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'generic';

ALTER TABLE devdeck.boards DROP CONSTRAINT IF EXISTS boards_kind_check;
ALTER TABLE devdeck.boards
  ADD CONSTRAINT boards_kind_check CHECK (kind IN ('generic', 'prompts', 'career', 'steam'));

CREATE UNIQUE INDEX IF NOT EXISTS boards_system_kind_uidx
  ON devdeck.boards (kind)
  WHERE kind <> 'generic';

UPDATE devdeck.boards SET kind = 'prompts' WHERE slug = 'prompts' AND kind = 'generic';
UPDATE devdeck.boards SET kind = 'career' WHERE slug = 'career' AND kind = 'generic';
UPDATE devdeck.boards SET kind = 'steam' WHERE slug = 'steam' AND kind = 'generic';

INSERT INTO devdeck.boards (slug, name, description, kind, view_role, write_role, is_active, sort_order)
VALUES
  ('prompts', 'AI Prompt', 'PromptKit 공개 프롬프트', 'prompts', 'visitor', 'owner', true, 10),
  ('career', '개발업무', 'CareerLog 공개 글', 'career', 'visitor', 'owner', true, 20),
  ('steam', 'Steam 리뷰', 'Steam Tracker 공개 리뷰', 'steam', 'visitor', 'owner', true, 30)
ON CONFLICT (slug) DO NOTHING;
