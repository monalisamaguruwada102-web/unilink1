-- =====================================================
-- CREATE DATABASE WEBHOOK FOR PUSH NOTIFICATIONS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable pg_net extension (needed to fire HTTP calls from triggers)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the webhook trigger function
CREATE OR REPLACE FUNCTION notify_push_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  function_url TEXT;
BEGIN
  function_url := 'https://gfmespcxzdyagxhzprrx.supabase.co/functions/v1/push-notify';

  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'type', NEW.type,
      'content', NEW.content,
      'match_id', NEW.post_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to notifications table
DROP TRIGGER IF EXISTS tr_push_notify ON notifications;
CREATE TRIGGER tr_push_notify
AFTER INSERT ON notifications
FOR EACH ROW EXECUTE FUNCTION notify_push_on_insert();
