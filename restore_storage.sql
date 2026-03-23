-- 1. ENSURE BUCKETS EXIST
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. SELECT POLICIES (Public View)
DROP POLICY IF EXISTS "Post Images public view" ON storage.objects;
CREATE POLICY "Post Images public view" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'post-images');

DROP POLICY IF EXISTS "Stories public view" ON storage.objects;
CREATE POLICY "Stories public view" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'stories');

-- 3. INSERT POLICIES (Authenticated Upload)
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
CREATE POLICY "Authenticated users can upload post images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
CREATE POLICY "Authenticated users can upload stories" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');

-- 4. UPDATE/DELETE (User managed)
DROP POLICY IF EXISTS "Users can manage own post images" ON storage.objects;
CREATE POLICY "Users can manage own post images" 
ON storage.objects FOR ALL 
USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can manage own stories" ON storage.objects;
CREATE POLICY "Users can manage own stories" 
ON storage.objects FOR ALL 
USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
