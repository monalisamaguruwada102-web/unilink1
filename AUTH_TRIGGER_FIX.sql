-- ========================================================
-- 🛠️ FIX: SIGNUP & EMAIL VERIFICATION PROFILE SYNC
-- ========================================================
-- This script ensures that when a user signs up, their profile
-- is automatically created in the 'users' table using the 
-- metadata provided (Name, Department, etc.)
-- ========================================================

-- 1. Ensure the users table has all required columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS college TEXT DEFAULT 'Kwekwe Poly';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Create the Trigger Function with Metadata Mapping
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, department, course, college, avatar_url, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'course', NEW.raw_user_meta_data->>'department'), -- Fallback if needed
    NEW.raw_user_meta_data->>'course',
    COALESCE(NEW.raw_user_meta_data->>'campus', 'Kwekwe Polytechnic'),
    NEW.raw_user_meta_data->>'avatar_url',
    false -- Default to false until email is confirmed (if using custom logic)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Enable RLS and Policies for 'users'
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles" ON public.users;
CREATE POLICY "Public profiles" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can edit own profile" ON public.users;
CREATE POLICY "Users can edit own profile" ON public.users FOR ALL USING (auth.uid() = id);

-- 5. STORAGE BUCKET POLICIES (Fix for signup/onboarding)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.role() = 'authenticated'
);

-- 🎉 FIX APPLIED
