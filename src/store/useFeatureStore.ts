import { create } from 'zustand';

interface Story {
  id: string;
  user_id: string;
  user_name: string;
  image_url: string;
}

interface CampusEvent {
  id: string;
  title: string;
  date: string;
  location: string;
}

interface MarketplaceItem {
  id: string;
  title: string;
  price: string;
  category: 'textbook' | 'gadget' | 'other';
}

interface CampusAlert {
  id: string;
  type: 'ZESA' | 'WATER' | 'OTHER';
  status: string;
  time: string;
}

interface FeatureState {
  // Appearance & Privacy
  isDarkMode: boolean;
  isIncognito: boolean;
  isLurkMode: boolean;
  toggleDarkMode: () => void;
  setIncognito: (val: boolean) => void;
  setLurkMode: (val: boolean) => void;

  // Stories & Events
  stories: Story[];
  events: CampusEvent[];
  
  // Rewards & Badges
  referralPoints: number;
  badges: string[];

  // Study Date Mode
  isStudyMode: boolean;
  setStudyMode: (val: boolean) => void;

  // NEW 20 FEATURES STATES
  mood: { emoji: string; text: string } | null;
  vibeLabels: string[];
  marketplaceItems: MarketplaceItem[];
  campusAlerts: CampusAlert[];
  isBoosted: boolean;
  boostEndTime: number | null;
  visitorLogs: { user_id: string; timestamp: number }[];
  currentPoll: { question: string; options: { label: string; votes: number }[] } | null;
  jobs: { title: string; company: string; type: string }[];
  
  setMood: (mood: { emoji: string; text: string } | null) => void;
  addVibeLabel: (label: string) => void;
  removeVibeLabel: (label: string) => void;
  triggerBoost: () => void;
  voteInPoll: (optionIndex: number) => void;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  isDarkMode: false,
  isIncognito: false,
  isLurkMode: false,
  isStudyMode: false,
  referralPoints: 150,
  badges: ['Early Adopter', 'Campus Star'],
  
  stories: [
    { id: '1', user_id: '1', user_name: 'Nyasha', image_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop' },
    { id: '2', user_id: '2', user_name: 'Tinashe', image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop' },
    { id: '3', user_id: '3', user_name: 'Farai', image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop' },
  ],

  events: [
    { id: '1', title: 'Friday Night Mixer', date: 'Tonight, 19:00', location: 'Student Union' },
    { id: '2', title: 'Group Study: Math 101', date: 'Sat, 10:00', location: 'Library Level 3' },
  ],

  // INITIAL NEW STATES
  mood: { emoji: '📚', text: 'Stressed but blessed' },
  vibeLabels: ['Night Owl', 'Library Resident'],
  marketplaceItems: [
    { id: '1', title: 'Intro to Algorithms (New)', price: '$15', category: 'textbook' },
    { id: '2', title: 'iPhone 12 Case', price: '$5', category: 'gadget' },
  ],
  campusAlerts: [
    { id: '1', type: 'ZESA', status: 'Loadshedding: Hall A & B', time: '14:00 - 18:00' },
  ],
  isBoosted: false,
  boostEndTime: null,
  visitorLogs: [],
  currentPoll: {
    question: "Best meal at the canteen?",
    options: [
      { label: "Sadza & Beef", votes: 45 },
      { label: "Chips & Chicken", votes: 32 },
      { label: "Beans & Cabbage", votes: 12 },
    ]
  },
  jobs: [
    { title: "Lab Assistant", company: "CS Department", type: "Part-time" },
    { title: "Campus Barista", company: "Brew & Co", type: "Shift-based" },
  ],

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setIncognito: (val) => set({ isIncognito: val }),
  setLurkMode: (val) => set({ isLurkMode: val }),
  setStudyMode: (val) => set({ isStudyMode: val }),
  setMood: (mood) => set({ mood }),
  addVibeLabel: (label) => set((state) => ({ vibeLabels: [...state.vibeLabels, label] })),
  removeVibeLabel: (label) => set((state) => ({ vibeLabels: state.vibeLabels.filter(l => l !== label) })),
  triggerBoost: () => set({ isBoosted: true, boostEndTime: Date.now() + 3600000 }),
  voteInPoll: (idx) => set((state) => {
    if (!state.currentPoll) return state;
    const newOptions = [...state.currentPoll.options];
    newOptions[idx].votes += 1;
    return { currentPoll: { ...state.currentPoll, options: newOptions } };
  }),
}));
