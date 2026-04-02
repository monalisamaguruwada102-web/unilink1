-- ============================================================
-- NEW FEATURES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Campus Events Table
CREATE TABLE IF NOT EXISTS campus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'hangout',
  event_date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  attendees TEXT[] DEFAULT '{}',
  max_attendees INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campus_events_select" ON campus_events FOR SELECT USING (true);
CREATE POLICY "campus_events_insert" ON campus_events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "campus_events_update" ON campus_events FOR UPDATE USING (true);
CREATE POLICY "campus_events_delete" ON campus_events FOR DELETE USING (auth.uid() = created_by);

-- 2. Story reactions table (for Story Drops enhancement)
CREATE TABLE IF NOT EXISTS story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('fire','heart','wow','haha','sad')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "story_reactions_all" ON story_reactions FOR ALL USING (true);

-- 3. Add interests column to users for VibeScore calculation
ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_tags TEXT[] DEFAULT '{}';

-- ============================================================
-- Done! Now go to the app and the new features are live.
-- ============================================================
