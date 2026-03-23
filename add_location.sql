-- Run this in your Supabase SQL Editor to add location support

-- Add location columns to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Allow users to update their own location
-- (DROP first to avoid duplicate policy error)
DROP POLICY IF EXISTS "Users can update own location" ON users;
CREATE POLICY "Users can update own location"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

