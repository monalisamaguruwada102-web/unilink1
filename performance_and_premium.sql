
-- 1. ADD PREMIUM AND VERIFICATION COLUMNS
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- 2. ADD LAST MESSAGE PREVIEW COLUMNS TO MATCHES
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_message_content TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_message_type TEXT;

-- 3. AUTOMATICALLY SYNC LAST MESSAGE TO MATCH TABLE (Performance Optimization)
-- This eliminates N+1 query loop in the frontend
CREATE OR REPLACE FUNCTION update_match_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE matches 
  SET 
    last_message_content = NEW.content,
    last_message_at = NEW.created_at,
    last_message_type = NEW.type
  WHERE id = NEW.match_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_match_last_message ON messages;
CREATE TRIGGER trigger_update_match_last_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_match_last_message();

-- 4. MIGRATE EXISTING DATA (One-time sync for existing messages)
UPDATE matches m
SET 
  last_message_content = msg.content,
  last_message_at = msg.created_at,
  last_message_type = msg.type
FROM (
  SELECT DISTINCT ON (match_id) match_id, content, created_at, type
  FROM messages
  ORDER BY match_id, created_at DESC
) msg
WHERE m.id = msg.match_id;
