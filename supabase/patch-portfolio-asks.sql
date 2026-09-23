-- 포트폴리오 안내 챗 대화 기록. 회원만 쓰고, 본인·관리자만 읽는다.
-- 관리자 사이드바에 목록 메뉴를 추가한다. 재실행해도 안전하다.

CREATE TABLE IF NOT EXISTS devdeck.portfolio_asks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_asks_created_idx
  ON devdeck.portfolio_asks (created_at DESC);

CREATE INDEX IF NOT EXISTS portfolio_asks_user_created_idx
  ON devdeck.portfolio_asks (user_id, created_at DESC);

ALTER TABLE devdeck.portfolio_asks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portfolio_asks_select_own_or_owner ON devdeck.portfolio_asks;
CREATE POLICY portfolio_asks_select_own_or_owner ON devdeck.portfolio_asks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR devdeck.is_owner());

DROP POLICY IF EXISTS portfolio_asks_insert_own ON devdeck.portfolio_asks;
CREATE POLICY portfolio_asks_insert_own ON devdeck.portfolio_asks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON TABLE devdeck.portfolio_asks FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT ON TABLE devdeck.portfolio_asks TO authenticated, service_role;

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
    SELECT 1 FROM devdeck.menus WHERE location = 'admin' AND href = '/site/portfolio-asks'
  ) THEN
    INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order)
    VALUES (ops_id, '포트폴리오 질문', 'nav.portfolioAsks', '/site/portfolio-asks', 'MessageCircle', 'admin', 'owner', true, 19);
  END IF;
END $$;
