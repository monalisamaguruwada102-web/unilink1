import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY!);

async function checkDiscoverQuery() {
  const myUserId = 'ef80b2e7-3d15-4f03-bd1f-a7848cf9171c'; // Joshua
  
  const { data, error } = await supabase
    .from('users')
    .select('id, name, age, course, bio, avatar_url, college, latitude, longitude, is_study_buddy_mode, department, campus_zone, is_verified, gender, last_seen')
    .neq('id', myUserId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
     console.error("Error:", error);
  } else {
    console.log(`Found ${data.length} users:`);
    console.log(data.map(u => u.name));
  }
}

checkDiscoverQuery();
