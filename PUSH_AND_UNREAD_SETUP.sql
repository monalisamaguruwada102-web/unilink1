-- =====================================================
-- PUSH NOTIFICATIONS & UNREAD COUNTS MIGRATION
-- =====================================================

-- 1. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- 2. RPC: Get unread message counts per match for current user
CREATE OR REPLACE FUNCTION get_unread_counts(my_id UUID)
RETURNS TABLE(match_id UUID, unread_count BIGINT) AS $$
  SELECT m.match_id, COUNT(m.id) AS unread_count
  FROM messages m
  WHERE m.sender_id != my_id
    AND m.read_at IS NULL
    AND m.match_id IN (
      SELECT id FROM matches
      WHERE user1_id = my_id OR user2_id = my_id
    )
  GROUP BY m.match_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 3. Ensure messages has read_at column (may already exist from COMMUNICATION_UPGRADE.sql)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 4. Realtime for push_subscriptions (admin reads)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'push_subscriptions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE push_subscriptions;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
