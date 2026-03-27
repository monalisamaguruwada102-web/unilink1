-- ========================================================
-- ⚡ COMMUNICATION ENGINE UPGRADE: STATUS & READ RECEIPTS
-- ========================================================
-- This ensures direct messaging and group chats have
-- reliable status delivery and read tracking.
-- ========================================================

-- 1. Upgrade messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 2. Upgrade group_messages table (Consistency)
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

-- 3. Notification system upgrade: store message details for priority delivery
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_id UUID;

-- 4. RPC: Mark all messages in a match as read
CREATE OR REPLACE FUNCTION mark_match_as_read(target_match_id UUID, my_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages 
  SET read_at = NOW()
  WHERE match_id = target_match_id 
    AND sender_id != my_id
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
