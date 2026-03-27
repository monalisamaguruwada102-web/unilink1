-- ========================================================
-- 🛠️ FIX: ROBUST MUTUAL MATCHING & ORDERED IDS
-- ========================================================
-- This script ensures that any mutual likes result in a match
-- and that IDs are always stored in a predictable order 
-- (Lowest UUID first) to prevent duplicate matches.
-- ========================================================

-- 1. Create a function to auto-create matches from likes
CREATE OR REPLACE FUNCTION public.handle_mutual_match()
RETURNS TRIGGER AS $$
DECLARE
    found_reciprocal BOOLEAN;
    u1 UUID;
    u2 UUID;
BEGIN
    -- Check if the reciprocal like exists
    SELECT EXISTS (
        SELECT 1 FROM public.likes 
        WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
    ) INTO found_reciprocal;

    IF found_reciprocal THEN
        -- Order the UUIDs to ensure uniqueness (Lowest first)
        IF NEW.liker_id < NEW.liked_id THEN
            u1 := NEW.liker_id;
            u2 := NEW.liked_id;
        ELSE
            u1 := NEW.liked_id;
            u2 := NEW.liker_id;
        END IF;

        -- Create the match if it doesn't already exist
        INSERT INTO public.matches (user1_id, user2_id, created_at)
        VALUES (u1, u2, NOW())
        ON CONFLICT (user1_id, user2_id) DO NOTHING;

        -- Push notifications to both students
        INSERT INTO public.notifications (user_id, sender_id, type, content)
        VALUES 
            (NEW.liked_id, NEW.liker_id, 'match', 'IT''S A MUTUAL MATCH! ❤️ Start chatting now in the Matches tab.'),
            (NEW.liker_id, NEW.liked_id, 'match', 'IT''S A MUTUAL MATCH! ❤️ Start chatting now in the Matches tab.');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to the likes table
DROP TRIGGER IF EXISTS tr_on_like_mutual_match ON public.likes;
CREATE TRIGGER tr_on_like_mutual_match
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.handle_mutual_match();

-- 3. Back-fill any existing mutual likes that haven't matched
-- Use a CTE to find all pairs that like each other but aren't in matches
INSERT INTO public.matches (user1_id, user2_id)
SELECT DISTINCT 
    CASE WHEN l1.liker_id < l1.liked_id THEN l1.liker_id ELSE l1.liked_id END as u1,
    CASE WHEN l1.liker_id < l1.liked_id THEN l1.liked_id ELSE l1.liker_id END as u2
FROM public.likes l1
JOIN public.likes l2 ON l1.liker_id = l2.liked_id AND l1.liked_id = l2.liker_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.matches m 
    WHERE (m.user1_id = l1.liker_id AND m.user2_id = l1.liked_id)
       OR (m.user1_id = l1.liked_id AND m.user2_id = l1.liker_id)
)
ON CONFLICT (user1_id, user2_id) DO NOTHING;

-- 🎉 MATCHING FIXED AT THE DATABASE LEVEL
