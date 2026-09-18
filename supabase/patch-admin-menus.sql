-- Admin sidebar menus live in devdeck.menus (location = 'admin'), same tree as header/footer.
-- Safe to re-run: constraint/columns are idempotent; seed only when no admin rows exist.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'devdeck'
      AND rel.relname = 'menus'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%location%'
  LOOP
    EXECUTE format('ALTER TABLE devdeck.menus DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE devdeck.menus
  ADD CONSTRAINT menus_location_check
  CHECK (location IN ('header', 'footer', 'admin'));

ALTER TABLE devdeck.menus ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE devdeck.menus ADD COLUMN IF NOT EXISTS label_key TEXT;

DO $$
DECLARE
  id_content UUID;
  id_community UUID;
  id_ops UUID;
  id_design UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM devdeck.menus WHERE location = 'admin') THEN
    RAISE NOTICE 'admin menus already exist — skip seed';
    RETURN;
  END IF;

  INSERT INTO devdeck.menus (label, label_key, href, icon, location, view_role, is_active, sort_order)
  VALUES ('콘텐츠', 'nav.group.content', NULL, 'Layers', 'admin', 'owner', true, 0)
  RETURNING id INTO id_content;

  INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order) VALUES
    (id_content, '대시보드', 'nav.dashboard', '/site/dashboard', 'LayoutDashboard', 'admin', 'owner', true, 0),
    (id_content, 'PromptKit', 'nav.promptkit', '/promptkit', 'Sparkles', 'admin', 'owner', true, 10),
    (id_content, 'CareerLog', 'nav.career', '/career', 'Briefcase', 'admin', 'owner', true, 20),
    (id_content, 'Steam Tracker', 'nav.steam', '/steam', 'Gamepad2', 'admin', 'owner', true, 30);

  INSERT INTO devdeck.menus (label, label_key, href, icon, location, view_role, is_active, sort_order)
  VALUES ('커뮤니티', 'nav.group.community', NULL, 'LayoutList', 'admin', 'owner', true, 10)
  RETURNING id INTO id_community;

  INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order) VALUES
    (id_community, '게시판', 'nav.boards', '/site/boards', 'LayoutList', 'admin', 'owner', true, 0),
    (id_community, '댓글', 'nav.comments', '/site/comments', 'MessageSquare', 'admin', 'owner', true, 10),
    (id_community, '메뉴', 'nav.menus', '/site/menus', 'Menu', 'admin', 'owner', true, 20),
    (id_community, '업로드', 'nav.uploads', '/site/uploads', 'Upload', 'admin', 'owner', true, 30);

  INSERT INTO devdeck.menus (label, label_key, href, icon, location, view_role, is_active, sort_order)
  VALUES ('운영', 'nav.group.ops', NULL, 'Shield', 'admin', 'owner', true, 20)
  RETURNING id INTO id_ops;

  INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order) VALUES
    (id_ops, '회원', 'nav.members', '/site/members', 'Users', 'admin', 'owner', true, 0),
    (id_ops, '접속 이력', 'nav.loginHistory', '/site/login-history', 'History', 'admin', 'owner', true, 10),
    (id_ops, '설정', 'nav.settings', '/site/settings', 'Settings', 'admin', 'owner', true, 20),
    (id_ops, '시스템', 'nav.system', '/site/system', 'Monitor', 'admin', 'owner', true, 30);

  INSERT INTO devdeck.menus (label, label_key, href, icon, location, view_role, is_active, sort_order)
  VALUES ('디자인 시스템', 'nav.group.design', NULL, 'Palette', 'admin', 'owner', true, 30)
  RETURNING id INTO id_design;

  INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order) VALUES
    (id_design, '공통영역', 'nav.designSystemCommon', '/site/design-system/common', 'Palette', 'admin', 'owner', true, 0),
    (id_design, '화면영역', 'nav.designSystemScreens', '/site/design-system/screens', 'LayoutTemplate', 'admin', 'owner', true, 10);

  RAISE NOTICE 'admin menus seeded';
END $$;
