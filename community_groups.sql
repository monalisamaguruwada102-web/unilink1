-- Community Groups Schema
CREATE TABLE IF NOT EXISTS course_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  course TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE course_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view groups" ON course_groups;
DROP POLICY IF EXISTS "Users can create groups" ON course_groups;
CREATE POLICY "Anyone can view groups" ON course_groups FOR SELECT USING (true);
CREATE POLICY "Users can create groups" ON course_groups FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES course_groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view group messages" ON group_messages;
DROP POLICY IF EXISTS "Users can send group messages" ON group_messages;
CREATE POLICY "Anyone can view group messages" ON group_messages FOR SELECT USING (true);
CREATE POLICY "Users can send group messages" ON group_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable real-time for group messages and groups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'course_groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE course_groups;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
  END IF;
END $$;
