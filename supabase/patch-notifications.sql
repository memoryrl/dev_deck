-- 사이트 알림(푸시알림) — 회원 가입/탈퇴, 글 등록, 답글.
-- 알림은 DB 트리거가 만든다: 어느 화면·경로로 글이 등록돼도 빠지지 않는다.
-- 앱은 /api/notifications/* 를 통해 (RLS로) 자기 알림만 읽고 읽음 처리한다.
-- 재실행해도 안전하다.
--
-- 선행 조건: devdeck.profiles / boards / board_posts / prompts / career_posts / game_reviews / comments,
-- 회원 가입·탈퇴 알림은 patch-member-events.sql(member_events 테이블)이 먼저 적용되어 있어야 한다.
-- 없는 테이블의 트리거는 건너뛰므로, 나중에 그 테이블을 만든 뒤 이 파일을 다시 실행하면 된다.

CREATE TABLE IF NOT EXISTS devdeck.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 받는 사람. 관리자 공용 알림은 for_owner = true, recipient_id = NULL
  recipient_id UUID REFERENCES devdeck.profiles(id) ON DELETE CASCADE,
  for_owner BOOLEAN NOT NULL DEFAULT false,
  type TEXT NOT NULL CHECK (
    type IN (
      'member_signup',
      'member_withdraw',
      'post_created_admin',
      'post_created_author',
      'post_reply'
    )
  ),
  -- 문구는 저장하지 않는다. 보는 사람의 언어에 맞춰 화면에서 type + 아래 값으로 조립한다.
  actor_name TEXT,
  subject TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_recipient_check CHECK (for_owner OR recipient_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx
  ON devdeck.notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_owner_idx
  ON devdeck.notifications (created_at DESC) WHERE for_owner = true;
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON devdeck.notifications (recipient_id) WHERE read_at IS NULL;

ALTER TABLE devdeck.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON devdeck.notifications;
CREATE POLICY notifications_select_own ON devdeck.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR (for_owner AND devdeck.is_owner()));

DROP POLICY IF EXISTS notifications_update_own ON devdeck.notifications;
CREATE POLICY notifications_update_own ON devdeck.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR (for_owner AND devdeck.is_owner()))
  WITH CHECK (recipient_id = auth.uid() OR (for_owner AND devdeck.is_owner()));

-- 화면에서는 읽음 시각만 바꿀 수 있고 나머지 컬럼과 INSERT/DELETE는 서버(트리거·service_role)만 한다.
REVOKE ALL ON TABLE devdeck.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE devdeck.notifications TO authenticated;
GRANT UPDATE (read_at) ON TABLE devdeck.notifications TO authenticated;
GRANT ALL ON TABLE devdeck.notifications TO service_role;

-- ---------------------------------------------------------------------------
-- 헬퍼
-- ---------------------------------------------------------------------------

-- devdeck.is_owner()와 같은 관리자 기준을 임의의 사용자 id에 적용한다.
-- 주의: patch-security-hardening.sql 이 이 함수를 "고정된 관리자 UUID" 방식으로 다시 정의한다. 이 파일을 다시 실행했다면
-- 보안 강화 패치도 이어서 다시 실행할 것(이 파일의 정의는 이메일 기준이라 더 약하다).
CREATE OR REPLACE FUNCTION devdeck.is_owner_user(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = devdeck, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = uid AND lower(coalesce(u.email, '')) = 'memoryrl@gmail.com'
  )
$$;

CREATE OR REPLACE FUNCTION devdeck.notify_display_name(uid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = devdeck
AS $$
  SELECT coalesce(nullif(p.full_name, ''), nullif(p.username, ''), '회원')
  FROM devdeck.profiles p WHERE p.id = uid
$$;

-- 글 등록 알림: 관리자에게 1건(작성자가 관리자면 생략), 작성자에게 1건.
CREATE OR REPLACE FUNCTION devdeck.push_post_created(
  author UUID, post_title TEXT, link TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
DECLARE
  actor TEXT := devdeck.notify_display_name(author);
BEGIN
  IF NOT devdeck.is_owner_user(author) THEN
    INSERT INTO devdeck.notifications (for_owner, type, actor_name, subject, link_url)
    VALUES (true, 'post_created_admin', actor, post_title, link);
  END IF;

  INSERT INTO devdeck.notifications (recipient_id, type, actor_name, subject, link_url)
  VALUES (author, 'post_created_author', actor, post_title, link);
END;
$$;

-- ---------------------------------------------------------------------------
-- 회원 가입 / 탈퇴 → 관리자
-- member_events는 가입(프로필 INSERT 트리거)과 탈퇴(withdrawAccount)가 모두 남기는 로그다.
-- 탈퇴는 이 행을 먼저 넣은 뒤 계정을 지우므로, 이 시점엔 프로필 이름을 아직 읽을 수 있다.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devdeck.notify_member_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND devdeck.is_owner_user(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO devdeck.notifications (for_owner, type, actor_name, link_url)
  VALUES (
    true,
    CASE NEW.event_type WHEN 'signup' THEN 'member_signup' ELSE 'member_withdraw' END,
    CASE WHEN NEW.user_id IS NULL THEN '회원' ELSE devdeck.notify_display_name(NEW.user_id) END,
    '/site/members'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 알림은 부가 기능이다. 실패해도 원래 동작(글 등록·가입 등)은 막지 않는다.
  RAISE WARNING 'notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('devdeck.member_events') IS NULL THEN
    RAISE NOTICE 'devdeck.member_events 테이블이 아직 없어 notify_on_member_event 트리거를 건너뜁니다. 테이블을 만든 뒤 이 파일을 다시 실행하세요.';
  ELSE
    DROP TRIGGER IF EXISTS notify_on_member_event ON devdeck.member_events;
    CREATE TRIGGER notify_on_member_event
      AFTER INSERT ON devdeck.member_events
      FOR EACH ROW EXECUTE FUNCTION devdeck.notify_member_event();
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 글 등록 → 관리자 + 작성자
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devdeck.notify_board_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
DECLARE
  board_slug TEXT;
BEGIN
  SELECT slug INTO board_slug FROM devdeck.boards WHERE id = NEW.board_id;
  PERFORM devdeck.push_post_created(NEW.user_id, NEW.title, '/b/' || coalesce(board_slug, '') || '/' || NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 알림은 부가 기능이다. 실패해도 원래 동작(글 등록·가입 등)은 막지 않는다.
  RAISE WARNING 'notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('devdeck.board_posts') IS NULL THEN
    RAISE NOTICE 'devdeck.board_posts 테이블이 아직 없어 notify_on_board_post 트리거를 건너뜁니다. 테이블을 만든 뒤 이 파일을 다시 실행하세요.';
  ELSE
    DROP TRIGGER IF EXISTS notify_on_board_post ON devdeck.board_posts;
    CREATE TRIGGER notify_on_board_post
      AFTER INSERT ON devdeck.board_posts
      FOR EACH ROW EXECUTE FUNCTION devdeck.notify_board_post();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION devdeck.notify_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
BEGIN
  PERFORM devdeck.push_post_created(NEW.user_id, NEW.title, '/p/' || NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 알림은 부가 기능이다. 실패해도 원래 동작(글 등록·가입 등)은 막지 않는다.
  RAISE WARNING 'notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('devdeck.prompts') IS NULL THEN
    RAISE NOTICE 'devdeck.prompts 테이블이 아직 없어 notify_on_prompt 트리거를 건너뜁니다. 테이블을 만든 뒤 이 파일을 다시 실행하세요.';
  ELSE
    DROP TRIGGER IF EXISTS notify_on_prompt ON devdeck.prompts;
    CREATE TRIGGER notify_on_prompt
      AFTER INSERT ON devdeck.prompts
      FOR EACH ROW EXECUTE FUNCTION devdeck.notify_prompt();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION devdeck.notify_career_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
BEGIN
  PERFORM devdeck.push_post_created(NEW.user_id, NEW.title, '/work/' || NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 알림은 부가 기능이다. 실패해도 원래 동작(글 등록·가입 등)은 막지 않는다.
  RAISE WARNING 'notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('devdeck.career_posts') IS NULL THEN
    RAISE NOTICE 'devdeck.career_posts 테이블이 아직 없어 notify_on_career_post 트리거를 건너뜁니다. 테이블을 만든 뒤 이 파일을 다시 실행하세요.';
  ELSE
    DROP TRIGGER IF EXISTS notify_on_career_post ON devdeck.career_posts;
    CREATE TRIGGER notify_on_career_post
      AFTER INSERT ON devdeck.career_posts
      FOR EACH ROW EXECUTE FUNCTION devdeck.notify_career_post();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION devdeck.notify_game_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
BEGIN
  PERFORM devdeck.push_post_created(NEW.user_id, NEW.game_title, '/games/' || NEW.app_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 알림은 부가 기능이다. 실패해도 원래 동작(글 등록·가입 등)은 막지 않는다.
  RAISE WARNING 'notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('devdeck.game_reviews') IS NULL THEN
    RAISE NOTICE 'devdeck.game_reviews 테이블이 아직 없어 notify_on_game_review 트리거를 건너뜁니다. 테이블을 만든 뒤 이 파일을 다시 실행하세요.';
  ELSE
    DROP TRIGGER IF EXISTS notify_on_game_review ON devdeck.game_reviews;
    CREATE TRIGGER notify_on_game_review
      AFTER INSERT ON devdeck.game_reviews
      FOR EACH ROW EXECUTE FUNCTION devdeck.notify_game_review();
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 댓글·답글 → 해당 글의 작성자 (본인이 쓴 댓글은 제외)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION devdeck.notify_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck
AS $$
DECLARE
  post_author UUID;
  post_title TEXT;
  link TEXT;
  board_slug TEXT;
BEGIN
  IF NEW.target_type = 'board' THEN
    SELECT bp.user_id, bp.title, b.slug INTO post_author, post_title, board_slug
    FROM devdeck.board_posts bp
    JOIN devdeck.boards b ON b.id = bp.board_id
    WHERE bp.id::text = NEW.target_id;
    link := '/b/' || coalesce(board_slug, '') || '/' || NEW.target_id;
  ELSIF NEW.target_type = 'prompt' THEN
    SELECT p.user_id, p.title INTO post_author, post_title
    FROM devdeck.prompts p WHERE p.id::text = NEW.target_id;
    link := '/p/' || NEW.target_id;
  ELSIF NEW.target_type = 'career' THEN
    SELECT c.user_id, c.title INTO post_author, post_title
    FROM devdeck.career_posts c WHERE c.id::text = NEW.target_id;
    link := '/work/' || NEW.target_id;
  ELSIF NEW.target_type = 'steam' AND NEW.target_id ~ '^[0-9]+$' THEN
    SELECT g.user_id, g.game_title INTO post_author, post_title
    FROM devdeck.game_reviews g WHERE g.app_id = NEW.target_id::int
    ORDER BY g.created_at LIMIT 1;
    link := '/games/' || NEW.target_id;
  END IF;

  IF post_author IS NULL THEN
    RETURN NEW;
  END IF;
  -- 자기 글에 자기가 단 댓글은 알리지 않는다.
  IF NEW.user_id IS NOT NULL AND NEW.user_id = post_author THEN
    RETURN NEW;
  END IF;

  INSERT INTO devdeck.notifications (recipient_id, type, actor_name, subject, link_url)
  VALUES (post_author, 'post_reply', NEW.author_name, post_title, link);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 알림은 부가 기능이다. 실패해도 원래 동작(글 등록·가입 등)은 막지 않는다.
  RAISE WARNING 'notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('devdeck.comments') IS NULL THEN
    RAISE NOTICE 'devdeck.comments 테이블이 아직 없어 notify_on_comment 트리거를 건너뜁니다. 테이블을 만든 뒤 이 파일을 다시 실행하세요.';
  ELSE
    DROP TRIGGER IF EXISTS notify_on_comment ON devdeck.comments;
    CREATE TRIGGER notify_on_comment
      AFTER INSERT ON devdeck.comments
      FOR EACH ROW EXECUTE FUNCTION devdeck.notify_comment();
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 보안: 내부 함수를 API(rpc)로 호출하지 못하게 막는다.
-- Postgres 함수는 기본적으로 PUBLIC(=anon 포함)이 실행할 수 있고, devdeck 스키마는 PostgREST 로 노출되어 있어
-- 아래 SECURITY DEFINER 함수를 막지 않으면 누구나 /rest/v1/rpc/push_post_created 를 불러
-- 다른 사람의 알림함에 임의의 알림(링크 포함)을 넣거나 사용자 이름을 조회할 수 있다.
-- 트리거는 함수 실행 권한을 "만드는 시점"에만 검사하므로 이 회수는 알림 생성에 영향이 없다.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION devdeck.is_owner_user(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION devdeck.notify_display_name(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION devdeck.push_post_created(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION devdeck.notify_member_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION devdeck.notify_board_post() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION devdeck.notify_prompt() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION devdeck.notify_career_post() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION devdeck.notify_game_review() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION devdeck.notify_comment() FROM PUBLIC, anon, authenticated;

-- 알림의 링크는 이 사이트 안의 경로만 허용한다(외부 주소로 보내는 알림 방지).
ALTER TABLE devdeck.notifications DROP CONSTRAINT IF EXISTS notifications_link_check;
ALTER TABLE devdeck.notifications
  ADD CONSTRAINT notifications_link_check
  CHECK (link_url IS NULL OR (link_url LIKE '/%' AND link_url NOT LIKE '//%'));
