-- ============================================
-- VIRAL GROWTH & POPULARITY UPGRADE
-- 1. Viral Secret Crush Links
-- 2. Department-Specific Confession Drops
-- ============================================

-- 1. Add crush_id to users for viral links
ALTER TABLE users ADD COLUMN IF NOT EXISTS crush_id TEXT UNIQUE DEFAULT uuid_generate_v4();

-- 2. Upgrade Confessions with Department metadata
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE confessions ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- 3. Create a table for tracked crush links (optional but good for analytics)
CREATE TABLE IF NOT EXISTS crush_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    crush_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, crush_id)
);

-- 4. Viral Notification Logic
-- This triggers a notification to everyone in a department when a confession gets 5 likes (testing) or 50 (production)
CREATE OR REPLACE FUNCTION notify_department_confession()
RETURNS TRIGGER AS $$
BEGIN
    -- When a confession is liked, update the count (handled by application or existing trigger)
    -- This specific trigger checks for popularity milestones
    IF (NEW.likes >= 5 AND OLD.likes < 5 AND NEW.department IS NOT NULL) THEN
        INSERT INTO notifications (user_id, sender_id, type, content)
        SELECT id, NEW.id, 'viral_confession', '🔥 A confession in ' || NEW.department || ' is trending! Check it out.'
        FROM users 
        WHERE department = NEW.department AND id != auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The notifications table requires a sender_id. We'll use the confession's ID as a placeholder 
-- or we'd need to modify the notifications table to allow NULL sender_id.
-- For now, let's modify the notifications table to allow NULL sender_id for system alerts.
ALTER TABLE notifications ALTER COLUMN sender_id DROP NOT NULL;

-- Trigger for viral confessions
DROP TRIGGER IF EXISTS tr_notify_department_confession ON confessions;
CREATE TRIGGER tr_notify_department_confession
AFTER UPDATE OF likes ON confessions
FOR EACH ROW
EXECUTE FUNCTION notify_department_confession();
