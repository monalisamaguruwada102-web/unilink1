-- ============================================
-- SYNC & PERSISTENCE FIXES
-- ============================================

-- 0. ENSURE POSTS TABLE HAS LIKES COLUMN
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='likes') THEN
    ALTER TABLE posts ADD COLUMN likes INTEGER DEFAULT 0;
  END IF;
END $$;

-- 0.1 STORAGE BUCKETS & POLICIES
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true),
       ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public View" ON storage.objects;
CREATE POLICY "Public View" ON storage.objects FOR SELECT USING (bucket_id IN ('post-images', 'avatars'));

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('post-images', 'avatars') AND 
  auth.role() = 'authenticated'
);

-- 1. POST LIKES TABLE (Robust liking)
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ENABLE REALTIME FOR ALL SOCIAL TABLES
DO $$
BEGIN
  -- Posts
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;
  -- Post Likes
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'post_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
  END IF;
  -- Profile Likes
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE likes;
  END IF;
  -- Matches
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'matches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  END IF;
  -- Messages
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- PREVENT DUPLICATE MATCHES (Strict)
-- We use a function to ensure (user_a, user_b) and (user_b, user_a) are treated as the same
CREATE OR REPLACE FUNCTION check_duplicate_match()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM matches 
    WHERE (user1_id = NEW.user1_id AND user2_id = NEW.user2_id)
       OR (user1_id = NEW.user2_id AND user2_id = NEW.user1_id)
  ) THEN
    RETURN NULL; -- Don't insert
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_duplicate_match ON matches;
CREATE TRIGGER trigger_check_duplicate_match
BEFORE INSERT ON matches
FOR EACH ROW EXECUTE FUNCTION check_duplicate_match();

-- Enable RLS for post_likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can see post likes" ON post_likes;
CREATE POLICY "Anyone can see post likes" ON post_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- 2. AUTOMATIC POST LIKE COUNTING (SQL Trigger)
-- This ensures "liking a post counts to everyone" accurately
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE posts SET likes = likes - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;
CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- 3. ENHANCED NOTIFICATIONS (For profiling likes)
-- Ensure notifications can be created for profile likes
DROP POLICY IF EXISTS "Anyone can create notifications" ON notifications;
CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- 4. ENABLE REALTIME ON NEW TABLES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'post_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
  END IF;
END $$;

-- 5. ENSURE MATCHES ARE PROPERLY NOTIFIED
-- (We'll handle this in the app logic, but the schema is ready)
