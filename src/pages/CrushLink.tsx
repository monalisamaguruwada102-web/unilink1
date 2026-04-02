import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, ShieldCheck, ArrowRight, UserPlus, Zap } from 'lucide-react';

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

  useEffect(() => {
    if (crushId) fetchTargetUser();
  }, [crushId]);

  const fetchTargetUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url, course, college, bio')
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
      // Save intent and redirect to auth
      localStorage.setItem('pending_crush_id', crushId || '');
      navigate('/auth');
      return;
    }

    if (!targetUser) return;
    
    setSending(true);
    try {
      const match = await addToCrushList(session.user.id, targetUser.id);
      setSent(true);
      setIsMatch(match);
      
      // Notify them
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-gray-950 text-white">
        <h1 className="text-4xl font-black mb-4">Link Expired? 🥀</h1>
        <p className="opacity-60 mb-8 font-medium">This secret crush link doesn't seem to exist or has been deactivated.</p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-primary-500 rounded-2xl font-black uppercase text-xs tracking-widest">Back to Campus</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-md w-full relative">
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="initial"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              className={`p-10 rounded-[3.5rem] border text-center relative overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-2xl'}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/10 rounded-full -ml-12 -mb-12 blur-2xl opacity-50" />

              <div className="relative mb-8">
                 <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-4 border-primary-500/20 shadow-2xl mx-auto ring-8 ring-primary-500/5">
                    {targetUser.avatar_url ? (
                      <img src={targetUser.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-white text-3xl font-black italic">
                        {targetUser.name[0]}
                      </div>
                    )}
                 </div>
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1] }} 
                   transition={{ repeat: Infinity, duration: 2 }}
                   className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-pink-500 shadow-xl border border-pink-500/20"
                 >
                    <Heart size={20} fill="currentColor" />
                 </motion.div>
              </div>

              <h1 className="text-3xl font-black tracking-tight mb-2 leading-none uppercase italic">Secret Crush!</h1>
              <p className="text-sm font-bold opacity-40 uppercase tracking-widest mb-6">For {targetUser.name}</p>
              
              <div className={`p-4 rounded-2xl mb-8 flex flex-col gap-1 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-500 leading-none mb-1 flex items-center justify-center gap-2">
                   <Zap size={10} fill="currentColor" /> Status Verified
                </p>
                <p className="text-xs font-medium opacity-60 leading-relaxed italic px-4">
                  "{targetUser.bio || 'This Poly student is waiting for a sign...'}"
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleSendCrush}
                  disabled={sending}
                  className="w-full py-6 bg-gradient-to-r from-primary-500 to-indigo-600 text-white rounded-[2.3rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary-500/40 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {sending ? 'Sending Vibration...' : (
                    <>
                      <Send size={16} strokeWidth={3} /> Send Anonymous Heart
                    </>
                  )}
                </button>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-30 flex items-center justify-center gap-2">
                   <ShieldCheck size={12} /> 100% Anonymous & Secure
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              className={`p-10 rounded-[3.5rem] border text-center relative overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-2xl'}`}
            >
              {isMatch && (
                <div className="absolute inset-0 z-0 bg-primary-500/10 animate-pulse" />
              )}
              
              <div className="relative z-10">
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                   {isMatch ? <Zap size={48} fill="currentColor" /> : <ShieldCheck size={48} />}
                </div>

                <h2 className="text-4xl font-black italic tracking-tighter mb-4 uppercase">
                  {isMatch ? "IT'S A MATCH! 🔥" : "Whisper Sent!"}
                </h2>
                <p className="text-sm font-medium opacity-60 leading-relaxed mb-10 px-4 uppercase tracking-widest">
                  {isMatch 
                    ? `You and ${targetUser.name} both have a secret crush on each other! Head to matches to chat.`
                    : `${targetUser.name} won't know it was you—unless they add you to their secret list too!`
                  }
                </p>

                <div className="space-y-3">
                  {isMatch ? (
                    <button
                      onClick={() => navigate('/matches')}
                      className="w-full py-5 bg-primary-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                    >
                      Start Chatting <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/')}
                      className="w-full py-5 bg-primary-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                    >
                      Browse Campus <UserPlus size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/profile')}
                    className={`w-full py-5 border-2 rounded-3xl font-black text-xs uppercase tracking-widest ${isDarkMode ? 'border-white/10 text-white/50' : 'border-gray-200 text-gray-400'}`}
                  >
                    Set My Own Link
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Branding */}
        <div className="mt-8 text-center opacity-30 flex flex-col items-center">
           <span className="text-xl font-black tracking-tighter italic">UniLink</span>
           <span className="text-[8px] font-black uppercase tracking-[0.4em] mt-1">Campus Vibrations</span>
        </div>
      </div>
    </div>
  );
}
