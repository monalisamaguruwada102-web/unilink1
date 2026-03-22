import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hahxruymubdhbxgwdbmh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhaHhydXltdWJkaGJ4Z3dkYm1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODA5MzQsImV4cCI6MjA4OTY1NjkzNH0.jOR7lPyI176d_D0UtoyaZWGAgUrtWxycV0pcUrjbFWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDatabase() {
  console.log('🔍 Checking Database for Monalisa Maguruwada...');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, age, college')
    .ilike('name', '%Monalisa%');

  if (error) {
    console.error('❌ Error checking users:', error);
  } else {
    console.log(`✅ Found ${users.length} matching students.`);
    users.forEach(u => console.log(`- ${u.name} (${u.college}) ID: ${u.id}`));
  }

  const { data: columns, error: colError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (colError) {
    console.error('❌ Error checking columns:', colError);
  } else if (columns && columns.length > 0) {
    console.log('📊 Column check (First user keys):', Object.keys(columns[0]));
  } else {
     console.log('📊 No users found to check columns.');
  }
}

checkDatabase();
