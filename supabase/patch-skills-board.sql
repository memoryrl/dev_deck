-- "스킬" 메뉴가 랜딩 앵커(#skills) 대신 범용 게시판을 가리키게 한다. Safe to re-run.

INSERT INTO devdeck.boards (slug, name, description, kind, view_role, write_role, is_active, sort_order)
VALUES
  ('skills', '스킬', '보유 기술과 경험을 글로 정리합니다.', 'generic', 'visitor', 'owner', true, 60)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  view_role = EXCLUDED.view_role,
  write_role = EXCLUDED.write_role,
  sort_order = EXCLUDED.sort_order;

DO $$
DECLARE
  skills_board_id UUID;
BEGIN
  SELECT id INTO skills_board_id FROM devdeck.boards WHERE slug = 'skills';

  UPDATE devdeck.menus
  SET board_id = skills_board_id, href = NULL
  WHERE location = 'header' AND label = '스킬' AND href = '/#skills';

  UPDATE devdeck.menus
  SET board_id = skills_board_id, href = NULL
  WHERE location = 'footer' AND label = '스킬' AND href = '/#skills';
END $$;
