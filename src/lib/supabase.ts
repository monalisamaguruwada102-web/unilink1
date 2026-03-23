import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project-url.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  age: number | null;
  gender: string | null;
  bio: string | null;
  college: string | null;
  course: string | null;
  avatar_url: string | null;
  last_seen?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  interests?: string[] | null;
  created_at: string;
  updated_at: string;
};
