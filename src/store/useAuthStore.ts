import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, loading: false }),
  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('id, email, name, age, gender, bio, college, course, avatar_url, latitude, longitude, interests, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (data) set({ profile: data });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
