import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Search, Sparkles, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Matches() {
  const [activeTab, setActiveTab] = useState<'matches' | 'likedMe'>('matches');
  const [matches, setMatches] = useState<any[]>([]);
  const [likedMe, setLikedMe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
    
    // Real-time updates
    const channel = supabase.channel('realtime_matches_likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);
    
    try {
      // 1. Fetch matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          created_at,
          user1:users!matches_user1_id_fkey(id, name, avatar_url, course),
          user2:users!matches_user2_id_fkey(id, name, avatar_url, course)
        `)
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });
        
      if (matchesData) {
        setMatches(matchesData.map((m: any) => {
          const otherUser = m.user1.id === session.user.id ? m.user2 : m.user1;
          return { id: m.id, user: otherUser, matchedAt: m.created_at };
        }));
      }

      // 2. Fetch "Who Liked You" (People who liked me but I haven't liked back)
      // First, find who I liked
      const { data: myLikes } = await supabase.from('likes').select('liked_id').eq('liker_id', session.user.id);
      const myLikedIds = myLikes?.map(l => l.liked_id) || [];

      // Find who liked me
      const { data: whoLikedMe } = await supabase
        .from('likes')
        .select('liker_id, users:users!likes_liker_id_fkey(id, name, avatar_url, course, bio)')
        .eq('liked_id', session.user.id);

      if (whoLikedMe) {
        // Filter out those I already liked back (they are matches now)
        setLikedMe(whoLikedMe
          .filter(l => !myLikedIds.includes(l.liker_id) && l.users)
          .map(l => l.users)
        );
      }
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (userId: string) => {
    if (!session) return;
    try {
       // 1. Like them back
       await supabase.from('likes').upsert({ liker_id: session.user.id, liked_id: userId });
       
       // 2. Create the match
       const { data: newMatch } = await supabase
         .from('matches')
         .insert({ user1_id: session.user.id, user2_id: userId })
         .select()
         .single();
       
       // 3. Notify them
       await supabase.from('notifications').insert([
         { user_id: userId, sender_id: session.user.id, type: 'match', content: 'You have a new match! Start chatting.' },
         { user_id: session.user.id, sender_id: userId, type: 'match', content: 'You matched back! Say hello.' }
       ]);

       if (newMatch) {
         navigate(`/chat/${newMatch.id}`);
       }
    } catch (err) {
       console.error('Accept match error:', err);
    }
  };

  const bg = isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm';

  return (
    <div className={`min-h-screen pb-36 transition-colors duration-300 ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 px-5 pt-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter">Campus Connect</h1>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Find your Poly partner</p>
          </div>
          <button className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <Search size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-transparent">
          <button 
            onClick={() => setActiveTab('matches')}
            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'matches' ? 'text-primary-500' : 'text-gray-400'}`}
          >
            Matches ({matches.length})
            {activeTab === 'matches' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-500 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('likedMe')}
            className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'likedMe' ? 'text-primary-500' : 'text-gray-400'}`}
          >
            Who Liked You ({likedMe.length})
            {likedMe.length > 0 && <span className="absolute -top-1 -right-4 w-4 h-4 bg-primary-500 text-white text-[8px] flex items-center justify-center rounded-full animate-pulse">{likedMe.length}</span>}
            {activeTab === 'likedMe' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary-500 rounded-full" />}
          </button>
        </div>
      </div>

      <div className="px-5 pt-6">
        {loading ? (
          <div className="flex flex-col items-center py-20 opacity-40">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Loading Poly students...</p>
          </div>
        ) : activeTab === 'matches' ? (
          matches.length === 0 ? (
            <div className="text-center py-20 px-6">
               <div className="w-20 h-20 rounded-[2.5rem] bg-primary-500/10 flex items-center justify-center text-primary-500 mx-auto mb-6">
                 <Heart size={36} fill="currentColor" className="opacity-20" />
               </div>
               <h2 className="text-2xl font-black mb-2">No matches yet!</h2>
               <p className="text-sm opacity-40 font-bold mb-10 leading-relaxed uppercase tracking-widest">Swipe right on other Poly students to find a match!</p>
               <button onClick={() => navigate('/discover')} className="w-full py-5 bg-primary-500 text-white font-black rounded-3xl shadow-xl shadow-primary-500/30 text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                 <Sparkles size={18} /> Start Swiping
               </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence>
                {matches.map((match, idx) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => navigate(`/chat/${match.id}`)}
                    className={`relative aspect-[3/4] rounded-[2rem] overflow-hidden border p-0.5 group cursor-pointer active:scale-95 transition-transform ${card}`}
                  >
                    <div className="w-full h-full rounded-[1.8rem] overflow-hidden relative">
                      {match.user.avatar_url ? (
                        <img src={match.user.avatar_url} alt={match.user.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center">
                          <span className="text-4xl font-black text-white/30">{match.user.name?.[0]}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                      <div className="absolute top-3 left-3 px-2 py-1 bg-primary-500 text-white rounded-lg flex items-center gap-1 shadow-lg">
                         <Heart size={10} fill="white" />
                         <span className="text-[8px] font-black uppercase tracking-tighter">Mutual Match</span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                         <p className="text-white font-black text-sm truncate">{match.user.name}</p>
                         <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider truncate mb-2">{match.user.course || 'Kwekwe Poly'}</p>
                         <div className="flex-1 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white text-[9px] font-black uppercase tracking-widest border border-white/10 group-hover:bg-primary-500 group-hover:border-primary-400 transition-colors">
                            Chat Now
                         </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          likedMe.length === 0 ? (
            <div className="text-center py-20 px-6">
               <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 mx-auto mb-6">
                 <Sparkles size={36} fill="currentColor" className="opacity-20" />
               </div>
               <h2 className="text-2xl font-black mb-2">No likes yet!</h2>
               <p className="text-sm opacity-40 font-bold mb-10 leading-relaxed uppercase tracking-widest">People who swipe right on you will appear here.</p>
               <button onClick={() => navigate('/discover')} className="w-full py-5 bg-indigo-500 text-white font-black rounded-3xl shadow-xl shadow-indigo-500/30 text-xs uppercase tracking-widest">
                 Get Discovered
               </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <AnimatePresence>
                {likedMe.map((user, idx) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative aspect-[3/4] rounded-[2rem] overflow-hidden border p-0.5 group ${card}`}
                  >
                    <div className="w-full h-full rounded-[1.8rem] overflow-hidden relative">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <span className="text-4xl font-black text-white/30">{user.name?.[0]}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                      
                      <div className="absolute bottom-4 left-4 right-4 text-center">
                         <p className="text-white font-black text-sm truncate mb-1">{user.name}</p>
                         <p className="text-white/60 text-[8px] font-bold uppercase tracking-widest truncate mb-3">{user.course || 'Kwekwe Poly'}</p>
                         <button 
                           onClick={() => handleAccept(user.id)}
                           className="w-full py-2.5 bg-primary-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary-500/40 active:scale-95 transition"
                         >
                           Accept & Match
                         </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        )}
      </div>

      {/* Suggested Profiles Footer */}
      {(matches.length < 5 && activeTab === 'matches') && (
        <div className="px-5 mt-12 pb-10">
           <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
               <Sparkles size={14} className="text-primary-500" /> Discover More
             </p>
             <ChevronRight size={16} className="opacity-20" />
           </div>
           <button onClick={() => navigate('/discover')} className={`w-full p-6 rounded-[2.5rem] border border-dashed flex items-center gap-4 transition-all hover:scale-[1.02] ${isDarkMode ? 'border-gray-800 bg-gray-900/40 text-gray-400' : 'border-gray-200 bg-white text-gray-500'}`}>
             <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/20">
               <Heart size={20} />
             </div>
             <div className="text-left">
               <p className="font-black text-sm text-primary-500">Keep Exploring Campus</p>
               <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Find your perfect match</p>
             </div>
           </button>
        </div>
      )}
    </div>
  );
}
