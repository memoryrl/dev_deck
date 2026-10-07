-- 글이 삭제되면 그 글을 가리키는 알림(글 등록·답글)도 함께 지운다. 안 지우면 알림을 눌렀을 때 404가 된다.
-- 재실행해도 안전하다. ※ 실행 전에 아래 [2] 고아 알림 정리는 SELECT로 먼저 확인할 것.

-- [1] 삭제 트리거 ------------------------------------------------------------
CREATE OR REPLACE FUNCTION devdeck.purge_notifications_for_deleted_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck, public
AS $$
BEGIN
  -- 링크 끝이 삭제된 글의 id인 알림: /p/<id>, /work/<id>, /b/<slug>/<id>
  DELETE FROM devdeck.notifications WHERE link_url LIKE '%/' || OLD.id::text;
  RETURN OLD;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['prompts', 'career_posts', 'board_posts'] LOOP
    IF to_regclass('devdeck.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS purge_notifications_on_delete ON devdeck.%I', t);
    EXECUTE format(
      'CREATE TRIGGER purge_notifications_on_delete AFTER DELETE ON devdeck.%I
         FOR EACH ROW EXECUTE FUNCTION devdeck.purge_notifications_for_deleted_post()', t);
  END LOOP;
END $$;

-- [2] 이미 남은 고아 알림 확인 → 정리 -----------------------------------------
-- 먼저 SELECT로 지워질 행을 확인한다.
SELECT n.id, n.type, n.subject, n.link_url, n.created_at
FROM devdeck.notifications n
WHERE n.link_url ~* '^/(p|work)/[0-9a-f-]{36}$'
  AND NOT EXISTS (SELECT 1 FROM devdeck.prompts p WHERE n.link_url = '/p/' || p.id::text)
  AND NOT EXISTS (SELECT 1 FROM devdeck.career_posts c WHERE n.link_url = '/work/' || c.id::text)
UNION ALL
SELECT n.id, n.type, n.subject, n.link_url, n.created_at
FROM devdeck.notifications n
WHERE n.link_url ~* '^/b/[^/]+/[0-9a-f-]{36}$'
  AND NOT EXISTS (SELECT 1 FROM devdeck.board_posts b WHERE n.link_url LIKE '%/' || b.id::text);

-- 확인 후 아래를 실행한다.
-- DELETE FROM devdeck.notifications n
-- WHERE (n.link_url ~* '^/(p|work)/[0-9a-f-]{36}$'
--        AND NOT EXISTS (SELECT 1 FROM devdeck.prompts p WHERE n.link_url = '/p/' || p.id::text)
--        AND NOT EXISTS (SELECT 1 FROM devdeck.career_posts c WHERE n.link_url = '/work/' || c.id::text))
--    OR (n.link_url ~* '^/b/[^/]+/[0-9a-f-]{36}$'
--        AND NOT EXISTS (SELECT 1 FROM devdeck.board_posts b WHERE n.link_url LIKE '%/' || b.id::text));
