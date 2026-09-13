-- 이미 schema.sql을 적용한 프로젝트용. SQL Editor에서 이것만 실행.
DROP POLICY IF EXISTS reviews_select_public ON devdeck.game_reviews;
CREATE POLICY reviews_select_public ON devdeck.game_reviews
  FOR SELECT TO anon, authenticated USING (true);
