-- Run this in Supabase SQL Editor

-- 1. course_groups table
CREATE TABLE IF NOT EXISTS course_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  course TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. group_messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES course_groups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES course_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 4. RLS
ALTER TABLE course_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view groups" ON course_groups;
CREATE POLICY "Anyone can view groups" ON course_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can create groups" ON course_groups;
CREATE POLICY "Auth users can create groups" ON course_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Anyone can view group messages" ON group_messages;
CREATE POLICY "Anyone can view group messages" ON group_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can send group messages" ON group_messages;
CREATE POLICY "Auth users can send group messages" ON group_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Anyone can view group members" ON group_members;
CREATE POLICY "Anyone can view group members" ON group_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can join groups" ON group_members;
CREATE POLICY "Auth users can join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth users can leave groups" ON group_members;
CREATE POLICY "Auth users can leave groups" ON group_members FOR DELETE USING (auth.uid() = user_id);

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
