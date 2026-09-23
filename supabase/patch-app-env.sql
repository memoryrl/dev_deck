-- 자주 바뀌는 서버용 환경값(터널 URL 등). 공개 site_settings 와 분리한다.
-- 방문객(anon)은 읽지 못하고, 관리자 세션만 읽고 쓴다.
-- 재실행해도 안전하다.
-- 실제 터널 주소는 여기(git에 커밋되는 파일)에 적지 말고 /site/settings 화면에서만 넣는다 —
-- 이 저장소는 공개 저장소라, 여기 적으면 그 순간 누구나 그 주소로 Ollama에 바로 붙을 수 있다.

CREATE TABLE IF NOT EXISTS devdeck.app_env (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_env_key_uidx
  ON devdeck.app_env (key);

ALTER TABLE devdeck.app_env ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_env_owner_all ON devdeck.app_env;
CREATE POLICY app_env_owner_all ON devdeck.app_env
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

REVOKE ALL ON TABLE devdeck.app_env FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE devdeck.app_env TO authenticated, service_role;

-- 행만 만들어 둔다(빈 값) — 재실행해도 /site/settings 에서 이미 넣어 둔 실제 값을 덮어쓰지 않는다.
INSERT INTO devdeck.app_env (key, value, updated_at) VALUES
  ('OLLAMA_BASE_URL', '', now())
ON CONFLICT (key) DO NOTHING;
