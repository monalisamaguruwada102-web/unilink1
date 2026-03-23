
-- 1. ADD LAST SEEN COLUMN TO USERS IF NOT EXISTS
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_seen') THEN
    ALTER TABLE users ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 2. ENABLE REALTIME FOR USERS TABLE (To track online status changes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;
END $$;

-- 3. ENSURE STORAGE POLICIES ARE CORRECT FOR AVATARS
-- (Re-applying just in case to fix the "no longer working" issue)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar Public View" ON storage.objects;
CREATE POLICY "Avatar Public View" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar Authenticated Upload" ON storage.objects;
CREATE POLICY "Avatar Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Avatar Authenticated Update" ON storage.objects;
CREATE POLICY "Avatar Authenticated Update" ON storage.objects FOR UPDATE WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);
