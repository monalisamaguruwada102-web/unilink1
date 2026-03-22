import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { useFeatureStore } from './store/useFeatureStore';

// Components
import BottomNav from './components/BottomNav';
import { SOSButton } from './components/features/SafetyAndTheme';

// Pages
import Auth from './pages/Auth';
import Feed from './pages/Feed';
import Discover from './pages/Discover';
import CommunityHub from './pages/CommunityHub';
import Matches from './pages/Matches';
import Chat from './pages/Chat';
import Profile from './pages/Profile';

export default function App() {
  const { session, setSession, fetchProfile, loading } = useAuthStore();
  const { isDarkMode } = useFeatureStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session?.user?.id) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session?.user?.id) fetchProfile(session.user.id);
    });

    // Feature 16: PWA Push Notifications Permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    return () => subscription.unsubscribe();
  }, [setSession, fetchProfile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <div className={`h-screen w-full flex flex-col font-sans transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/community" element={<CommunityHub />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/chat/:matchId" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        
        {/* Feature 5: Safety SOS Button */}
        <SOSButton />

        {/* Render bottom nav conditionally if not in chat */}
        <Routes>
          <Route path="/chat/:matchId" element={null} />
          <Route path="*" element={<BottomNav />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
