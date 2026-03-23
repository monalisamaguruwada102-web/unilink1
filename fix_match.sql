-- Fixes for the Match and Like System

-- 1. Fix RLS on Likes table
-- Currently, users can only SELECT likes where they are the liker (auth.uid() = liker_id).
-- This breaks the "Who Liked You" screen and the mutual match check.
-- We must allow users to view who liked them.

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Allow users to see likes where they are either the liker or the liked person
DROP POLICY IF EXISTS "Users can view likes targeting them" ON likes;
CREATE POLICY "Users can view likes targeting them" ON likes FOR SELECT USING (auth.uid() = liked_id OR auth.uid() = liker_id);

-- Make sure matches table has correct policies
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow users to view their matches
DROP POLICY IF EXISTS "Users can view own matches" ON matches;
CREATE POLICY "Users can view own matches" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Allow users to create matches involving themselves
DROP POLICY IF EXISTS "Users can create matches" ON matches;
CREATE POLICY "Users can create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Allow users to update their matches (e.g., adding last message info)
DROP POLICY IF EXISTS "Users can update own matches" ON matches;
CREATE POLICY "Users can update own matches" ON matches FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 2. Add last_message_content columns if missing (from performance_and_premium)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='last_message_content') THEN
    ALTER TABLE matches ADD COLUMN last_message_content TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='last_message_at') THEN
    ALTER TABLE matches ADD COLUMN last_message_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matches' AND column_name='last_message_type') THEN
    ALTER TABLE matches ADD COLUMN last_message_type TEXT;
  END IF;
END $$;
