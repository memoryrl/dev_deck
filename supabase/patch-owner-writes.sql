CREATE OR REPLACE FUNCTION devdeck.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'memoryrl@gmail.com'
$$;

GRANT EXECUTE ON FUNCTION devdeck.is_owner() TO anon, authenticated;

DROP POLICY IF EXISTS prompts_insert_own ON devdeck.prompts;
CREATE POLICY prompts_insert_own ON devdeck.prompts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS prompts_update_own ON devdeck.prompts;
CREATE POLICY prompts_update_own ON devdeck.prompts
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS prompts_delete_own ON devdeck.prompts;
CREATE POLICY prompts_delete_own ON devdeck.prompts
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_posts_insert_own ON devdeck.career_posts;
CREATE POLICY career_posts_insert_own ON devdeck.career_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_posts_update_own ON devdeck.career_posts;
CREATE POLICY career_posts_update_own ON devdeck.career_posts
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_posts_delete_own ON devdeck.career_posts;
CREATE POLICY career_posts_delete_own ON devdeck.career_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_skills_insert_own ON devdeck.career_skills;
CREATE POLICY career_skills_insert_own ON devdeck.career_skills
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_skills_update_own ON devdeck.career_skills;
CREATE POLICY career_skills_update_own ON devdeck.career_skills
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS career_skills_delete_own ON devdeck.career_skills;
CREATE POLICY career_skills_delete_own ON devdeck.career_skills
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS reviews_insert_own ON devdeck.game_reviews;
CREATE POLICY reviews_insert_own ON devdeck.game_reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS reviews_update_own ON devdeck.game_reviews;
CREATE POLICY reviews_update_own ON devdeck.game_reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());

DROP POLICY IF EXISTS reviews_delete_own ON devdeck.game_reviews;
CREATE POLICY reviews_delete_own ON devdeck.game_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid() AND devdeck.is_owner());
