import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { useFeatureStore } from './store/useFeatureStore';

// Components
import BottomNav from './components/BottomNav';

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
  const { isDarkMode, fetchFeatures } = useFeatureStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session?.user?.id) {
         fetchProfile(session.user.id);
         fetchFeatures(); // Populate 20 features data
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session?.user?.id) {
         fetchProfile(session.user.id);
         fetchFeatures(); // Populate 20 features data on state change
      }
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
      <AppLayout isDarkMode={isDarkMode} />
    </BrowserRouter>
  );
}

function AppLayout({ isDarkMode }: { isDarkMode: boolean }) {
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat/');

  return (
    <div className={`min-h-screen w-full font-sans transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/community" element={<CommunityHub />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/chat/:matchId" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isChat && <BottomNav />}
    </div>
  );
}
