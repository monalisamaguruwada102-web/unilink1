-----------------------------------------
-- 20+ NEW FEATURES SCHEMA
-----------------------------------------

-- 1. CAMPUS ALERTS (Feature 7)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'ZESA', 'Laundromat', 'Water', etc.
  status TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view alerts" ON alerts FOR SELECT USING (true);

-- 2. MARKETPLACE (Feature 4)
CREATE TABLE IF NOT EXISTS marketplace (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view marketplace" ON marketplace FOR SELECT USING (true);
CREATE POLICY "Users can add items" ON marketplace FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. JOBS BOARD (Feature 10)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  type TEXT NOT NULL,
  salary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view jobs" ON jobs FOR SELECT USING (true);

-- 4. POLLS (Feature 3)
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  votes INTEGER DEFAULT 0
);
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view polls" ON polls FOR SELECT USING (true);
CREATE POLICY "Anyone can view poll options" ON poll_options FOR SELECT USING (true);

-- 5. ANONYMOUS CONFESSIONS (Feature 2)
CREATE TABLE IF NOT EXISTS confessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view confessions" ON confessions FOR SELECT USING (true);
CREATE POLICY "Anyone can add confessions" ON confessions FOR INSERT WITH CHECK (true);

-- 6. STORIES (Feature 18)
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Users can add stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. EVENTS (Feature 12)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  date TEXT NOT NULL,
  attendees INTEGER DEFAULT 0,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view events" ON events FOR SELECT USING (true);

-- 8. EXPAND USERS TABLE (Mood, Vibe, Boost, Privacy)
ALTER TABLE users ADD COLUMN IF NOT EXISTS mood_emoji TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mood_text TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vibe_labels TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_incognito BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_lurk_mode BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS boost_end_time TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cultural_roots TEXT;

-- 9. VISITOR LOG (Feature 16)
CREATE TABLE IF NOT EXISTS visitor_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own visitors" ON visitor_logs FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Anyone can log a visit" ON visitor_logs FOR INSERT WITH CHECK (auth.uid() = visitor_id);

-----------------------------------------
-- INITIAL DUMMY DATA FOR DEMO PURPOSES
-----------------------------------------

INSERT INTO alerts (type, status, location) VALUES 
('ZESA', 'Loadshedding: Hall A & B', 'Main Campus'),
('WATER', 'No water on 3rd Floor', 'New Hostel')
ON CONFLICT DO NOTHING;

INSERT INTO jobs (title, company, type, salary) VALUES
('Math Tutor Needed', 'Student Union', 'Part-time', '$15/hr'),
('Library Assistant', 'Campus Lib', 'Campus Gig', '$10/hr')
ON CONFLICT DO NOTHING;

INSERT INTO marketplace (title, price, category, image_url) VALUES
('Calculus Textbook', '$20', 'Books', 'https://via.placeholder.com/150'),
('Mini Fridge', '$45', 'Appliances', 'https://via.placeholder.com/150')
ON CONFLICT DO NOTHING;

INSERT INTO events (title, location, date, attendees, category) VALUES
('Tech Meetup', 'Innovation Hub', 'Friday 5PM', 24, 'Academic'),
('Freshers Party', 'Student Center', 'Saturday 8PM', 150, 'Social')
ON CONFLICT DO NOTHING;

