import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY!);

async function checkUsers() {
  const { data, error } = await supabase.from('users').select('id, name, course, gender, is_study_buddy_mode, last_seen');
  if (error) {
     console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkUsers();
