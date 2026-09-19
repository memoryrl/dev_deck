-- 메뉴 표시명을 언어별 JSON으로 저장한다. {"ko":"커리어로그","en":"Career log"}
-- 재실행해도 컬럼만 추가하고, 비어 있는 labels만 한글로 채운다.

ALTER TABLE devdeck.menus
  ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN devdeck.menus.labels IS 'Locale display names, e.g. {"ko":"커리어로그","en":"Career log"}';

UPDATE devdeck.menus
SET labels = jsonb_build_object('ko', label)
WHERE labels = '{}'::jsonb OR labels IS NULL;
