-- Member signup/withdraw event log so charts survive auth.users CASCADE delete.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS devdeck.member_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'withdraw')),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_events_type_created_idx
  ON devdeck.member_events (event_type, created_at);

ALTER TABLE devdeck.member_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_events_select_owner ON devdeck.member_events;
CREATE POLICY member_events_select_owner ON devdeck.member_events
  FOR SELECT TO authenticated
  USING (devdeck.is_owner());

GRANT ALL ON TABLE devdeck.member_events TO anon, authenticated, service_role;

-- 관리자 회원 목록이 본인 프로필만 보이지 않도록
DROP POLICY IF EXISTS profiles_select_owner ON devdeck.profiles;
CREATE POLICY profiles_select_owner ON devdeck.profiles
  FOR SELECT TO authenticated
  USING (devdeck.is_owner());

CREATE OR REPLACE FUNCTION devdeck.record_profile_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
BEGIN
  INSERT INTO devdeck.member_events (event_type, user_id, created_at)
  VALUES ('signup', NEW.id, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_events_on_profile_insert ON devdeck.profiles;
CREATE TRIGGER member_events_on_profile_insert
  AFTER INSERT ON devdeck.profiles
  FOR EACH ROW EXECUTE FUNCTION devdeck.record_profile_signup();

-- 이미 있는 프로필은 트리거가 안 도므로 auth.users.created_at 기준으로 한 번 채운다
INSERT INTO devdeck.member_events (event_type, user_id, created_at)
SELECT 'signup', p.id, COALESCE(u.created_at, now())
FROM devdeck.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE NOT EXISTS (
  SELECT 1
  FROM devdeck.member_events e
  WHERE e.event_type = 'signup' AND e.user_id = p.id
);
