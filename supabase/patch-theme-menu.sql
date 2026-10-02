-- 관리자 사이드바에 "테마 관리" 메뉴를 추가한다("디자인 시스템" 그룹). 이미 있으면 건너뛴다.
-- 테마 값 자체는 기존 devdeck.site_settings 테이블(key='themeConfig')에 저장하므로 별도 테이블은 없다.
-- 재실행해도 안전하다.

DO $$
DECLARE
  design_id UUID;
BEGIN
  IF to_regclass('devdeck.menus') IS NULL THEN
    RAISE NOTICE 'devdeck.menus 테이블이 없어 관리자 메뉴 추가를 건너뜁니다.';
    RETURN;
  END IF;

  SELECT id INTO design_id
  FROM devdeck.menus
  WHERE location = 'admin' AND parent_id IS NULL AND label_key = 'nav.group.design'
  LIMIT 1;

  IF design_id IS NULL THEN
    RAISE NOTICE '관리자 "디자인 시스템" 그룹을 찾지 못해 메뉴 추가를 건너뜁니다.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM devdeck.menus WHERE location = 'admin' AND href = '/site/theme'
  ) THEN
    INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order)
    VALUES (design_id, '테마 관리', 'nav.theme', '/site/theme', 'Palette', 'admin', 'owner', true, 20);
  END IF;
END $$;
