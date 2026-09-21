-- 게시물 공유하기(공유 링크) — 링크를 가진 누구나 / 초대받은 사람만, 접속 이력.
-- 공유 링크는 /share/{key} 로 열리고, 서버가 만료·삭제·방문 횟수·비밀번호를 검증한 뒤 원문을 보여 준다.
-- 모든 읽기·쓰기는 서버(service_role)에서만 한다 — 화면(anon/authenticated)에는 아무 권한도 주지 않는다.
-- 재실행해도 안전하다.

CREATE TABLE IF NOT EXISTS devdeck.share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- /share/{key}. 초대 유형의 부모 행은 key를 쓰지 않는다(초대별 key는 share_invites에 있다).
  key TEXT NOT NULL UNIQUE,
  link_type TEXT NOT NULL CHECK (link_type IN ('public', 'invite')),
  target_type TEXT NOT NULL CHECK (target_type IN ('board_post', 'prompt', 'career', 'game')),
  target_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sub_path TEXT,
  created_by UUID NOT NULL REFERENCES devdeck.profiles(id) ON DELETE CASCADE,
  period_limited BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  -- 비밀번호는 해시로만 저장한다(scrypt). 링크를 만든 사람도 나중에 원문을 다시 볼 수 없다.
  password_hash TEXT,
  visit_limited BOOLEAN NOT NULL DEFAULT false,
  max_visits INT CHECK (max_visits IS NULL OR max_visits > 0),
  visit_count INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 한 사람이 한 게시물에 대해 유형별로 살아 있는 링크는 하나만 둔다(유형을 바꾸면 기존 것은 삭제).
CREATE UNIQUE INDEX IF NOT EXISTS share_links_active_uidx
  ON devdeck.share_links (created_by, target_type, target_id, link_type)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS share_links_target_idx
  ON devdeck.share_links (target_type, target_id);
CREATE INDEX IF NOT EXISTS share_links_created_idx
  ON devdeck.share_links (created_at DESC);

CREATE TABLE IF NOT EXISTS devdeck.share_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES devdeck.share_links(id) ON DELETE CASCADE,
  key TEXT NOT NULL UNIQUE,
  recipient_name TEXT NOT NULL,
  -- COPY: 링크만 복사, EMAIL: 메일 앱, SMS: 문자 앱
  method TEXT NOT NULL DEFAULT 'COPY' CHECK (method IN ('COPY', 'EMAIL', 'SMS')),
  recipient_email TEXT,
  recipient_phone TEXT,
  title TEXT,
  message TEXT,
  read_at TIMESTAMPTZ,
  access_count INT NOT NULL DEFAULT 0,
  last_access_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS share_invites_link_idx ON devdeck.share_invites (link_id);

CREATE TABLE IF NOT EXISTS devdeck.share_access_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES devdeck.share_links(id) ON DELETE CASCADE,
  invite_id UUID REFERENCES devdeck.share_invites(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS share_access_log_link_idx
  ON devdeck.share_access_log (link_id, accessed_at DESC);

ALTER TABLE devdeck.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.share_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.share_access_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE devdeck.share_links, devdeck.share_invites, devdeck.share_access_log
  FROM anon, authenticated;
GRANT ALL ON TABLE devdeck.share_links, devdeck.share_invites, devdeck.share_access_log
  TO service_role;

-- 접속 기록 + 방문 수 증가 + 초대 읽음 처리를 한 번에(원자적으로) 한다.
-- 최대 방문 횟수를 넘겼으면 아무것도 기록하지 않고 false를 돌려준다(동시 접속에도 초과되지 않게).
CREATE OR REPLACE FUNCTION devdeck.share_record_visit(
  p_link UUID,
  p_invite UUID,
  p_ip TEXT,
  p_user_agent TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
BEGIN
  UPDATE devdeck.share_links
  SET visit_count = visit_count + 1
  WHERE id = p_link
    AND deleted_at IS NULL
    AND (NOT visit_limited OR max_visits IS NULL OR visit_count < max_visits);

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO devdeck.share_access_log (link_id, invite_id, ip_address, user_agent)
  VALUES (p_link, p_invite, p_ip, left(p_user_agent, 300));

  IF p_invite IS NOT NULL THEN
    UPDATE devdeck.share_invites
    SET read_at = coalesce(read_at, now()),
        access_count = access_count + 1,
        last_access_at = now()
    WHERE id = p_invite;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION devdeck.share_record_visit(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION devdeck.share_record_visit(UUID, UUID, TEXT, TEXT) TO service_role;

-- 관리자 사이드바에 "공유 링크" 메뉴를 추가한다("운영" 그룹). 이미 있으면 건너뛴다.
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
    SELECT 1 FROM devdeck.menus WHERE location = 'admin' AND href = '/site/shares'
  ) THEN
    INSERT INTO devdeck.menus (parent_id, label, label_key, href, icon, location, view_role, is_active, sort_order)
    VALUES (ops_id, '공유 링크', 'nav.shareLinks', '/site/shares', 'Share2', 'admin', 'owner', true, 15);
  END IF;
END;
$$;
