-- Login + visit history (audit log of OAuth sign-ins AND anonymous page visits).
-- Safe to re-run.
-- 관리자만 조회 가능. event_type='login'은 로그인 콜백(app/auth/callback/route.ts)에서
-- 로그인한 본인 계정으로 직접 insert하고, event_type='visit'은 /api/track-visit에서
-- 회원 여부와 무관하게(비회원 포함) insert한다 — 비회원은 user_id가 NULL이다.

CREATE TABLE IF NOT EXISTS devdeck.login_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  provider TEXT,
  event_type TEXT NOT NULL DEFAULT 'login'
    CHECK (event_type IN ('login', 'visit')),
  ip_address TEXT NOT NULL,
  ip_region TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기존에 이 파일을 이미 실행해 user_id가 NOT NULL이거나 event_type 컬럼이 없는
-- 상태로 테이블이 만들어져 있어도 안전하게 맞춰준다.
ALTER TABLE devdeck.login_history ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE devdeck.login_history ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'login';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'login_history_event_type_check'
  ) THEN
    ALTER TABLE devdeck.login_history
      ADD CONSTRAINT login_history_event_type_check
      CHECK (event_type IN ('login', 'visit'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS login_history_created_idx
  ON devdeck.login_history (created_at DESC);
CREATE INDEX IF NOT EXISTS login_history_user_idx
  ON devdeck.login_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS login_history_event_type_idx
  ON devdeck.login_history (event_type, created_at DESC);

ALTER TABLE devdeck.login_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS login_history_select_owner ON devdeck.login_history;
CREATE POLICY login_history_select_owner ON devdeck.login_history
  FOR SELECT TO authenticated
  USING (devdeck.is_owner());

-- 로그인 기록은 본인 계정으로, 방문 기록은 비회원(anon)도 남길 수 있어야 한다.
-- 비회원 행은 user_id가 반드시 NULL이어야 하고, 회원 행은 자기 자신만 넣을 수 있다.
DROP POLICY IF EXISTS login_history_insert_self ON devdeck.login_history;
DROP POLICY IF EXISTS login_history_insert ON devdeck.login_history;
CREATE POLICY login_history_insert ON devdeck.login_history
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL AND event_type = 'visit')
    OR (user_id = auth.uid())
  );

DROP POLICY IF EXISTS login_history_delete_owner ON devdeck.login_history;
CREATE POLICY login_history_delete_owner ON devdeck.login_history
  FOR DELETE TO authenticated
  USING (devdeck.is_owner());

GRANT ALL ON TABLE devdeck.login_history TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
