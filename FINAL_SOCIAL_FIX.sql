-- 1. FIX USER PROFILE (Location Toggle & Metrics)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_location_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. FIX LIKES COUNTER (Auto-increment likes on posts)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE posts SET likes = COALESCE(likes, 0) + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE posts SET likes = GREATEST(0, COALESCE(likes, 1) - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_post_likes ON post_likes;
CREATE TRIGGER tr_update_post_likes
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- 3. FIX GROUPS RELATIONSHIPS & TABLES
-- If the table exists but is missing creator_id, rename created_by if it exists or add it.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_groups') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_groups' AND column_name = 'creator_id') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_groups' AND column_name = 'created_by') THEN
                ALTER TABLE course_groups RENAME COLUMN created_by TO creator_id;
            ELSE
                ALTER TABLE course_groups ADD COLUMN creator_id UUID REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END IF;
    ELSE
        CREATE TABLE course_groups (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          course TEXT,
          description TEXT,
          creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          member_count INTEGER DEFAULT 1
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID REFERENCES course_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- 5. MENTIONS & REACTIONS
CREATE TABLE IF NOT EXISTS post_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id, emoji)
);

-- RLS POLICIES (Safety)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE course_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can see groups" ON course_groups;
CREATE POLICY "Anyone can see groups" ON course_groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can create groups" ON course_groups;
CREATE POLICY "Authenticated can create groups" ON course_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
