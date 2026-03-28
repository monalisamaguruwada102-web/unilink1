-- 1. Create the missing mark_match_as_read RPC
CREATE OR REPLACE FUNCTION mark_match_as_read(target_match_id UUID, my_id UUID)
RETURNS VOID AS $$
  UPDATE messages
  SET read_at = NOW()
  WHERE match_id = target_match_id
    AND sender_id != my_id
    AND read_at IS NULL;
$$ LANGUAGE SQL SECURITY DEFINER;
