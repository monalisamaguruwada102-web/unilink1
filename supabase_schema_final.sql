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
CREATE POLICY "Anyone can view jobs" ON jobs FOR SELECT USING (true);
CREATE POLICY "Anyone can post jobs" ON jobs FOR INSERT WITH CHECK (true);

-- ENABLE REALTIME on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;

-- ============================================
-- STORAGE BUCKETS (Run these as well!)
-- ============================================
-- NOTE: Create these buckets manually in the Supabase Dashboard
-- under Storage > New Bucket:
--   1. "post-images" (public)
--   2. "avatars"     (public)
-- ============================================

-- SEED DATA (Demo content)
INSERT INTO alerts (type, status, location) VALUES
  ('ZESA', 'Loadshedding: Hall A & B', 'Main Campus'),
  ('WATER', 'No water on 3rd Floor', 'New Hostel')
ON CONFLICT DO NOTHING;

INSERT INTO jobs (title, company, type, salary) VALUES
  ('Math Tutor Needed', 'Student Union', 'Part-time', '$15/hr'),
  ('Library Assistant', 'Campus Lib', 'Campus Gig', '$10/hr')
ON CONFLICT DO NOTHING;

INSERT INTO marketplace (title, price, category) VALUES
  ('Calculus Textbook', '$20', 'Books'),
  ('Mini Fridge', '$45', 'Appliances')
ON CONFLICT DO NOTHING;
