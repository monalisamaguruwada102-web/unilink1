import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import ProfileCard from '../components/ProfileCard';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, Sparkles, Zap, GraduationCap, X } from 'lucide-react';

export default function Discover() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuthStore();
  const { isDarkMode, isStudyMode, setStudyMode, isBoosted, triggerBoost, boostEndTime } = useFeatureStore();
  const [showMatchOverlay, setShowMatchOverlay] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    fetchProfiles();
  }, [isStudyMode]);

  useEffect(() => {
    if (isBoosted && boostEndTime) {
      const interval = setInterval(() => {
        const remaining = boostEndTime - Date.now();
        if (remaining <= 0) {
           clearInterval(interval);
           setTimeLeft('');
        } else {
           const mins = Math.floor(remaining / 60000);
           const secs = Math.floor((remaining % 60000) / 1000);
           setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isBoosted, boostEndTime]);

  const fetchProfiles = async () => {
    setLoading(true);
    let query = supabase
      .from('users')
      .select('*');

    if (session) {
      query = query.neq('id', session.user.id);
    }
    
    if (isStudyMode) {
      query = query.not('course', 'is', null);
    }

    const { data } = await query;
    if (data) setProfiles(data);
    setLoading(false);
  };

  const handleLike = async (profileId: string) => {
    if (!session) return;
    const { data } = await supabase
      .from('matches')
      .insert({
        user_id_1: session.user.id,
        user_id_2: profileId,
        status: 'pending'
      })
      .select();

    if (data) {
      setShowMatchOverlay(true);
      setTimeout(() => setShowMatchOverlay(false), 3000);
    }
    setProfiles(prev => prev.filter(p => p.id !== profileId));
  };

  return (
    <div className={`flex-1 flex flex-col pt-10 pb-32 transition-colors duration-500 overflow-hidden ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50'}`}>
      <header className="px-6 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Discover</h1>
          <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">{isStudyMode ? 'Study Mode' : 'Date Mode'}</p>
        </div>
        
        <div className="flex gap-3">
           {/* Feature 15: Profile Boost */}
           <button 
             onClick={triggerBoost}
             disabled={isBoosted}
             className={`px-5 py-3 rounded-2xl border transition-all flex items-center gap-3 group shadow-xl ${isBoosted ? 'bg-yellow-400 border-yellow-300 text-black' : isDarkMode ? 'bg-gray-900 border-gray-800 text-yellow-500' : 'bg-white border-white text-yellow-600'}`}
           >
             <Zap size={20} fill={isBoosted ? "currentColor" : "none"} className={isBoosted ? "animate-pulse" : "group-hover:rotate-12 transition-transform"} />
             <span className="text-[10px] font-black uppercase tracking-widest">{isBoosted ? timeLeft : 'Boost'}</span>
           </button>

           <button 
             onClick={() => setStudyMode(!isStudyMode)}
             className={`w-14 h-14 rounded-2xl flex items-center justify-center transition shadow-xl ${isStudyMode ? 'bg-primary-500 text-white shadow-primary-500/20' : isDarkMode ? 'bg-gray-900 border border-gray-800 text-gray-400' : 'bg-white text-gray-400 border-white'}`}
           >
             <GraduationCap size={28} />
           </button>
        </div>
      </header>

      <div className="flex-1 relative px-6 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center">
            <RefreshCcw className="animate-spin text-primary-500 mb-6" size={48} />
            <p className="font-black text-[10px] tracking-[0.3em] uppercase opacity-40 animate-pulse">Scanning Campus...</p>
          </div>
        ) : profiles.length > 0 ? (
          <div className="w-full max-w-[340px] h-[500px] relative">
            <AnimatePresence mode="popLayout">
              {profiles.slice(0, 3).map((profile, i) => (
                <motion.div
                  key={profile.id}
                  initial={{ scale: 0.9, opacity: 0, y: 50 }}
                  animate={{ 
                    scale: 1 - i * 0.05, 
                    opacity: 1 - i * 0.2, 
                    y: -i * 15,
                    rotate: i % 2 === 0 ? i * 2 : -i * 2
                  }}
                  exit={{ x: 500, opacity: 0, rotate: 45, transition: { duration: 0.5 } }}
                  className="absolute inset-0"
                  style={{ zIndex: profiles.length - i }}
                >
                  <ProfileCard
                    profile={profile}
                    onLike={() => handleLike(profile.id)}
                    onPass={() => setProfiles(prev => prev.filter(p => p.id !== profile.id))}
                    onCrush={() => handleLike(profile.id)}
                  />
                </motion.div>
              )).reverse()}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center flex flex-col items-center p-10 bg-white dark:bg-gray-900 rounded-[4rem] shadow-2xl border border-white dark:border-gray-800">
            <div className="w-24 h-24 rounded-[3rem] bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-500 mb-8 shadow-inner">
               <Sparkles size={48} />
            </div>
            <h2 className="text-3xl font-black mb-3 tracking-tighter">That's everyone!</h2>
            <p className="text-xs font-bold opacity-40 mb-10 uppercase tracking-widest leading-relaxed px-4">You've reached the end of the campus for today. Check back later!</p>
            <button
               onClick={fetchProfiles}
               className="w-full py-5 bg-primary-500 text-white font-black rounded-3xl shadow-2xl shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 text-xs uppercase tracking-[0.3em]"
            >
               <RefreshCcw size={22} className="animate-spin-slow" />
               Refresh Feed
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showMatchOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/90 backdrop-blur-2xl p-10"
          >
            <div className="text-center text-white max-w-sm">
              <div className="flex justify-center -space-x-12 mb-12">
                 <div className="w-36 h-36 rounded-[3rem] border-4 border-white overflow-hidden shadow-2xl rotate-[-8deg] relative z-10">
                    <img src={session?.user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop"} className="w-full h-full object-cover" />
                 </div>
                 <div className="w-36 h-36 rounded-[3rem] border-4 border-primary-500 overflow-hidden shadow-2xl rotate-[8deg] relative z-20">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop" className="w-full h-full object-cover" />
                 </div>
              </div>
              <h2 className="text-5xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">Boom!</h2>
              <p className="text-xl font-black opacity-80 mb-12 tracking-tight">You both swiped right!</p>
              
              <div className="space-y-4">
                 <button 
                  onClick={() => setShowMatchOverlay(false)}
                  className="w-full py-5 bg-primary-500 text-white font-black rounded-3xl shadow-2xl shadow-primary-500/40 text-xs uppercase tracking-[.3em] hover:scale-105 transition"
                >
                  Message Them
                </button>
                <button 
                  onClick={() => setShowMatchOverlay(false)}
                  className="w-full py-5 bg-white/10 hover:bg-white/20 text-white font-black rounded-3xl text-xs uppercase tracking-[.3em] border border-white/10"
                >
                  Keep Swiping
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setShowMatchOverlay(false)}
              className="absolute top-10 right-10 w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white"
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
