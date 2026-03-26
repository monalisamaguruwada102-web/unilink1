-- Fix for Liking Logic: Add explicit increment RPC as fallback
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS allows calls to this RPC
GRANT EXECUTE ON FUNCTION increment_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_likes(UUID) TO anon;
