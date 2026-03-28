
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testPushTrigger() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('No active session. Please make sure .env is populated with valid VITE_SUPABASE_URL / ANON_KEY.');
    // return;
  }

  console.log('Testing push-notify edge function...');
  
  // We'll try to invoke it. Even if common user_id fails, the invoke should reach the server.
  const { data, error } = await supabase.functions.invoke('push-notify', {
    body: {
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      type: 'call',
      match_id: 'test-match-id',
      message: 'Test Call Trigger! 🎙️',
    }
  });

  if (error) {
    console.error('Push Function Error:', error);
  } else {
    console.log('Push Function Response:', data);
  }
}

testPushTrigger();
