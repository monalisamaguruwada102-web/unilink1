-- ========================================================
-- ⚡ ADMIN PRIVILEGES & GROUPS SYNC UPGRADE
-- ========================================================
-- 1. Ensure `course_groups` sync logic connects correctly to all users natively.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'course_groups') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE course_groups;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Ensure post_likes and posts sync logic connects correctly to all users natively.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'post_likes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ========================================================
-- ADVANCED ADMIN RIGHTS (Bypassing restrictive RLS dynamically)
-- Admin commands correctly affect global states and delete traces comprehensively
-- ========================================================

CREATE OR REPLACE FUNCTION admin_delete_post(post_id UUID, admin_id UUID) 
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = admin_id AND email ILIKE '%joshuamujakari15@gmail.com%') THEN
    DELETE FROM posts WHERE id = post_id;
  ELSE
    RAISE EXCEPTION 'Admin clearance required. Action Denied.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_user(target_uid UUID, admin_id UUID) 
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = admin_id AND email ILIKE '%joshuamujakari15@gmail.com%') THEN
    -- Drops them out of standard public user view which cascades into dropping 
    -- posts, likes, messages, memberships natively.
    DELETE FROM users WHERE id = target_uid;
  ELSE
    RAISE EXCEPTION 'Admin clearance required. Action Denied.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_group(target_group_id UUID, admin_id UUID) 
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = admin_id AND email ILIKE '%joshuamujakari15@gmail.com%') THEN
    DELETE FROM course_groups WHERE id = target_group_id;
  ELSE
    RAISE EXCEPTION 'Admin clearance required. Action Denied.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
