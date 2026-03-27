-- ========================================================
-- ⚡ ACTIVE SYNC v2: UNRESTRICTED LIVE MATCHING & INSTANT CHAT
-- ========================================================
-- This updated query fixes the Live Sync limits to allow
-- EVERY member active in the last 5 minutes to appear, 
-- regardless of if you've already matched or liked them.
-- ========================================================

CREATE OR REPLACE FUNCTION get_active_matches(current_uid UUID)
RETURNS SETOF users AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM users
  WHERE id != current_uid
    -- Filter: Active in the last 5 minutes (via the App.tsx 30s heartbeat)
    AND last_seen > (NOW() - INTERVAL '5 minutes')
  ORDER BY last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
