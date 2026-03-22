-- ============================================
-- STORAGE BUCKETS (SETUP FIRST)
-- ============================================
-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true),
       ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES (Public Access)
DROP POLICY IF EXISTS "Public View" ON storage.objects;
CREATE POLICY "Public View" ON storage.objects FOR SELECT USING (bucket_id IN ('post-images', 'avatars'));

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id IN ('post-images', 'avatars') AND 
  auth.role() = 'authenticated'
);

-- ============================================
-- KWEKWE POLY APP - COMPLETE SCHEMA MIGRATION
-- Run this in the Supabase SQL Editor
-- ============================================

-- USERS TABLE (Extended)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  age INTEGER,
  bio TEXT,
  avatar_url TEXT,
  college TEXT DEFAULT 'Kwekwe Poly',
  course TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  gender TEXT,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can edit own profile" ON users;
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can edit own profile" ON users FOR ALL USING (auth.uid() = id);

-- POSTS TABLE (Instagram-style social posts)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  image_url TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
CREATE POLICY "Anyone can view posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);

-- LIKES TABLE (for swiping / matching)
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liker_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  liked_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(liker_id, liked_id)
);
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
CREATE POLICY "Users can manage own likes" ON likes FOR ALL USING (auth.uid() = liker_id);

-- MATCHES TABLE
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
DROP POLICY IF EXISTS "Users can create matches" ON matches;
CREATE POLICY "Users can view own matches" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Users can create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id);

-- MESSAGES TABLE (Real-time chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Match participants can see messages" ON messages;
DROP POLICY IF EXISTS "Match participants can send messages" ON messages;
CREATE POLICY "Match participants can see messages" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matches WHERE id = match_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
  ));
CREATE POLICY "Match participants can send messages" ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- CONFESSIONS TABLE (Truly anonymous — no user_id stored)
CREATE TABLE IF NOT EXISTS confessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view confessions" ON confessions;
DROP POLICY IF EXISTS "Anyone can post confessions" ON confessions;
CREATE POLICY "Anyone can view confessions" ON confessions FOR SELECT USING (true);
CREATE POLICY "Anyone can post confessions" ON confessions FOR INSERT WITH CHECK (true);

-- STORIES TABLE (24-hour stories)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active stories" ON stories;
DROP POLICY IF EXISTS "Users can post stories" ON stories;
CREATE POLICY "Anyone can view active stories" ON stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "Users can post stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CAMPUS ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view alerts" ON alerts;
CREATE POLICY "Anyone can view alerts" ON alerts FOR SELECT USING (true);

-- MARKETPLACE
CREATE TABLE IF NOT EXISTS marketplace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view marketplace" ON marketplace;
DROP POLICY IF EXISTS "Users can list items" ON marketplace;
CREATE POLICY "Anyone can view marketplace" ON marketplace FOR SELECT USING (true);
CREATE POLICY "Users can list items" ON marketplace FOR INSERT WITH CHECK (auth.uid() = user_id);

-- JOBS
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  type TEXT NOT NULL,
  salary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can post jobs" ON jobs;
CREATE POLICY "Anyone can view jobs" ON jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can post jobs" ON jobs FOR INSERT WITH CHECK (true);

-- ENABLE REALTIME on key tables (Safer approach)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'confessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'alerts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'stories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE stories;
  END IF;
END $$;

-- POST COMMENTS
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view comments" ON post_comments;
DROP POLICY IF EXISTS "Users can post comments" ON post_comments;
CREATE POLICY "Anyone can view comments" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Users can post comments" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'post_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
  END IF;
END $$;

-- STORY VIEWS
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see story views" ON story_views;
DROP POLICY IF EXISTS "Users can record story view" ON story_views;
CREATE POLICY "Users can see story views" ON story_views FOR SELECT USING (true);
CREATE POLICY "Users can record story view" ON story_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- STORY REACTIONS
CREATE TABLE IF NOT EXISTS story_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view story reactions" ON story_reactions;
DROP POLICY IF EXISTS "Users can react to stories" ON story_reactions;
CREATE POLICY "Anyone can view story reactions" ON story_reactions FOR SELECT USING (true);
CREATE POLICY "Users can react to stories" ON story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'story_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE story_reactions;
  END IF;
END $$;

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'like', 'comment', 'match'
  post_id UUID,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can create notifications" ON notifications FOR INSERT WITH CHECK (true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- MIGRATION COMPLETE
