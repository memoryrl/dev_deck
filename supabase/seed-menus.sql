-- Default menus from public mega-nav + footer.
-- Safe to re-run: only inserts when menus table is empty.
-- Run in Supabase SQL editor (devdeck schema).

DO $$
DECLARE
  menu_count INT;
  id_prompt UUID;
  id_career UUID;
  id_games UUID;
  id_browse UUID;
  id_pk UUID;
  id_cl UUID;
  id_st UUID;
BEGIN
  SELECT COUNT(*) INTO menu_count FROM devdeck.menus;
  IF menu_count > 0 THEN
    RAISE NOTICE 'menus already has % rows — skip seed', menu_count;
    RETURN;
  END IF;

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

  RAISE NOTICE 'default menus seeded';
END $$;
