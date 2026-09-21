-- 보안 강화 패치 — 보안 점검(2026-09)에서 나온 DB 쪽 보완을 한 번에 적용한다.
-- 재실행해도 안전하다. patch-notifications.sql · patch-share-links.sql 뒤에 실행한다
-- (is_owner_user 를 UUID 고정 방식으로 다시 정의하므로, 알림 패치를 다시 돌렸다면 이 파일도 다시 돌릴 것).
--
--  1) 관리자 판별을 "이메일 문자열"이 아니라 고정된 사용자 UUID 로 (이메일 확인 없는 가입으로 관리자 사칭 방지)
--  2) get_user_emails 를 관리자만 호출하도록 (익명이 이메일을 조회하던 경로 차단)
--  3) 댓글: 전체 IP·사용자 UUID 를 API 로 공개하지 않고, 익명이 API 로 직접 INSERT 하지 못하게
--  4) 로그 테이블(page_views·login_history): 익명 직접 INSERT 차단(서버가 서비스 롤로만 기록)
--  5) 스토리지: 첨부 업로드는 관리자만, 형식·용량 제한, 파일 목록 조회 차단
--  6) 서버리스에서도 유지되는 레이트리밋(rate_limit_hit)
--  7) 앞으로 만드는 함수는 기본적으로 PUBLIC 이 실행하지 못하게

-- ---------------------------------------------------------------------------
-- 1) 관리자 = 고정된 사용자 UUID
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devdeck.app_owner (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE devdeck.app_owner ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE devdeck.app_owner FROM anon, authenticated;
GRANT ALL ON TABLE devdeck.app_owner TO service_role;

-- 지금 관리자 이메일로 가입된 계정을 관리자로 고정한다. (이미 고정돼 있으면 건드리지 않는다.)
INSERT INTO devdeck.app_owner (user_id)
SELECT u.id
FROM auth.users u
WHERE lower(coalesce(u.email, '')) = 'memoryrl@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM devdeck.app_owner)
ORDER BY u.created_at
LIMIT 1;

-- 고정된 관리자가 있으면 그 UUID 만 관리자다. 아직 고정된 행이 없을 때만(=관리자가 한 번도 로그인하지 않은 새 DB)
-- 이전처럼 이메일로 판별하되, 구글로 로그인한 계정만 인정한다.
CREATE OR REPLACE FUNCTION devdeck.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = devdeck, auth
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM devdeck.app_owner)
      THEN EXISTS (SELECT 1 FROM devdeck.app_owner o WHERE o.user_id = auth.uid())
    ELSE lower(coalesce(auth.jwt() ->> 'email', '')) = 'memoryrl@gmail.com'
         AND coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
  END
$$;

GRANT EXECUTE ON FUNCTION devdeck.is_owner() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION devdeck.is_owner_user(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = devdeck, auth
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM devdeck.app_owner)
      THEN EXISTS (SELECT 1 FROM devdeck.app_owner o WHERE o.user_id = uid)
    ELSE EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = uid AND lower(coalesce(u.email, '')) = 'memoryrl@gmail.com'
    )
  END
$$;

REVOKE ALL ON FUNCTION devdeck.is_owner_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION devdeck.is_owner_user(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 2) get_user_emails — 관리자만
--    이 함수는 저장소의 다른 SQL 에 정의가 없었다(운영 DB 에만 있던 함수). 정의를 여기서 확정한다.
--    운영 DB 에 public 스키마 등 다른 곳에 같은 이름의 함수를 만들어 두었다면 그쪽도 지우거나 같은 방식으로 막을 것.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS devdeck.get_user_emails(UUID[]);

CREATE FUNCTION devdeck.get_user_emails(user_ids UUID[])
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = devdeck, auth
AS $$
BEGIN
  IF NOT devdeck.is_owner() THEN
    RAISE EXCEPTION '관리자만 회원 이메일을 조회할 수 있습니다.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT
  FROM auth.users u
  WHERE u.id = ANY (user_ids);
END;
$$;

REVOKE ALL ON FUNCTION devdeck.get_user_emails(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION devdeck.get_user_emails(UUID[]) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) 댓글: IP·사용자 UUID 비공개 + 익명 직접 INSERT 차단
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devdeck.mask_ip(ip TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN ip IS NULL OR ip = '' OR ip = '0.0.0.0' THEN '-'
    WHEN position(':' IN ip) > 0 THEN array_to_string((string_to_array(ip, ':'))[1:3], ':') || ':*'
    WHEN array_length(string_to_array(ip, '.'), 1) = 4 THEN split_part(ip, '.', 1) || '.' || split_part(ip, '.', 2) || '.*.*'
    ELSE '-'
  END
$$;

-- 화면에 보여 줄 가려진 IP. 전체 IP(ip_address)는 서버(서비스 롤)만 읽는다.
ALTER TABLE devdeck.comments ADD COLUMN IF NOT EXISTS ip_masked TEXT NOT NULL DEFAULT '-';

CREATE OR REPLACE FUNCTION devdeck.comments_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck, public
AS $$
BEGIN
  NEW.author_name := left(btrim(NEW.author_name), 40);
  NEW.body := left(btrim(devdeck.mask_profanity(NEW.body)), 20000);
  IF TG_OP = 'INSERT' THEN
    NEW.ip_masked := devdeck.mask_ip(NEW.ip_address);
  END IF;
  RETURN NEW;
END;
$$;

-- 기존 댓글의 가려진 IP 채우기(수정 시각은 바꾸지 않는다)
DO $$
DECLARE
  has_trigger BOOLEAN := EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'devdeck.comments'::regclass AND tgname = 'set_updated_at'
  );
