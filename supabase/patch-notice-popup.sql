-- 공지사항 글 중 한 건만 사이트 팝업으로 쓴다.
-- 재실행해도 컬럼·유니크 인덱스는 그대로 둔다.

ALTER TABLE devdeck.board_posts
  ADD COLUMN IF NOT EXISTS is_popup BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN devdeck.board_posts.is_popup IS 'When true, this published notice is shown as a site popup. At most one row.';

CREATE UNIQUE INDEX IF NOT EXISTS board_posts_popup_uidx
  ON devdeck.board_posts ((true))
  WHERE is_popup = true;
