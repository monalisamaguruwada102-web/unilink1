-- 1. Secret Admirer (Crush List)
CREATE TABLE IF NOT EXISTS public.crush_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    crush_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, crush_id)
);

-- 2. Verification System
CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    id_card_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Story Polls
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS poll_question TEXT;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS poll_options JSONB; -- e.g. ["Yes", "No"]

CREATE TABLE IF NOT EXISTS public.story_poll_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(story_id, user_id)
);

-- 4. User Meta Updates
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_study_buddy_mode BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS campus_zone TEXT;

-- 5. Voice Notes Table (or column handles in chat)
-- Assuming a 'messages' table exists, we add type 'voice' and 'voice_url'
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS duration INTEGER; -- For voice note length

-- RLS Policies
ALTER TABLE public.crush_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own crush list" ON public.crush_list
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view/create their own verification" ON public.verifications
    FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.story_poll_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see and create poll responses" ON public.story_poll_responses
    FOR ALL USING (true);
