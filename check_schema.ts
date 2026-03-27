import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_info', { t_name: 'messages' });
  if (error) {
     // fallback to simple select if RPC doesn't exist
     const { data: cols, error: colError } = await supabase.from('messages').select('*').limit(1);
     if (colError) console.error(colError);
     else console.log(Object.keys(cols[0] || {}));
  } else {
    console.log(data);
  }
}

checkSchema();
