-- ============================================
-- SOCIAL FEATURES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 0. Allow updating confession counters (likes, comment_count)
DROP POLICY IF EXISTS "Anyone can update confession counters" ON confessions;
CREATE POLICY "Anyone can update confession counters" ON confessions FOR UPDATE USING (true);

-- 1. CONFESSION REACTIONS (like/react to anonymous confessions)
CREATE TABLE IF NOT EXISTS confession_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(confession_id, user_id)
);
ALTER TABLE confession_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view confession reactions" ON confession_reactions;
DROP POLICY IF EXISTS "Users can react to confessions" ON confession_reactions;
DROP POLICY IF EXISTS "Users can update own confession reactions" ON confession_reactions;
DROP POLICY IF EXISTS "Users can delete own confession reactions" ON confession_reactions;

CREATE POLICY "Anyone can view confession reactions" ON confession_reactions FOR SELECT USING (true);
CREATE POLICY "Users can react to confessions" ON confession_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own confession reactions" ON confession_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own confession reactions" ON confession_reactions FOR DELETE USING (auth.uid() = user_id);

-- 2. CONFESSION COMMENTS (discuss confessions)
CREATE TABLE IF NOT EXISTS confession_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE confession_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view confession comments" ON confession_comments;
DROP POLICY IF EXISTS "Users can post confession comments" ON confession_comments;

CREATE POLICY "Anyone can view confession comments" ON confession_comments FOR SELECT USING (true);
CREATE POLICY "Users can post confession comments" ON confession_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. REALTIME for new tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'confession_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE confession_reactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'confession_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE confession_comments;
  END IF;
END $$;

-- 4. ADD likes count column to confessions for fast count display
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- 5. ENSURE campus_polls has creator_id for notification targeting
ALTER TABLE campus_polls ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 6. Increment likes RPC (for post likes fallback)
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_likes(UUID) TO anon;

-- 7. RLS policies for campus_polls (ensure update works)
DROP POLICY IF EXISTS "Anyone can view polls" ON campus_polls;
DROP POLICY IF EXISTS "Users can create polls" ON campus_polls;
DROP POLICY IF EXISTS "Anyone can update polls" ON campus_polls;
CREATE POLICY "Anyone can view polls" ON campus_polls FOR SELECT USING (true);
CREATE POLICY "Users can create polls" ON campus_polls FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Anyone can update polls" ON campus_polls FOR UPDATE USING (true);

-- MIGRATION COMPLETE
