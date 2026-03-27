-- ========================================================
-- ⚡ ACTIVE SYNC: LIVE MATCHING DATABASE LOGIC
-- ========================================================
-- Run this in your Supabase SQL Editor to enable the
-- "Live Sync" discovery mode.
-- ========================================================

-- 1. Create the RPC function to fetch active users
-- This function priorities users who have been seen in the last 5 minutes
-- and filters out anyone you've already liked or matched with.

CREATE OR REPLACE FUNCTION get_active_matches(current_uid UUID)
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM users
  WHERE id != current_uid
    -- Filter: Active in the last 5 minutes
    -- (The App.tsx heartbeat keeps this current)
    AND last_seen > (NOW() - INTERVAL '5 minutes')
    
    -- Filter: Not already liked by you
    AND NOT EXISTS (
      SELECT 1 FROM likes 
      WHERE (liker_id = current_uid AND liked_id = users.id)
    )
    
    -- Filter: Not already in a match with you
    AND NOT EXISTS (
      SELECT 1 FROM matches 
      WHERE (user1_id = current_uid AND user2_id = users.id)
         OR (user1_id = users.id AND user2_id = current_uid)
    )
  ORDER BY last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Verify results (Optional test query)
-- SELECT * FROM get_active_matches('YOUR_USER_ID_HERE');
