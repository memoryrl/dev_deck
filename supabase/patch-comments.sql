-- 댓글(무한 트리) + 욕설 치환 단어. 기존 스키마에 추가할 때 이 파일만 실행.
CREATE TABLE IF NOT EXISTS devdeck.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL
    CHECK (target_type IN ('prompt', 'career', 'board', 'steam')),
  target_id TEXT NOT NULL,
  parent_id UUID REFERENCES devdeck.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES devdeck.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  ip_region TEXT,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT comments_body_len CHECK (char_length(body) BETWEEN 1 AND 20000),
  CONSTRAINT comments_name_len CHECK (char_length(author_name) BETWEEN 1 AND 40)
);

CREATE INDEX IF NOT EXISTS comments_target_idx
  ON devdeck.comments (target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_idx
  ON devdeck.comments (parent_id);

CREATE TABLE IF NOT EXISTS devdeck.profanity_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  replacement TEXT NOT NULL DEFAULT '**',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION devdeck.mask_profanity(input text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = devdeck, public
AS $$
DECLARE
  result text := coalesce(input, '');
  rec record;
  escaped text;
BEGIN
  FOR rec IN
    SELECT word, replacement
    FROM devdeck.profanity_words
    ORDER BY char_length(word) DESC
  LOOP
    escaped := regexp_replace(rec.word, '([!$()*+.:<=>?[\\\]^{|}-])', '\\\1', 'g');
    result := regexp_replace(result, escaped, rec.replacement, 'gi');
  END LOOP;
  RETURN result;
END;
$$;

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

DROP TRIGGER IF EXISTS comments_before_write ON devdeck.comments;
CREATE TRIGGER comments_before_write
  BEFORE INSERT OR UPDATE OF body, author_name ON devdeck.comments
  FOR EACH ROW EXECUTE FUNCTION devdeck.comments_before_write();

DROP TRIGGER IF EXISTS set_updated_at ON devdeck.comments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON devdeck.comments
  FOR EACH ROW EXECUTE FUNCTION devdeck.set_updated_at();

CREATE OR REPLACE FUNCTION devdeck.normalize_profanity_word()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = devdeck, public
AS $$
BEGIN
  NEW.word := lower(btrim(NEW.word));
  IF NEW.replacement IS NULL OR btrim(NEW.replacement) = '' THEN
    NEW.replacement := '**';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_profanity_word ON devdeck.profanity_words;
CREATE TRIGGER normalize_profanity_word
  BEFORE INSERT OR UPDATE ON devdeck.profanity_words
  FOR EACH ROW EXECUTE FUNCTION devdeck.normalize_profanity_word();

INSERT INTO devdeck.profanity_words (word, replacement) VALUES
  ('시발', '**'),
  ('씨발', '**'),
  ('ㅅㅂ', '**'),
  ('ㅂㅅ', '**'),
  ('개새끼', '**'),
  ('병신', '**'),
  ('좆', '**'),
  ('존나', '**'),
  ('fuck', '**'),
  ('shit', '**'),
  ('bitch', '**')
ON CONFLICT (word) DO NOTHING;

ALTER TABLE devdeck.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE devdeck.profanity_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comments_select ON devdeck.comments;
CREATE POLICY comments_select ON devdeck.comments
  FOR SELECT TO anon, authenticated
  USING (is_hidden = false OR devdeck.is_owner());

DROP POLICY IF EXISTS comments_insert ON devdeck.comments;
CREATE POLICY comments_insert ON devdeck.comments
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_hidden = false);

DROP POLICY IF EXISTS comments_owner ON devdeck.comments;
CREATE POLICY comments_owner ON devdeck.comments
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

DROP POLICY IF EXISTS profanity_owner ON devdeck.profanity_words;
CREATE POLICY profanity_owner ON devdeck.profanity_words
  FOR ALL TO authenticated
  USING (devdeck.is_owner())
  WITH CHECK (devdeck.is_owner());

GRANT ALL ON TABLE devdeck.comments TO anon, authenticated, service_role;
GRANT ALL ON TABLE devdeck.profanity_words TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION devdeck.mask_profanity(text) TO anon, authenticated, service_role;
