-- 사이트 설정(키/값). /site/settings 저장이 이 테이블에 upsert 한다.
-- 재실행해도 안전하다.

CREATE TABLE IF NOT EXISTS devdeck.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS site_settings_key_uidx
  ON devdeck.site_settings (key);

ALTER TABLE devdeck.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_select_public ON devdeck.site_settings;
CREATE POLICY site_settings_select_public ON devdeck.site_settings
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS site_settings_write_owner ON devdeck.site_settings;
CREATE POLICY site_settings_write_owner ON devdeck.site_settings
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

GRANT SELECT ON TABLE devdeck.site_settings TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE devdeck.site_settings TO authenticated, service_role;

INSERT INTO devdeck.site_settings (key, value) VALUES
  ('siteName', 'DevDeck'),
  ('siteDescription', 'AI 프롬프트, 커리어, 게임 리뷰를 기록하는 개인 포트폴리오'),
  ('siteKeywords', 'AI, 프롬프트, 포트폴리오, 게임 리뷰, 커리어'),
  ('footerText', '© 2024 DevDeck. All rights reserved.'),
  ('socialImage', ''),
  ('googleAnalyticsId', ''),
  ('noticePopupMode', 'layer'),
  ('maintenanceMode', 'false')
ON CONFLICT (key) DO NOTHING;
