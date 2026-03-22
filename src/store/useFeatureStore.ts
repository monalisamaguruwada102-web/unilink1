import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Story {
  id: string;
  user_id: string;
  user_name: string;
  image_url: string;
  is_viewed: boolean;
  expires_at: string;
}

interface Event {
  id: string;
  title: string;
  location: string;
  date: string;
  attendees: number;
  category: string;
}

interface PollOption {
  label: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
}

interface MarketplaceItem {
  id: string;
  title: string;
  price: string;
  category: string;
  image_url: string;
}

interface Job {
  id: string;
  title: string;
  company: string;
  type: string;
  salary: string;
}

interface CampusAlert {
  id: string;
  type: string;
  status: string;
  time: string;
}

interface Confession {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
}

interface FeatureState {
  isDarkMode: boolean;
  isIncognito: boolean;
  isLurkMode: boolean;
  isStudyMode: boolean;
  isBoosted: boolean;
  boostEndTime: number | null;
  referralPoints: number;
  badges: string[];
  mood: { emoji: string; text: string } | null;
  vibeLabels: string[];
  
  stories: Story[];
  events: Event[];
  currentPoll: Poll | null;
  marketplaceItems: MarketplaceItem[];
  jobs: Job[];
  campusAlerts: CampusAlert[];
  confessions: Confession[];

  toggleDarkMode: () => void;
  setIncognito: (val: boolean) => void;
  setLurkMode: (val: boolean) => void;
  setStudyMode: (val: boolean) => void;
  triggerBoost: () => void;
  setMood: (mood: { emoji: string; text: string }) => void;
  addVibeLabel: (label: string) => void;
  
  // Actions
  voteInPoll: (optionIndex: number) => Promise<void>;
  submitConfession: (content: string, tags: string[]) => Promise<void>;
  joinEvent: (eventId: string) => Promise<void>;
  addStory: (userId: string, userName: string, imageUrl: string) => Promise<void>;
  
  fetchFeatures: () => Promise<void>;
  updateUserProfile: (userId: string, updates: any) => Promise<void>;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  isDarkMode: true,
  isIncognito: false,
  isLurkMode: false,
  isStudyMode: false,
  isBoosted: false,
  boostEndTime: null,
  referralPoints: 120,
  badges: ['Early Adopter', 'Verified Student'],
  mood: { emoji: '📚', text: 'Stressed but blessed' },
  vibeLabels: ['Night Owl', 'Library Resident', 'Coffee Addict'],
  
  stories: [],
  events: [],
  currentPoll: null,
  marketplaceItems: [],
  jobs: [],
  campusAlerts: [],
  confessions: [],

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setIncognito: (val) => set({ isIncognito: val }),
  setLurkMode: (val) => set({ isLurkMode: val }),
  setStudyMode: (val) => set({ isStudyMode: val }),
  
  triggerBoost: () => {
    const endTime = Date.now() + 60 * 60 * 1000;
    set({ isBoosted: true, boostEndTime: endTime });
    setTimeout(() => set({ isBoosted: false, boostEndTime: null }), 60 * 60 * 1000);
  },

  setMood: (mood) => set({ mood }),
  addVibeLabel: (label) => set((state) => ({ vibeLabels: [...state.vibeLabels, label] })),
  
  voteInPoll: async (optionIndex) => {
    const poll = get().currentPoll;
    if (!poll) return;
    const updatedOptions = [...poll.options];
    updatedOptions[optionIndex].votes += 1;
    set({ currentPoll: { ...poll, options: updatedOptions } });
    // Production: update poll_options table
  },

  submitConfession: async (content, tags) => {
    const { data } = await supabase.from('confessions').insert({ content, tags }).select().single();
    if (data) set((state) => ({ confessions: [data, ...state.confessions] }));
  },

  joinEvent: async (eventId) => {
    // Increment attendees
    set((state) => ({
      events: state.events.map(e => e.id === eventId ? { ...e, attendees: e.attendees + 1 } : e)
    }));
  },

  addStory: async (userId, userName, imageUrl) => {
    const { data } = await supabase.from('stories').insert({ user_id: userId, image_url: imageUrl }).select().single();
    if (data) {
      set((state) => ({
        stories: [{ ...data, user_name: userName, is_viewed: false }, ...state.stories]
      }));
    }
  },

  fetchFeatures: async () => {
    const [
      { data: alerts },
      { data: items },
      { data: jobList },
      { data: eventList },
      { data: confessionList },
      { data: storyList }
    ] = await Promise.all([
      supabase.from('alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('marketplace').select('*').limit(6),
      supabase.from('jobs').select('*').limit(10),
      supabase.from('events').select('*'),
      supabase.from('confessions').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('stories').select('*, users(name)')
    ]);

    if (alerts) set({ campusAlerts: alerts });
    if (items) set({ marketplaceItems: items });
    if (jobList) set({ jobs: jobList });
    if (eventList) set({ events: eventList });
    if (confessionList) set({ confessions: confessionList });
    
    if (storyList && storyList.length > 0) {
       set({ stories: storyList.map(s => ({
          ...s,
          user_name: s.users.name,
          is_viewed: false
       }))});
    } else {
       set({ stories: [
         { id: '1', user_id: '1', user_name: 'Nyasha', image_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop', is_viewed: false, expires_at: '' },
         { id: '2', user_id: '2', user_name: 'Tinashe', image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop', is_viewed: false, expires_at: '' }
       ]});
    }

    set({ currentPoll: {
       id: 'poll-1',
       question: 'Best meal at the canteen?',
       options: [
         { label: 'Sadza & Beef', votes: 120 },
         { label: 'Chips & Chicken', votes: 85 },
         { label: 'Beans & Cabbage', votes: 30 }
       ]
    }});

    // ==========================================
    // 🟠 REACTIVE REALTIME ENGINE SUBSCRIPTIONS
    // ==========================================
    const channel = supabase.channel('poly_social_network')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, (payload) => {
        set((state) => ({ 
          confessions: state.confessions.some(c => c.id === payload.new.id) 
            ? state.confessions 
            : [payload.new as Confession, ...state.confessions] 
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        set((state) => ({ 
          campusAlerts: state.campusAlerts.some(a => a.id === payload.new.id)
            ? state.campusAlerts
            : [payload.new as CampusAlert, ...state.campusAlerts] 
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'marketplace' }, (payload) => {
        set((state) => ({ 
          marketplaceItems: state.marketplaceItems.some(i => i.id === payload.new.id)
            ? state.marketplaceItems
            : [payload.new as MarketplaceItem, ...state.marketplaceItems] 
        }));
      });
      
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('⚡ Connected to Kwekwe Poly Realtime Social Network feed!');
      }
    });
  },

  updateUserProfile: async (userId, updates) => {
     await supabase.from('users').update(updates).eq('id', userId);
  }
}));
