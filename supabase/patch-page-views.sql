-- Page view detail per login/visit session. Safe to re-run.
-- devdeck.login_history 한 행(세션)마다 방문한 페이지 경로를 여기 쌓는다.
-- 세션 식별자는 새로 안 만들고 login_history.id를 그대로 쓴다(쿠키 dd_visit_id에 저장).
-- 자세한 설계 근거는 docs/10-login-history.md 참고.

CREATE TABLE IF NOT EXISTS devdeck.page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES devdeck.login_history(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_views_visit_idx
  ON devdeck.page_views (visit_id, created_at);

ALTER TABLE devdeck.page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS page_views_select_owner ON devdeck.page_views;
CREATE POLICY page_views_select_owner ON devdeck.page_views
  FOR SELECT TO authenticated
  USING (devdeck.is_owner());

-- visit_id가 실제 login_history 행을 가리키는지는 FK가 강제한다. 비회원도 자기
-- 세션의 페이지뷰는 남겨야 하므로 anon도 허용한다.
DROP POLICY IF EXISTS page_views_insert ON devdeck.page_views;
CREATE POLICY page_views_insert ON devdeck.page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS page_views_delete_owner ON devdeck.page_views;
CREATE POLICY page_views_delete_owner ON devdeck.page_views
  FOR DELETE TO authenticated
  USING (devdeck.is_owner());

GRANT ALL ON TABLE devdeck.page_views TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
