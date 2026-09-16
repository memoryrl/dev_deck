-- Community board permissions. Safe to re-run.
-- 공지: 글은 관리자, 댓글은 회원 이상
-- 자유게시판: 글·댓글 회원 이상
-- 관리자는 RLS에서 이미 모든 글 UPDATE/DELETE 가능

ALTER TABLE devdeck.boards
  ADD COLUMN IF NOT EXISTS comment_role TEXT NOT NULL DEFAULT 'visitor';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'boards_comment_role_check'
  ) THEN
    ALTER TABLE devdeck.boards
      ADD CONSTRAINT boards_comment_role_check
      CHECK (comment_role IN ('visitor', 'member', 'owner'));
  END IF;
END $$;

UPDATE devdeck.boards
SET write_role = 'owner', comment_role = 'member'
WHERE slug = 'notice';

UPDATE devdeck.boards
SET write_role = 'member', comment_role = 'member'
WHERE slug = 'free';

DROP POLICY IF EXISTS comments_insert ON devdeck.comments;
CREATE POLICY comments_insert ON devdeck.comments
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    is_hidden = false
    AND (
      target_type <> 'board'
      OR EXISTS (
        SELECT 1
        FROM devdeck.board_posts p
        JOIN devdeck.boards b ON b.id = p.board_id
        WHERE p.id::text = target_id
          AND b.is_active
          AND devdeck.role_at_least(COALESCE(b.comment_role, 'visitor'))
      )
    )
  );

NOTIFY pgrst, 'reload schema';