BEGIN
  IF has_trigger THEN
    ALTER TABLE devdeck.comments DISABLE TRIGGER set_updated_at;
  END IF;

  UPDATE devdeck.comments
  SET ip_masked = devdeck.mask_ip(ip_address)
  WHERE ip_masked = '-' AND ip_address IS NOT NULL AND ip_address <> '';

  IF has_trigger THEN
    ALTER TABLE devdeck.comments ENABLE TRIGGER set_updated_at;
  END IF;
END;
$$;

-- anon/authenticated 는 가려진 IP 를 포함한 공개 컬럼만 읽는다(ip_address·user_id 제외).
-- 수정·삭제는 관리자 정책(comments_owner)이 걸러 주고, INSERT 는 서버(서비스 롤)만 한다.
REVOKE ALL ON TABLE devdeck.comments FROM anon, authenticated;
GRANT SELECT (id, target_type, target_id, parent_id, author_name, body, ip_masked, ip_region, is_hidden, created_at, updated_at)
  ON devdeck.comments TO anon, authenticated;
GRANT UPDATE (is_hidden) ON devdeck.comments TO authenticated;
GRANT DELETE ON devdeck.comments TO authenticated;
GRANT ALL ON TABLE devdeck.comments TO service_role;

DROP POLICY IF EXISTS comments_insert ON devdeck.comments;

REVOKE ALL ON FUNCTION devdeck.mask_ip(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION devdeck.mask_ip(TEXT) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) 접속 기록: 서버(서비스 롤)만 기록한다 — 익명이 API 로 직접 넣어 로그를 부풀리거나 위조하지 못하게
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS page_views_insert ON devdeck.page_views;
DROP POLICY IF EXISTS login_history_insert ON devdeck.login_history;
DROP POLICY IF EXISTS login_history_insert_self ON devdeck.login_history;
REVOKE INSERT ON TABLE devdeck.page_views FROM anon, authenticated;
REVOKE INSERT ON TABLE devdeck.login_history FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) 스토리지
-- ---------------------------------------------------------------------------
-- 공개 버킷의 파일은 URL 로 바로 열리므로 SELECT 정책이 없어도 이미지·첨부는 그대로 보인다.
-- SELECT 정책을 없애 "파일 목록 조회"(다른 사람 업로드 파일 나열)를 막는다.
DROP POLICY IF EXISTS "editor-images public read" ON storage.objects;
DROP POLICY IF EXISTS "uploads public read" ON storage.objects;

-- 첨부 업로드는 관리자만(관리자 화면 첨부 기능). 가입만 하면 누구나 올리던 정책을 좁힌다.
DROP POLICY IF EXISTS "uploads owner write" ON storage.objects;
CREATE POLICY "uploads owner write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND devdeck.is_owner()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 이어올리기(TUS)가 자기 폴더를 읽을 수 있어야 하므로 본인 폴더 조회만 허용한다.
DROP POLICY IF EXISTS "uploads owner read" ON storage.objects;
CREATE POLICY "uploads owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 버킷 자체에도 용량·형식 제한을 둔다. SVG·HTML 은 제외 — 공개 버킷에서 열면 스크립트가 실행될 수 있다.
UPDATE storage.buckets
SET file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'editor-images';

UPDATE storage.buckets
SET file_size_limit = 50 * 1024 * 1024,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/zip', 'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp', 'application/vnd.hancom.hwpx',
      'text/plain',
      -- 브라우저가 형식을 못 알아낸 파일(.hwp 등). 내려받기로만 열리고 실행되지 않는다.
      'application/octet-stream'
    ]
WHERE id = 'uploads';

-- ---------------------------------------------------------------------------
-- 6) 레이트리밋(영속) — 서버리스 인스턴스가 바뀌어도 유지된다. 서버(서비스 롤)만 호출한다.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devdeck.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits INT NOT NULL DEFAULT 0
);

ALTER TABLE devdeck.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE devdeck.rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE devdeck.rate_limits TO service_role;

-- 이번 호출을 세고, 창(window) 안에서 한도(limit)를 넘지 않았으면 true 를 돌려준다.
CREATE OR REPLACE FUNCTION devdeck.rate_limit_hit(p_key TEXT, p_limit INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
DECLARE
  v_hits INT;
BEGIN
  INSERT INTO devdeck.rate_limits AS r (key, window_start, hits)
  VALUES (left(p_key, 200), now(), 1)
  ON CONFLICT (key) DO UPDATE
    SET hits = CASE
          WHEN r.window_start + make_interval(secs => p_window_seconds) <= now() THEN 1
          ELSE r.hits + 1
        END,
        window_start = CASE
          WHEN r.window_start + make_interval(secs => p_window_seconds) <= now() THEN now()
          ELSE r.window_start
        END
  RETURNING hits INTO v_hits;

  -- 오래된 행은 가끔 함께 정리한다(별도 크론 없이 테이블이 커지지 않게).
  IF random() < 0.01 THEN
    DELETE FROM devdeck.rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION devdeck.rate_limit_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION devdeck.rate_limit_hit(TEXT, INT, INT) TO service_role;

-- ---------------------------------------------------------------------------
-- 7) 앞으로 이 스키마에 만드는 함수는 기본적으로 PUBLIC(=익명 포함)이 실행하지 못하게 한다.
--    (Postgres 기본값은 PUBLIC 실행 허용이라, SECURITY DEFINER 함수를 만들고 REVOKE 를 잊으면 API 로 호출된다.)
--    필요한 함수에만 GRANT EXECUTE ... 를 명시한다.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA devdeck REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
