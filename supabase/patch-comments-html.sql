-- 댓글 본문 CKEditor HTML. 기존 DB에 한 번 실행.
ALTER TABLE devdeck.comments DROP CONSTRAINT IF EXISTS comments_body_len;
ALTER TABLE devdeck.comments
  ADD CONSTRAINT comments_body_len CHECK (char_length(body) BETWEEN 1 AND 20000);

CREATE OR REPLACE FUNCTION devdeck.comments_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = devdeck, public
AS $$
BEGIN
  NEW.author_name := left(btrim(NEW.author_name), 40);
  NEW.body := left(btrim(devdeck.mask_profanity(NEW.body)), 20000);
  RETURN NEW;
END;
$$;
