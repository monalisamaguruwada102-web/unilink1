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
import GroupChat from './pages/GroupChat';
import Admin from './pages/Admin';

import AuthCallback from './pages/AuthCallback';

export default function App() {
  const { session, profile, setSession, fetchProfile, loading } = useAuthStore();
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

    // Feature 16: PWA Install Prompt Capture
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, fetchProfile, fetchFeatures]);

  useEffect(() => {
    // Online Status Heartbeat
    let heartbeatInterval: any;
    if (session?.user?.id) {
       // Update once immediately
       supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);
       
       // Then every 30 seconds
       heartbeatInterval = setInterval(() => {
         supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', session.user.id);
       }, 30000);
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [session?.user?.id]);

  // 📍 Persistent Location Tracking
  useEffect(() => {
    if (!session?.user?.id || !profile?.is_location_enabled) return;

    let watchId: number | null = null;
    let lastUpdate = 0;
    const MIN_UPDATE_INTERVAL = 60000; // 1 minute debounce

    const updateLocation = (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastUpdate < MIN_UPDATE_INTERVAL) return;
      lastUpdate = now;
      supabase.from('users').update({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        location_updated_at: new Date().toISOString(),
      }).eq('id', session.user.id);
    };

    if ('geolocation' in navigator) {
      // Request immediately
      navigator.geolocation.getCurrentPosition(updateLocation, () => {}, {
        enableHighAccuracy: false,
        timeout: 10000,
      });
      // Watch for changes
      watchId = navigator.geolocation.watchPosition(updateLocation, () => {}, {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000,
      });
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [session?.user?.id, profile?.is_location_enabled]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route 
          path="*" 
          element={
            !session ? <Auth /> : <AppLayout isDarkMode={isDarkMode} />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

function AppLayout({ isDarkMode }: { isDarkMode: boolean }) {
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat/') || location.pathname.startsWith('/groups/');

  return (
    <div className={`min-h-screen w-full font-sans transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/community" element={<CommunityHub />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/chat/:matchId" element={<Chat />} />
        <Route path="/groups/:groupId" element={<GroupChat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isChat && <BottomNav />}
    </div>
  );
}
