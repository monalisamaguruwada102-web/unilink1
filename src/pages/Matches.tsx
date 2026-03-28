import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Search, ChevronRight, MessageSquare, MapPin, X, Navigation, Clock, Satellite } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Matches() {
  const [activeTab, setActiveTab] = useState<'matches' | 'likedMe'>('matches');
  const [matches, setMatches] = useState<any[]>([]);
  const [likedMe, setLikedMe] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationMatch, setLocationMatch] = useState<any>(null);
  const [mapLayer, setMapLayer] = useState<'mapnik' | 'hot'>('mapnik');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const { session, profile } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const navigate = useNavigate();

  const formatTimeAgo = (lastSeen?: string) => {
    if (!lastSeen) return 'Poly Student';
    const utcDate = lastSeen.endsWith('Z') ? lastSeen : `${lastSeen}Z`;
    const d = new Date(utcDate);
    if (isNaN(d.getTime())) return 'Recently';
    const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
    if (seconds < 60) return 'Active Now';
    if (seconds < 3600) return `Seen ${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400 && new Date().getDate() === d.getDate()) {
       return `Seen today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}`;
    }
    return `Seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric'})}`;
  };

  useEffect(() => {
    fetchData(true);
    
    // Real-time updates for matches, likes, AND live messages
    const channel = supabase.channel('realtime_matches_likes_improved')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => fetchData(false))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchData(false))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  const fetchData = async (isInitial = false) => {
    if (!session) return;
    if (isInitial) setLoading(true);
    
    try {
      // 1. Fetch matches with latest messages in ONE SINGLE query
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          id,
          created_at,
          last_message_content,
          last_message_at,
          last_message_type,
          user1:users!user1_id(id, name, avatar_url, course, last_seen, latitude, longitude, location_updated_at),
          user2:users!user2_id(id, name, avatar_url, course, last_seen, latitude, longitude, location_updated_at)
        `)
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
        
      if (matchesData) {
        const validMatches = matchesData.filter((m: any) => m.user1 && m.user2);
        setMatches(validMatches.map((m: any) => {
          const otherUser = m.user1?.id === session.user.id ? m.user2 : m.user1;
          return { 
            id: m.id, 
            user: otherUser, 
            matchedAt: m.created_at,
            lastMessage: m.last_message_content ? {
                content: m.last_message_content,
                created_at: m.last_message_at,
                type: m.last_message_type
            } : null
          };
        }));
      }

      // 2. Fetch "Who Liked You"
      const { data: myLikes } = await supabase.from('likes').select('liked_id').eq('liker_id', session.user.id);
      const myLikedIds = myLikes?.map(l => l.liked_id) || [];

      const { data: whoLikedMe } = await supabase
        .from('likes')
        .select('liker_id, users:users!likes_liker_id_fkey(id, name, avatar_url, course, bio, last_seen)')
        .eq('liked_id', session.user.id);

      if (whoLikedMe) {
        setLikedMe(whoLikedMe
          .filter(l => !myLikedIds.includes(l.liker_id) && l.users)
          .map(l => l.users)
        );
      }
    } catch (err) {
      console.error('Fetch matches error:', err);
    } finally {
      setLoading(false);
    }

    // Fetch unread counts
    if (session) {
      const { data: unread } = await supabase.rpc('get_unread_counts', { my_id: session.user.id });
      if (unread) {
        const countMap: Record<string, number> = {};
        unread.forEach((row: any) => { countMap[row.match_id] = Number(row.unread_count); });
        setUnreadCounts(countMap);
      }
    }
  };

  const handleAccept = async (userId: string) => {
    if (!session) return;
    try {
       // Check if match already exists
       const { data: existing } = await supabase
         .from('matches')
         .select('id')
         .or(`and(user1_id.eq.${session.user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${session.user.id})`)
         .maybeSingle();

       if (existing) {
         navigate(`/chat/${existing.id}`);
         return;
       }

       // 1. Like them back
       await supabase.from('likes').upsert({ liker_id: session.user.id, liked_id: userId });
       
       // 2. Create the match
       const { data: newMatch, error: matchError } = await supabase
         .from('matches')
         .insert({ user1_id: session.user.id, user2_id: userId })
         .select()
         .single();
       
       if (matchError && matchError.code !== '23505') throw matchError;

       // 3. Notify them
       await supabase.from('notifications').insert([
         { user_id: userId, sender_id: session.user.id, type: 'match', content: 'You have a new match! Start chatting.' },
         { user_id: session.user.id, sender_id: userId, type: 'match', content: 'You matched back! Say hello.' }
       ]);

       fetchData();
       if (newMatch) navigate(`/chat/${newMatch.id}`);
    } catch (err) {
       console.error('Accept match error:', err);
    }
  };

  const bg = isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm';

  return (
    <div className={`min-h-screen pb-36 transition-colors duration-500 ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-30 px-5 pt-6 pb-2 border-b backdrop-blur-2xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter italic">Poly Connect</h1>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Find your perfect match
            </p>
          </div>
          <div className="flex-1 max-w-[200px]">
            <div className={`flex items-center px-4 py-2 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-900 border-gray-800 focus-within:border-primary-500' : 'bg-gray-100 border-transparent focus-within:bg-white focus-within:border-primary-500'}`}>
              <Search size={16} className="opacity-40 mr-2" />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] font-bold w-full uppercase tracking-widest"
              />
            </div>
          </div>
        </div>

        {/* Custom Segmented Control */}
        <div className={`p-1 rounded-2xl flex gap-1 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
           <button 
             onClick={() => setActiveTab('matches')}
             className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'matches' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
           >
             Conversations ({matches.length})
           </button>
           <button 
             onClick={() => setActiveTab('likedMe')}
             className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'likedMe' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'}`}
           >
             Who Liked You ({likedMe.length})
             {likedMe.length > 0 && activeTab !== 'likedMe' && (
               <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-gray-950 font-black">
                 {likedMe.length}
               </span>
             )}
           </button>
        </div>
      </div>

      <div className="px-5 pt-8">
        {loading ? (
          <div className="flex flex-col items-center py-20 opacity-40">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Scanning matches...</p>
          </div>
        ) : activeTab === 'matches' ? (
          /* CONVERSATION LIST VIEW */
          matches.length === 0 ? (
            <div className="text-center py-24 px-8">
               <div className="w-24 h-24 rounded-[3.5rem] bg-primary-500/10 flex items-center justify-center text-primary-500 mx-auto mb-8 shadow-inner">
                 <Heart size={44} fill="currentColor" className="opacity-20 translate-y-1" />
               </div>
               <h2 className="text-3xl font-black mb-3 italic tracking-tighter">No matches yet!</h2>
               <p className="text-xs opacity-40 font-bold mb-12 leading-relaxed uppercase tracking-widest px-4">
                 Don't wait! Swipe right on other Poly students and start your first conversation.
               </p>
               <button onClick={() => navigate('/discover')} className="w-full py-6 bg-gradient-to-br from-primary-500 to-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl shadow-primary-500/40 text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition">
                 <Heart size={18} /> Explore Campus
               </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* New Matches Row (No messages yet) */}
              {matches.some(m => !m.lastMessage) && (
                <div className="mb-8">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 px-2">New Connections</p>
                   <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                      {matches.filter(m => !m.lastMessage).map(m => (
                        <button 
                          key={m.id}
                          onClick={() => navigate(`/chat/${m.id}`)}
                          className="flex-shrink-0 flex flex-col items-center gap-2"
                        >
                           <div className="w-20 h-20 rounded-[2.2rem] p-1 bg-gradient-to-tr from-primary-500 to-indigo-500 shadow-lg">
                              <div className="w-full h-full rounded-[2rem] border-2 border-white dark:border-gray-950 overflow-hidden bg-gray-100">
                                 {m.user.avatar_url ? (
                                   <img src={m.user.avatar_url} className="w-full h-full object-cover" />
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center font-black text-2xl text-primary-500">{m.user.name?.[0]}</div>
                                 )}
                              </div>
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-tight opacity-70 max-w-[80px] truncate">{m.user.name}</span>
                        </button>
                      ))}
                   </div>
                </div>
              )}

              <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-2">Recent Conversations</p>
              <AnimatePresence>
                {matches
                  .filter(m => m.lastMessage) 
                  .filter(m => m.user && m.user.name && m.user.name.toLowerCase().includes(searchQuery.toLowerCase()) || (m.user?.course || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((match, idx) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      navigate(`/chat/${match.id}`);
                      // Mark as read immediately on open
                      supabase.rpc('mark_match_as_read', { target_match_id: match.id, my_id: session!.user.id });
                      setUnreadCounts(prev => ({ ...prev, [match.id]: 0 }));
                      useFeatureStore.getState().fetchGlobalUnread(session!.user.id);
                    }}
                    className={`flex items-center gap-4 p-4 rounded-[2.5rem] border active:scale-95 transition-all group ${card}`}
                  >
                    <div className="relative">
                       <div className="w-16 h-16 rounded-[1.8rem] overflow-hidden shadow-lg border-2 border-primary-500/20">
                         {match.user.avatar_url ? (
                           <img src={match.user.avatar_url} alt={match.user.name} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-white font-black text-2xl">
                             {match.user.name?.[0]}
                           </div>
                         )}
                       </div>
                       <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-gray-900 ${
                         match.user.last_seen && (new Date().getTime() - new Date(match.user.last_seen).getTime() < 60000) 
                         ? 'bg-green-500' 
                         : 'bg-gray-400'
                       }`} />
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-1">
                           <div className="flex items-center gap-1.5 truncate">
                             <h3 className="font-black text-base truncate">{match.user.name}</h3>
                           </div>
                           <div className="flex flex-col items-end gap-1">
                              <span className={`text-[9px] font-bold uppercase tracking-widest shrink-0 ${unreadCounts[match.id] > 0 ? 'text-green-500' : 'opacity-30'}`}>
                                {new Date(match.matchedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                              {unreadCounts[match.id] > 0 && (
                                <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-500 text-[10px] font-black text-white shadow-lg px-1 animate-in zoom-in duration-300">
                                  {unreadCounts[match.id] > 99 ? '99+' : unreadCounts[match.id]}
                                </div>
                              )}
                           </div>
                        </div>
                       <p className="text-[10px] font-bold text-primary-500 uppercase tracking-widest mb-1 truncate">
                         {formatTimeAgo(match.user.last_seen)}
                       </p>
                       <p className={`text-xs font-medium truncate pr-4 ${unreadCounts[match.id] > 0 ? 'opacity-100 text-white dark:text-white font-black' : 'opacity-50'}`}>
                         {match.lastMessage 
                           ? (match.lastMessage.type === 'sticker' ? 'Sent a sticker 🖼️' : match.lastMessage.type === 'voice' ? 'Sent a voice note 🎙️' : match.lastMessage.content)
                           : 'Tap to start chatting...'}
                       </p>
                    </div>

                     <button 
                       onClick={(e) => { e.stopPropagation(); navigate(`/chat/${match.id}`); }}
                       className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-all"
                     >
                        <MessageSquare size={20} />
                     </button>
                     {match.user.latitude && match.user.longitude && (
                       <button
                         onClick={(e) => { e.stopPropagation(); setLocationMatch(match); }}
                         className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                           match.user.location_updated_at && (new Date().getTime() - new Date(match.user.location_updated_at).getTime()) < 300000
                             ? 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white'
                             : isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'
                         }`}
                         title="See location"
                       >
                         <MapPin size={20} />
                       </button>
                     )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : (
          /* WHO LIKED YOU GRID VIEW */
          likedMe.length === 0 ? (
            <div className="text-center py-24 px-8">
               <div className="w-24 h-24 rounded-[3.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 mx-auto mb-8">
                 <Search size={44} className="opacity-20" />
               </div>
               <h2 className="text-3xl font-black mb-3 italic tracking-tighter text-indigo-500">Wait for it...</h2>
               <p className="text-xs opacity-40 font-bold mb-12 leading-relaxed uppercase tracking-widest">
                 When someone swipes right on your profile, you'll see them here. Keep your profile updated!
               </p>
               <button onClick={() => navigate('/profile')} className="w-full py-6 bg-indigo-500 text-white font-black rounded-[2.5rem] shadow-2xl shadow-indigo-500/30 text-xs uppercase tracking-widest">
                 Polish My Profile
               </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 pb-20">
              <AnimatePresence>
                {likedMe
                  .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || (u.course || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((user, idx) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative aspect-[3/4.5] rounded-[2.5rem] overflow-hidden border p-0.5 group ${card}`}
                  >
                    <div className="w-full h-full rounded-[2.3rem] overflow-hidden relative">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.name} 
                          className={`w-full h-full object-cover transition-all duration-700 ${!profile?.is_premium ? 'blur-2xl scale-110' : ''}`} 
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ${!profile?.is_premium ? 'blur-xl' : ''}`}>
                          <span className="text-5xl font-black text-white/30">{user.name?.[0]}</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      
                      <div className="absolute bottom-4 left-4 right-4 text-center">
                         <div className="px-2 py-0.5 bg-indigo-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest inline-block mb-2 shadow-lg">
                           Adored You
                         </div>
                         <h4 className="text-white font-black text-sm truncate mb-0.5">
                            {!profile?.is_premium ? 'Secret Fan' : user.name}
                         </h4>
                         <p className="text-white/60 text-[8px] font-bold uppercase tracking-widest truncate mb-4">
                            {!profile?.is_premium ? 'Wants to meet you!' : (user.course || 'Poly Student')}
                         </p>
                         
                         <div className="flex gap-2">
                           <button 
                             onClick={() => handleAccept(user.id)}
                             className="flex-1 py-3 bg-white text-indigo-600 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition"
                           >
                             {!profile?.is_premium ? 'Reveal & Match' : 'Match'}
                           </button>
                           <button 
                             onClick={() => !profile?.is_premium ? alert('💎 Premium required to view detailed profile previews!') : null}
                             className="w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center space-x-0"
                           >
                              <Search size={14} />
                           </button>
                         </div>
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
        <div className="px-5 mt-12 pb-20">
           <div className="flex items-center justify-between mb-4 px-2">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-30 flex items-center gap-2">
               <Heart size={14} className="text-primary-500" /> New Faces on Campus
             </p>
             <ChevronRight size={16} className="opacity-10" />
           </div>
           <button onClick={() => navigate('/discover')} className={`w-full p-8 rounded-[3rem] border-2 border-dashed flex items-center gap-5 transition-all hover:scale-[1.02] border-primary-500/20 active:scale-95 ${isDarkMode ? 'bg-gray-900/40 text-gray-400' : 'bg-white text-gray-500'}`}>
             <div className="w-14 h-14 rounded-[1.8rem] bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-primary-500/30">
               <Heart size={24} fill="white" />
             </div>
             <div className="text-left">
               <p className="font-black text-base text-primary-500 tracking-tight">Keep Swiping!</p>
               <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Find your campus crush</p>
             </div>
           </button>
        </div>
      )}

      {/* 📍 LOCATION MODAL */}
      <AnimatePresence>
        {locationMatch && (() => {
          const u = locationMatch.user;
          const isLive = u.location_updated_at && (new Date().getTime() - new Date(u.location_updated_at).getTime()) < 300000;
          const updatedMins = u.location_updated_at ? Math.floor((new Date().getTime() - new Date(u.location_updated_at).getTime()) / 60000) : null;
          const bbox = u.latitude && u.longitude
            ? `${u.longitude - 0.008}%2C${u.latitude - 0.008}%2C${u.longitude + 0.008}%2C${u.latitude + 0.008}`
            : null;
          const mapSrc = bbox
            ? `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=${mapLayer}&marker=${u.latitude}%2C${u.longitude}`
            : null;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col"
              onClick={() => setLocationMatch(null)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className={`flex flex-col h-full ${isDarkMode ? 'bg-gray-950' : 'bg-white'}`}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary-500/30">
                      {u.avatar_url
                        ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full bg-primary-100 flex items-center justify-center font-black text-primary-600 text-lg">{u.name?.[0]}</div>
                      }
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-950 ${isLive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-black text-base tracking-tight">{u.name}'s Location</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isLive ? (
                          <span className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase tracking-widest">
                            <Navigation size={10} className="animate-pulse" /> Live Now
                          </span>
                        ) : updatedMins !== null ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <Clock size={10} /> {updatedMins < 60 ? `${updatedMins}m ago` : `${Math.floor(updatedMins/60)}h ago`}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location unknown</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Map layer toggle */}
                    <button
                      onClick={() => setMapLayer(l => l === 'mapnik' ? 'hot' : 'mapnik')}
                      className={`p-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition ${
                        mapLayer === 'hot' ? 'bg-primary-500 text-white' : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Satellite size={14} />
                    </button>
                    <button onClick={() => setLocationMatch(null)} className={`p-2.5 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Map */}
                <div className="flex-1 relative overflow-hidden">
                  {mapSrc ? (
                    <>
                      <iframe
                        key={mapLayer}
                        title="match-location"
                        src={mapSrc}
                        width="100%"
                        height="100%"
                        style={{ border: 0, filter: isDarkMode ? 'invert(90%) hue-rotate(180deg)' : 'none' }}
                        allowFullScreen
                      />
                      {/* Pulsing live pin overlay */}
                      {isLive && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="relative">
                            <span className="absolute w-16 h-16 rounded-full bg-green-500/20 animate-ping" style={{ top: '-32px', left: '-32px' }} />
                            <span className="absolute w-10 h-10 rounded-full bg-green-500/30 animate-pulse" style={{ top: '-20px', left: '-20px' }} />
                          </div>
                        </div>
                      )}
                      {/* Location badge */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
                        <div className={`px-3 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl ${
                          isLive ? 'bg-green-500 text-white' : isDarkMode ? 'bg-gray-900/90 text-gray-300' : 'bg-white/90 text-gray-700'
                        }`}>
                          <MapPin size={12} /> {u.name} is here
                        </div>
                        {u.latitude && u.longitude && (
                          <div className={`px-3 py-2 rounded-2xl text-[9px] font-black shadow-xl ${
                            isDarkMode ? 'bg-gray-900/90 text-gray-400' : 'bg-white/90 text-gray-500'
                          }`}>
                            {u.latitude.toFixed(4)}°, {u.longitude.toFixed(4)}°
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 opacity-30">
                      <MapPin size={56} />
                      <p className="font-black text-sm uppercase tracking-widest">Location not shared yet</p>
                    </div>
                  )}
                </div>

                {/* CTA row */}
                <div className={`px-5 py-5 flex gap-3 border-t ${isDarkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-100 bg-white'}`}>
                  <button
                    onClick={() => { setLocationMatch(null); navigate(`/chat/${locationMatch.id}`); }}
                    className="flex-1 py-4 bg-primary-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-500/30 active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} /> Open Chat
                  </button>
                  {u.latitude && u.longitude && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${u.latitude},${u.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center border flex items-center justify-center gap-2 active:scale-95 transition ${
                        isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Navigation size={16} /> Directions
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
