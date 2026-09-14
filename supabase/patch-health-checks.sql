-- Supabase 일일 헬스체크 로그 (Vercel Cron keep-alive). 기존 스키마에 추가할 때 이 파일만 실행.
CREATE TABLE IF NOT EXISTS devdeck.supabase_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok BOOLEAN NOT NULL,
  duration_ms INTEGER,
  auth_ok BOOLEAN,
  auth_status INTEGER,
  db_ok BOOLEAN,
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supabase_health_checks_checked_at
  ON devdeck.supabase_health_checks (checked_at DESC);

ALTER TABLE devdeck.supabase_health_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_read_supabase_health_checks ON devdeck.supabase_health_checks;
CREATE POLICY owner_read_supabase_health_checks
  ON devdeck.supabase_health_checks
  FOR SELECT
  TO authenticated
  USING (devdeck.is_owner());

DROP POLICY IF EXISTS service_role_manage_supabase_health_checks ON devdeck.supabase_health_checks;
CREATE POLICY service_role_manage_supabase_health_checks
  ON devdeck.supabase_health_checks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON TABLE devdeck.supabase_health_checks TO authenticated;
GRANT ALL ON TABLE devdeck.supabase_health_checks TO service_role;
