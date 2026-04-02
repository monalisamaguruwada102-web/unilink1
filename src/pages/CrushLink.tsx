import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShieldCheck, UserPlus, Zap, MessageCircle, X, MapPin, Search, Sparkles } from 'lucide-react';

export default function CrushLink() {
  const { crushId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { addToCrushList, isDarkMode } = useFeatureStore();
  
  const [targetUser, setTargetUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  const [timerExpired, setTimerExpired] = useState(false);

  useEffect(() => {
    if (crushId) fetchTargetUser();
    
    // 2-minute timer for demo conversion
    const timer = setTimeout(() => {
      setTimerExpired(true);
    }, 120000); // 2 minutes

    return () => clearTimeout(timer);
  }, [crushId]);

  const fetchTargetUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url, course, college, bio, department, campus_zone, last_seen')
        .eq('crush_id', crushId)
        .single();
      
      if (error) throw error;
      setTargetUser(data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCrush = async () => {
    if (!session) {
      setShowRegModal(true);
      return;
    }

    if (!targetUser) return;
    
    setSending(true);
    try {
      const match = await addToCrushList(session.user.id, targetUser.id);
      setSent(true);
      setIsMatch(match);
      
      await supabase.from('notifications').insert({
        user_id: targetUser.id,
        sender_id: session.user.id,
        type: 'secret_crush',
        content: `Someone sent you an anonymous Secret Crush! 🔥 Click to see who it might be.`
      });

    } catch (err) {
      console.error('Crush failed:', err);
    } finally {
      setSending(false);
    }
  };

  const handleChatAttempt = () => {
    if (!session || timerExpired) {
      setShowRegModal(true);
    } else {
      // In a real app, this would check if they are matched
      alert('🔥 You need to send a Secret Heart first! If they heart you back, chat unlocks instantly.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="w-16 h-16 bg-primary-500 rounded-3xl" />
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-950 text-white">
         <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 border border-white/10">
           <X size={40} className="text-red-500" />
         </div>
        <h1 className="text-4xl font-black mb-4 italic tracking-tighter">LINK EXPIRED 🥀</h1>
        <p className="opacity-40 mb-8 font-medium uppercase text-[10px] tracking-[0.3em]">The vibration has faded away...</p>
        <button onClick={() => navigate('/')} className="px-10 py-5 bg-primary-500 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary-500/30">Back to Campus Hub</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative flex flex-col items-center overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-primary-500/20 to-transparent pointer-events-none" />
      <div className="absolute top-20 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Top Nav Demo Header */}
      <header className="w-full max-w-md px-6 py-8 relative z-20 flex items-center justify-between">
         <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter italic text-primary-500">UniLink</span>
            <span className="text-[7px] font-black uppercase tracking-[0.5em] opacity-40">Profile Preview</span>
         </div>
         <div className="flex items-center gap-3">
             <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live Now
             </div>
         </div>
      </header>

      {/* Discover Profile Card */}
      <div className="max-w-md w-full px-6 relative z-10 flex-1 flex flex-col justify-center">
         <AnimatePresence mode="wait">
           {!sent ? (
             <motion.div
               key="profile"
               initial={{ opacity: 0, y: 40 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className={`rounded-[3.5rem] overflow-hidden border relative flex flex-col ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-2xl shadow-gray-200/50'}`}
             >
                {/* Photo Section */}
                <div className="h-[45vh] relative">
                   {targetUser.avatar_url ? (
                     <img src={targetUser.avatar_url} className="w-full h-full object-cover" alt="" />
                   ) : (
                     <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center text-6xl font-black">
                        {targetUser.name[0]}
                     </div>
                   )}
                   
                   {/* Overlay Content */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8">
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-2">
                            <h2 className="text-3xl font-black text-white tracking-tight">{targetUser.name}</h2>
                            <Sparkles size={20} fill="#3b82f6" className="text-blue-500" />
                         </div>
                         <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white border border-white/20">
                            Verified Student
                         </div>
                      </div>
                      <div className="flex items-center gap-4 text-white/60 text-[10px] font-bold uppercase tracking-widest">
                         <div className="flex items-center gap-1.5"><MapPin size={12} className="text-primary-500" /> {targetUser.campus_zone || 'Campus'}</div>
                         <div className="flex items-center gap-1.5"><Search size={12} className="text-indigo-400" /> {targetUser.course || 'Viber'}</div>
                      </div>
                   </div>
                </div>

                {/* Info Section */}
                <div className="p-8 space-y-6">
                   <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-3">About {targetUser.name}</h3>
                      <p className="text-sm font-medium leading-relaxed opacity-80 italic">
                         "{targetUser.bio || "I'm on UniLink to see who's really vibing on campus. Send an anonymous heart if you want to know me."}"
                      </p>
                   </div>

                   {/* Demo Action Row */}
                   <div className="flex items-center gap-4 pt-2">
                      <button 
                        onClick={handleSendCrush}
                        disabled={sending}
                        className="flex-1 h-16 bg-gradient-to-r from-primary-500 to-indigo-600 rounded-[2rem] flex items-center justify-center gap-3 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-500/30 active:scale-95 transition-all"
                      >
                         <Heart size={20} fill="currentColor" strokeWidth={0} /> {sending ? 'Sending...' : 'Send Heart'}
                      </button>
                      <button 
                        onClick={handleChatAttempt}
                        className={`w-16 h-16 rounded-[2rem] flex items-center justify-center border transition-all active:scale-95 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-primary-400' : 'bg-gray-50 border-gray-100 text-primary-500'}`}
                      >
                         <MessageCircle size={24} />
                      </button>
                   </div>
                </div>
             </motion.div>
           ) : (
             <motion.div
               key="success"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className={`p-10 rounded-[3.5rem] border text-center relative overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-2xl'}`}
             >
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
                   {isMatch ? <Zap size={48} fill="currentColor" /> : <ShieldCheck size={48} />}
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter mb-4 uppercase">
                  {isMatch ? "IT'S A MATCH! 🔥" : "SECRET SENT!"}
                </h2>
                <p className="text-sm font-medium opacity-60 leading-relaxed mb-10 px-4 uppercase tracking-widest leading-loose">
                   {isMatch 
                     ? `BOOM! ${targetUser.name} already liked you! You both matched instantly.` 
                     : `You sent a secret heart! Now ${targetUser.name} will see an anonymous alert.`}
                </p>
                <button onClick={() => navigate('/matches')} className="w-full py-6 bg-primary-500 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl">
                   {isMatch ? 'Start Chatting Now' : 'Join UniLink to track status'}
                </button>
             </motion.div>
           )}
         </AnimatePresence>
      </div>

      {/* Footer Demo Disclaimer */}
      <div className="w-full max-w-sm px-8 py-8 opacity-20 text-center">
         <p className="text-[8px] font-black uppercase tracking-widest">Demo Mode — Profile provided via Secret Crush shared link</p>
      </div>

      {/* 🚀 REGISTRATION PROMPT MODAL */}
      <AnimatePresence>
        {showRegModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }} 
               animate={{ scale: 1, y: 0 }} 
               className={`max-w-xs w-full p-8 rounded-[3rem] border relative overflow-hidden text-center ${isDarkMode ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-100'}`}
             >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary-500 via-indigo-500 to-pink-500" />
                
                <div className="w-16 h-16 bg-primary-500/10 text-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                   <UserPlus size={32} />
                </div>
                
                <h3 className="text-2xl font-black italic tracking-tighter mb-4 uppercase">CLAIM YOUR VIBE 🚀</h3>
                <p className="text-xs font-black opacity-40 uppercase tracking-widest mb-8 leading-loose">
                   Register to chat with {targetUser.name} and see who else has a secret crush on you!
                </p>
                
                <div className="space-y-3">
                   <button 
                     onClick={() => navigate('/auth')}
                     className="w-full py-5 bg-primary-500 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 transition"
                   >
                     Create Account Now
                   </button>
                   <button 
                     onClick={() => setShowRegModal(false)}
                     className="w-full py-5 text-[10px] font-black uppercase tracking-widest opacity-30"
                   >
                     Maybe Later
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
