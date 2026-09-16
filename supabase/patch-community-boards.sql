-- Community boards + header/footer menus. Safe to re-run.
-- 게임리뷰(sort 20) 오른쪽에 커뮤니티(sort 30)를 두고, 공지사항·자유게시판을 연결한다.

INSERT INTO devdeck.boards (slug, name, description, kind, view_role, write_role, is_active, sort_order)
VALUES
  ('notice', '공지사항', '사이트 운영 공지', 'generic', 'visitor', 'owner', true, 40),
  ('free', '자유게시판', '자유롭게 이야기를 남기는 공간', 'generic', 'visitor', 'member', true, 50)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  view_role = EXCLUDED.view_role,
  write_role = EXCLUDED.write_role,
  sort_order = EXCLUDED.sort_order;

DO $$
DECLARE
  notice_id UUID;
  free_id UUID;
  header_id UUID;
  footer_id UUID;
BEGIN
  SELECT id INTO notice_id FROM devdeck.boards WHERE slug = 'notice';
  SELECT id INTO free_id FROM devdeck.boards WHERE slug = 'free';

  SELECT id INTO header_id
  FROM devdeck.menus
  WHERE location = 'header' AND parent_id IS NULL AND label = '커뮤니티'
  LIMIT 1;

  IF header_id IS NULL THEN
    INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
    VALUES ('커뮤니티', NULL, 'header', 'visitor', true, 30)
    RETURNING id INTO header_id;
  ELSE
    UPDATE devdeck.menus
    SET href = NULL, is_active = true, sort_order = 30, view_role = 'visitor'
    WHERE id = header_id;
  END IF;

  INSERT INTO devdeck.menus (parent_id, board_id, label, href, location, view_role, is_active, sort_order)
  SELECT header_id, notice_id, '공지사항', NULL, 'header', 'visitor', true, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM devdeck.menus WHERE parent_id = header_id AND label = '공지사항'
  );

  INSERT INTO devdeck.menus (parent_id, board_id, label, href, location, view_role, is_active, sort_order)
  SELECT header_id, free_id, '자유게시판', NULL, 'header', 'visitor', true, 10
  WHERE NOT EXISTS (
    SELECT 1 FROM devdeck.menus WHERE parent_id = header_id AND label = '자유게시판'
  );

  UPDATE devdeck.menus SET board_id = notice_id, href = NULL, is_active = true
  WHERE parent_id = header_id AND label = '공지사항';
  UPDATE devdeck.menus SET board_id = free_id, href = NULL, is_active = true
  WHERE parent_id = header_id AND label = '자유게시판';

  SELECT id INTO footer_id
  FROM devdeck.menus
  WHERE location = 'footer' AND parent_id IS NULL AND label = '커뮤니티'
  LIMIT 1;

  IF footer_id IS NULL THEN
    INSERT INTO devdeck.menus (label, href, location, view_role, is_active, sort_order)
    VALUES ('커뮤니티', NULL, 'footer', 'visitor', true, 40)
    RETURNING id INTO footer_id;
  ELSE
    UPDATE devdeck.menus
    SET href = NULL, is_active = true, sort_order = 40, view_role = 'visitor'
    WHERE id = footer_id;
  END IF;

  INSERT INTO devdeck.menus (parent_id, board_id, label, href, location, view_role, is_active, sort_order)
  SELECT footer_id, notice_id, '공지사항', NULL, 'footer', 'visitor', true, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM devdeck.menus WHERE parent_id = footer_id AND label = '공지사항'
  );

  INSERT INTO devdeck.menus (parent_id, board_id, label, href, location, view_role, is_active, sort_order)
  SELECT footer_id, free_id, '자유게시판', NULL, 'footer', 'visitor', true, 10
  WHERE NOT EXISTS (
    SELECT 1 FROM devdeck.menus WHERE parent_id = footer_id AND label = '자유게시판'
  );

  UPDATE devdeck.menus SET board_id = notice_id, href = NULL, is_active = true
  WHERE parent_id = footer_id AND label = '공지사항';
  UPDATE devdeck.menus SET board_id = free_id, href = NULL, is_active = true
  WHERE parent_id = footer_id AND label = '자유게시판';
END $$;
