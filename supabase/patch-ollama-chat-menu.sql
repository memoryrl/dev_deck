-- 관리자 사이드바에 "로컬 LLM 테스트" 메뉴를 추가한다("운영" 그룹). 이미 있으면 건너뛴다.
-- 재실행해도 안전하다.

DO $$
DECLARE
  ops_id UUID;
BEGIN
  IF to_regclass('devdeck.menus') IS NULL THEN
    RAISE NOTICE 'devdeck.menus 테이블이 없어 관리자 메뉴 추가를 건너뜁니다.';
    RETURN;
  END IF;

  SELECT id INTO ops_id
  FROM devdeck.menus
  WHERE location = 'admin' AND parent_id IS NULL AND label_key = 'nav.group.ops'
  LIMIT 1;

  IF ops_id IS NULL THEN
    RAISE NOTICE '관리자 "운영" 그룹을 찾지 못해 메뉴 추가를 건너뜁니다.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM devdeck.menus WHERE location = 'admin' AND href = '/site/ollama-chat'
  ) THEN
    INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order)
    VALUES (ops_id, '로컬 LLM 테스트', 'nav.ollamaChat', '/site/ollama-chat', 'Bot', 'admin', 'owner', true, 18);
  END IF;
END $$;
