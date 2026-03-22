import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes('your-service-role')) {
  console.warn("WARNING: SUPABASE_SERVICE_KEY is missing or invalid in server/.env");
}

// Service key bypasses Row Level Security (RLS) entirely.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
