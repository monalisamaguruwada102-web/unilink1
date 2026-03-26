-- ============================================
-- FINAL DATABASE FIXES FOR DISCOVER & COMMUNITIES
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. FIX DISCOVER PAGE (Missing Columns)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_study_buddy_mode BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS latitude DECIMAL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longitude DECIMAL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS campus_zone TEXT;

-- 1.5 FIX COMMUNITY GROUPS (Missing Root Table)
CREATE TABLE IF NOT EXISTS course_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  course TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE course_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view groups" ON course_groups;
CREATE POLICY "Anyone can view groups" ON course_groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth users can create groups" ON course_groups;
CREATE POLICY "Auth users can create groups" ON course_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- 2. FIX COMMUNITY MESSAGING (Missing Table)
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES course_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Security
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

-- Clean old policies if they exist so it doesn't fail
DROP POLICY IF EXISTS "Anyone can view group messages" ON group_messages;
DROP POLICY IF EXISTS "Auth users can send group messages" ON group_messages;

-- Create fresh proper policies
CREATE POLICY "Anyone can view group messages" ON group_messages FOR SELECT USING (true);
CREATE POLICY "Auth users can send group messages" ON group_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable realtime so chats pop up instantly
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
  END IF;
END $$;

-- 3. FIX COMMUNITY MEMBERSHIPS (Missing Table for counts)
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES course_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS for Security
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Clean old policies
DROP POLICY IF EXISTS "Anyone can view group members" ON group_members;
DROP POLICY IF EXISTS "Auth users can join groups" ON group_members;
DROP POLICY IF EXISTS "Auth users can leave groups" ON group_members;

-- Create fresh proper policies
CREATE POLICY "Anyone can view group members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Auth users can join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users can leave groups" ON group_members FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
  END IF;
END $$;

-- 4. FIX MATCHES & MESSAGING (Missing Metadata & Realtime)
-- This ensures the "Conversations" list works perfectly
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS last_message_content TEXT;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS last_message_type TEXT DEFAULT 'text';

-- Ensure messages have a type
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

-- Automate Chat List Updates (TRICK: This updates the matches table so we don't need heavy queries)
CREATE OR REPLACE FUNCTION update_match_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.matches
  SET 
    last_message_content = NEW.content,
    last_message_at = NEW.created_at,
    last_message_type = COALESCE(NEW.type, 'text')
  WHERE id = NEW.match_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
CREATE TRIGGER on_message_sent
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_match_metadata();

-- Enable Realtime for standard messaging
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'matches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- 5. FIX LIKES SYNC (Automatic Counts for all students)
-- This ensures that when ANY student likes a post or confession, the count updates for EVERYONE instantly.

-- A. For Posts
CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.posts SET likes = COALESCE(likes, 0) + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.posts SET likes = GREATEST(0, COALESCE(likes, 0) - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_post_likes ON public.post_likes;
CREATE TRIGGER tr_sync_post_likes
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION sync_post_likes_count();

-- B. For Confessions
CREATE OR REPLACE FUNCTION sync_confession_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.confessions SET likes = COALESCE(likes, 0) + 1 WHERE id = NEW.confession_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.confessions SET likes = GREATEST(0, COALESCE(likes, 0) - 1) WHERE id = OLD.confession_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_confession_likes ON public.confession_reactions;
CREATE TRIGGER tr_sync_confession_likes
  AFTER INSERT OR DELETE ON public.confession_reactions
  FOR EACH ROW EXECUTE FUNCTION sync_confession_likes_count();

-- C. Enable Realtime for the parent tables so UI updates as count changes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE posts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'confessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE confessions;
  END IF;
END $$;

-- MIGRATION COMPLETE
