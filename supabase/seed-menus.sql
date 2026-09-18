-- Default menus from public mega-nav + footer.
-- Safe to re-run: only inserts when menus table is empty.
-- Run in Supabase SQL editor (devdeck schema).

DO $$
DECLARE
  menu_count INT;
  id_prompt UUID;
  id_career UUID;
  id_games UUID;
  id_community UUID;
  id_community_footer UUID;
  id_browse UUID;
  id_pk UUID;
  id_cl UUID;
  id_st UUID;
  id_notice UUID;
  id_free UUID;
BEGIN
  SELECT COUNT(*) INTO menu_count FROM devdeck.menus;
  IF menu_count > 0 THEN
    RAISE NOTICE 'menus already has % rows — skip seed', menu_count;
    RETURN;
  END IF;

  INSERT INTO devdeck.boards (slug, name, description, kind, view_role, write_role, is_active, sort_order)
  VALUES
    ('notice', '공지사항', '사이트 운영 공지', 'generic', 'visitor', 'owner', true, 40),
    ('free', '자유게시판', '자유롭게 이야기를 남기는 공간', 'generic', 'visitor', 'member', true, 50)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO id_notice;

  SELECT id INTO id_notice FROM devdeck.boards WHERE slug = 'notice';
  SELECT id INTO id_free FROM devdeck.boards WHERE slug = 'free';

  INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
  VALUES ('AI Prompt', NULL, 'header', 'visitor', true, 0)
  RETURNING id INTO id_prompt;

  INSERT INTO devdeck.menus (parent_id, label, href, location, view_role, is_active, sort_order) VALUES
    (id_prompt, '공개 프롬프트', '/#prompts', 'header', 'visitor', true, 0),
    (id_prompt, '허브 홈', '/', 'header', 'visitor', true, 10),
    (id_prompt, '프롬프트 관리', '/promptkit', 'header', 'owner', true, 20);

  INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
  VALUES ('커리어로그', NULL, 'header', 'visitor', true, 10)
  RETURNING id INTO id_career;

  INSERT INTO devdeck.menus (parent_id, label, href, location, view_role, is_active, sort_order) VALUES
    (id_career, '전체 글', '/work', 'header', 'visitor', true, 0),
    (id_career, '최근 커리어', '/#career', 'header', 'visitor', true, 10),
    (id_career, '스킬', '/#skills', 'header', 'visitor', true, 20),
    (id_career, '글·스킬 관리', '/career', 'header', 'owner', true, 30);

  INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
  VALUES ('게임리뷰', NULL, 'header', 'visitor', true, 20)
  RETURNING id INTO id_games;

  INSERT INTO devdeck.menus (parent_id, label, href, location, view_role, is_active, sort_order) VALUES
    (id_games, '게임 목록', '/games', 'header', 'visitor', true, 0),
    (id_games, '추천 게임', '/#games', 'header', 'visitor', true, 10),
    (id_games, '리뷰 관리', '/steam', 'header', 'owner', true, 20);

  INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
  VALUES ('커뮤니티', NULL, 'header', 'visitor', true, 30)
  RETURNING id INTO id_community;

  INSERT INTO devdeck.menus (parent_id, board_id, label, href, location, view_role, is_active, sort_order) VALUES
    (id_community, id_notice, '공지사항', NULL, 'header', 'visitor', true, 0),
    (id_community, id_free, '자유게시판', NULL, 'header', 'visitor', true, 10);

  INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
  VALUES ('둘러보기', NULL, 'footer', 'visitor', true, 0)
  RETURNING id INTO id_browse;

  INSERT INTO devdeck.menus (parent_id, label, href, location, view_role, is_active, sort_order) VALUES
    (id_browse, '홈', '/', 'footer', 'visitor', true, 0),
    (id_browse, '커리어', '/work', 'footer', 'visitor', true, 10),
    (id_browse, '게임', '/games', 'footer', 'visitor', true, 20);

  INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
  VALUES ('PromptKit', NULL, 'footer', 'visitor', true, 10)
  RETURNING id INTO id_pk;

  INSERT INTO devdeck.menus (parent_id, label, href, location, view_role, is_active, sort_order) VALUES
    (id_pk, '대시보드', '/login', 'footer', 'visitor', true, 0),
    (id_pk, '공개 프롬프트', '/', 'footer', 'visitor', true, 10),
    (id_pk, '프롬프트 관리', '/promptkit', 'footer', 'owner', true, 20);

  INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
  VALUES ('CareerLog', NULL, 'footer', 'visitor', true, 20)
  RETURNING id INTO id_cl;

  INSERT INTO devdeck.menus (parent_id, label, href, location, view_role, is_active, sort_order) VALUES
    (id_cl, '게시판', '/work', 'footer', 'visitor', true, 0),
    (id_cl, '스킬', '/work', 'footer', 'visitor', true, 10),
    (id_cl, '글·스킬 관리', '/career', 'footer', 'owner', true, 20);

  INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
  VALUES ('Steam', NULL, 'footer', 'visitor', true, 30)
  RETURNING id INTO id_st;

  INSERT INTO devdeck.menus (parent_id, label, href, location, view_role, is_active, sort_order) VALUES
    (id_st, '라이브러리', '/games', 'footer', 'visitor', true, 0),
    (id_st, '리뷰', '/games', 'footer', 'visitor', true, 10),
    (id_st, '리뷰 관리', '/steam', 'footer', 'owner', true, 20);

  INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
  VALUES ('커뮤니티', NULL, 'footer', 'visitor', true, 40)
  RETURNING id INTO id_community_footer;

  INSERT INTO devdeck.menus (parent_id, board_id, label, href, location, view_role, is_active, sort_order) VALUES
    (id_community_footer, id_notice, '공지사항', NULL, 'footer', 'visitor', true, 0),
    (id_community_footer, id_free, '자유게시판', NULL, 'footer', 'visitor', true, 10);

  -- Admin sidebar (1depth groups / 2depth links)
  INSERT INTO devdeck.menus (label, label_key, href, icon, location, view_role, is_active, sort_order)
  VALUES ('콘텐츠', 'nav.group.content', NULL, 'Layers', 'admin', 'owner', true, 0)
  RETURNING id INTO id_prompt;

  INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order) VALUES
    (id_prompt, '대시보드', 'nav.dashboard', '/site/dashboard', 'LayoutDashboard', 'admin', 'owner', true, 0),
    (id_prompt, 'PromptKit', 'nav.promptkit', '/promptkit', 'Sparkles', 'admin', 'owner', true, 10),
    (id_prompt, 'CareerLog', 'nav.career', '/career', 'Briefcase', 'admin', 'owner', true, 20),
    (id_prompt, 'Steam Tracker', 'nav.steam', '/steam', 'Gamepad2', 'admin', 'owner', true, 30);

  INSERT INTO devdeck.menus (label, label_key, href, icon, location, view_role, is_active, sort_order)
  VALUES ('커뮤니티', 'nav.group.community', NULL, 'LayoutList', 'admin', 'owner', true, 10)
  RETURNING id INTO id_career;

  INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order) VALUES
    (id_career, '게시판', 'nav.boards', '/site/boards', 'LayoutList', 'admin', 'owner', true, 0),
    (id_career, '댓글', 'nav.comments', '/site/comments', 'MessageSquare', 'admin', 'owner', true, 10),
    (id_career, '메뉴', 'nav.menus', '/site/menus', 'Menu', 'admin', 'owner', true, 20),
    (id_career, '업로드', 'nav.uploads', '/site/uploads', 'Upload', 'admin', 'owner', true, 30);

  INSERT INTO devdeck.menus (label, label_key, href, icon, location, view_role, is_active, sort_order)
  VALUES ('운영', 'nav.group.ops', NULL, 'Shield', 'admin', 'owner', true, 20)
  RETURNING id INTO id_games;

  INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order) VALUES
    (id_games, '회원', 'nav.members', '/site/members', 'Users', 'admin', 'owner', true, 0),
    (id_games, '접속 이력', 'nav.loginHistory', '/site/login-history', 'History', 'admin', 'owner', true, 10),
    (id_games, '설정', 'nav.settings', '/site/settings', 'Settings', 'admin', 'owner', true, 20),
    (id_games, '시스템', 'nav.system', '/site/system', 'Monitor', 'admin', 'owner', true, 30);

  INSERT INTO devdeck.menus (label, label_key, href, icon, location, view_role, is_active, sort_order)
  VALUES ('디자인 시스템', 'nav.group.design', NULL, 'Palette', 'admin', 'owner', true, 30)
  RETURNING id INTO id_community;

  INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order) VALUES
    (id_community, '공통영역', 'nav.designSystemCommon', '/site/design-system/common', 'Palette', 'admin', 'owner', true, 0),
    (id_community, '화면영역', 'nav.designSystemScreens', '/site/design-system/screens', 'LayoutTemplate', 'admin', 'owner', true, 10);

  RAISE NOTICE 'default menus seeded';
END $$;
