import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, MapPin, Search, MessageCircle, Info, User, GraduationCap, XCircle, Star, Sparkles, Filter, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Discover() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchedUser, setMatchedUser] = useState<any>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [discoveryMode, setDiscoveryMode] = useState<'dating' | 'study' | 'live'>('dating');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [genderFilter, setGenderFilter] = useState('');

  const { session, profile: myProfile } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const navigate = useNavigate();

  useEffect(() => { 
    fetchProfiles(); 
  }, [searchQuery, discoveryMode, selectedZone, selectedDept, genderFilter]);

  const fetchProfiles = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      // Base query
      let query = supabase
        .from('users')
        .select('id, name, age, course, bio, avatar_url, college, latitude, longitude, is_study_buddy_mode, department, campus_zone, is_verified, gender, last_seen')
        .neq('id', session.user.id);

      // Gender Filtering (manual override)
      if (genderFilter) {
        query = query.eq('gender', genderFilter);
      }

      if (discoveryMode === 'study') {
        query = query.eq('is_study_buddy_mode', true);
      }
      if (selectedZone) {
        query = query.eq('campus_zone', selectedZone);
      }
      if (selectedDept) {
        query = query.eq('department', selectedDept);
      }

      if (discoveryMode === 'live') {
        const { data: liveData, error: liveError } = await supabase.rpc('get_active_matches', { current_uid: session.user.id });
        if (liveError) throw liveError;
        setProfiles(liveData || []);
        setCurrentIndex(0);
        setLoading(false);
        return; // Exit early for live mode
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,course.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(searchQuery ? 100 : 20);

      if (error) throw error;
      
      // Sort by distance if user has location enabled
      let sorted = data || [];
      if (myProfile?.latitude && myProfile?.longitude && sorted.length > 0) {
        const myLat = myProfile.latitude as number;
        const myLng = myProfile.longitude as number;
        sorted = [...sorted].sort((a: any, b: any) => {
          const distA = (a.latitude && a.longitude) ? parseFloat(calculateDistance(myLat, myLng, a.latitude, a.longitude) || '9999') : 9999;
          const distB = (b.latitude && b.longitude) ? parseFloat(calculateDistance(myLat, myLng, b.latitude, b.longitude) || '9999') : 9999;
          return distA - distB;
        });
      }

      setProfiles(sorted);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Discover error:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = profiles[currentIndex];

  const handleLike = async (profileId: string) => {
    if (!session) return;
    
    // Record the like
    await supabase.from('likes').upsert({ liker_id: session.user.id, liked_id: profileId });

    // Notify the user
    await supabase.from('notifications').insert({
      user_id: profileId,
      sender_id: session.user.id,
      type: 'like_profile',
      content: 'liked your profile! Swipe back to match.'
    });

    // Check if it's mutual
    const { data: mutual } = await supabase
      .from('likes')
      .select('id')
      .eq('liker_id', profileId)
      .eq('liked_id', session.user.id)
      .maybeSingle();

    if (mutual) {
      // 1. Check if match already exists to avoid unique constraint error
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${session.user.id},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${session.user.id})`)
        .maybeSingle();

      if (existingMatch) {
         setMatchId(existingMatch.id);
      } else {
        // 2. Create a new match record
        const { data: newMatch } = await supabase
          .from('matches')
          .insert({ user1_id: session.user.id, user2_id: profileId })
          .select()
          .single();
        if (newMatch) setMatchId(newMatch.id);
      }
      
      // 3. Notify both (Mutual likes)
      await supabase.from('notifications').insert([
        { user_id: profileId, sender_id: session.user.id, type: 'match', content: 'You have a new match! Start chatting.' },
        { user_id: session.user.id, sender_id: profileId, type: 'match', content: 'You have a new match! Start chatting.' }
      ]);

      const matchedProfile = profiles.find(p => p.id === profileId);
      setMatchedUser(matchedProfile);
    }

    if (!searchQuery) {
      nextProfile();
    }
  };

  const { addToCrushList, crushList } = useFeatureStore();
  const handleSecretCrush = async (profileId: string) => {
    if (!session) return;
    const isMatched = await addToCrushList(session.user.id, profileId);
    if (isMatched) {
      const matchedProfile = profiles.find(p => p.id === profileId);
      setMatchedUser(matchedProfile);
    } else {
      alert('❤️ Added to your secret crush list! If they add you too, it\'s a match!');
      nextProfile();
    }
  };

  const handlePass = () => {
    nextProfile();
  };

  const nextProfile = () => {
    setCurrentIndex((prev) => (prev + 1) % profiles.length);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const bg = isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = isDarkMode ? 'bg-gray-900 border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-xl';

  const UserBadges = ({ profile }: { profile: any }) => {
    const badges = [];
    if (profile?.is_verified) badges.push({ icon: <Sparkles size={8} />, label: 'Verified', color: 'text-blue-400 bg-blue-500/10' });
    if (new Date().getTime() - new Date(profile.last_seen || '').getTime() < 300000) badges.push({ icon: <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />, label: 'Live', color: 'text-green-400 bg-green-500/10' });
    if (profile?.course === myProfile?.course) badges.push({ icon: <Users size={8} />, label: 'Course Mate', color: 'text-indigo-400 bg-indigo-500/10' });
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {badges.map((b, i) => (
          <div key={i} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-current font-black text-[6px] uppercase tracking-widest ${b.color}`}>
            {b.icon} {b.label}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen pb-36 transition-colors duration-500 ${bg} overflow-hidden`}>
      {/* Search Header */}
      <div className={`sticky top-0 z-30 p-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <div className={`flex items-center px-4 py-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-gray-900 border-gray-800 focus-within:border-primary-500' : 'bg-gray-100 border-transparent focus-within:bg-white focus-within:border-primary-500'}`}>
           <Search size={18} className="opacity-40 mr-3" />
           <input 
             type="text" 
             placeholder="Search students like on Facebook..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="bg-transparent border-none outline-none text-sm font-bold w-full"
           />
           {searchQuery && (
             <button onClick={() => setSearchQuery('')} className="opacity-40">
               <X size={16} />
             </button>
           )}
        </div>

        {/* Discovery Mode & Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-4 px-1">
           <div className={`p-1 rounded-2xl flex gap-1 ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-100'}`}>
              <button 
                type="button"
                onClick={() => setDiscoveryMode('dating')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${discoveryMode === 'dating' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' : 'opacity-40'}`}
              >
                Dating
              </button>
              <button 
                type="button"
                onClick={() => setDiscoveryMode('live')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${discoveryMode === 'live' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'opacity-40'}`}
              >
                Live Sync
              </button>
              <button 
                type="button"
                onClick={() => setDiscoveryMode('study')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${discoveryMode === 'study' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'opacity-40'}`}
              >
                Study Buddy
              </button>
           </div>
           
           <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-2xl transition ${showFilters ? 'bg-primary-500 text-white' : (isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-100')}`}
           >
              <Filter size={16} />
           </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 overflow-hidden space-y-4 px-1"
            >
               <div className="grid grid-cols-3 gap-3 pb-2">
                  <select 
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className={`px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}
                  >
                    <option value="">All Zones</option>
                    <option value="Block A">Block A</option>
                    <option value="Block C">Block C</option>
                    <option value="Library">Library</option>
                    <option value="Main Gate">Main Gate</option>
                  </select>
                  <select 
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className={`px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}
                  >
                    <option value="">All Depts</option>
                    <option value="IT">IT</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Commerce">Commerce</option>
                  </select>
                  <select 
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className={`px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest outline-none border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}
                  >
                    <option value="">Auto Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 relative mb-24 px-5 ${searchQuery ? 'h-full' : ''}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-primary-500">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest italic animate-pulse">Scanning Poly Students...</p>
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 bg-primary-500/10 rounded-[2.5rem] flex items-center justify-center text-primary-500 mb-6">
              <XCircle size={40} />
            </div>
            <h2 className="text-2xl font-black mb-2">No one found!</h2>
            <p className="text-sm opacity-40 font-bold leading-relaxed uppercase tracking-widest">Try adjusting your search or check back later.</p>
          </div>
        ) : searchQuery ? (
          /* Search Results View */
          <div className="grid grid-cols-1 gap-4 overflow-y-auto h-full pb-10 hide-scrollbar">
            {profiles.map((p) => (
               <motion.div 
                 key={p.id}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 onClick={() => setSelectedProfile(p)}
                 className={`p-4 rounded-3xl border flex items-center gap-4 active:scale-95 transition ${card}`}
               >
                 <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-primary-500/20">
                   {p.avatar_url ? (
                     <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                   ) : (
                     <div className="w-full h-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center text-white font-black text-xl">
                       {p.name[0]}
                     </div>
                   )}
                   {p.is_verified && (
                      <div className="absolute top-0 right-0 p-1 bg-white dark:bg-gray-900 rounded-bl-xl border-l border-b border-primary-500/20">
                         <Sparkles size={10} className="text-blue-500" />
                      </div>
                   )}
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center gap-2">
                       <p className="font-black text-base">{p.name}</p>
                       {p.is_verified && <Sparkles size={12} className="text-blue-500" />}
                    </div>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{p.course || 'Kwekwe Poly'}</p>
                 </div>
                 <button 
                   onClick={(e) => { e.stopPropagation(); handleLike(p.id); }}
                   className="p-3 rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                 >
                    <Heart size={18} fill="currentColor" />
                 </button>
               </motion.div>
            ))}
          </div>
        ) : (
          /* Swiping Card View */
          <AnimatePresence mode="wait">
            {currentProfile && (
              <motion.div
                key={currentProfile.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.x > 100) handleLike(currentProfile.id);
                  if (info.offset.x < -100) handlePass();
                }}
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ x: -500, opacity: 0, rotate: -30 }}
                className={`relative w-full h-full rounded-[3.5rem] overflow-hidden shadow-2xl border-2 border-white/10 ${card}`}
              >
                {currentProfile.avatar_url ? (
                  <img src={currentProfile.avatar_url} alt={currentProfile.name} className="w-full h-full object-cover pointer-events-none" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center pointer-events-none">
                    <span className="text-8xl font-black text-white/30">{currentProfile.name[0]}</span>
                  </div>
                )}

                {/* Swipe Indicators */}
                <div className="absolute top-10 left-8 right-8 flex justify-between pointer-events-none z-20">
                    <motion.div 
                      style={{ opacity: 0 }}
                      whileDrag={{ opacity: 1, scale: 1.2 }}
                      className="px-4 py-2 border-4 border-red-500 text-red-500 font-black rounded-xl uppercase tracking-widest text-2xl -rotate-12"
                    >
                      NOPE
                    </motion.div>
                    <motion.div 
                      style={{ opacity: 0 }}
                      whileDrag={{ opacity: 1, scale: 1.2 }}
                      className="px-4 py-2 border-4 border-green-500 text-green-500 font-black rounded-xl uppercase tracking-widest text-2xl rotate-12"
                    >
                      LIKE
                    </motion.div>
                </div>

                {/* Overlay Details */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 pointer-events-none" />
                
                <div className="absolute bottom-10 left-8 right-8 text-white">
                  <div className="flex items-center justify-between mb-2">
                     <div className="flex-1">
                        <div className="flex items-center gap-3">
                           <h2 className="text-3xl font-black tracking-tighter">{currentProfile.name}, {currentProfile.age || '??'}</h2>
                           {currentProfile.is_verified && <Sparkles size={20} className="text-blue-400" />}
                        </div>
                        <UserBadges profile={currentProfile} />
                     </div>
                     <button 
                       onClick={(e) => { e.stopPropagation(); setSelectedProfile(currentProfile); }}
                       className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 relative z-30"
                     >
                       <Info size={18} />
                     </button>
                  </div>
                  
                  <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <GraduationCap size={14} className="text-primary-400" /> {currentProfile.course || 'Poly Student'}
                  </p>

                  <div className="flex items-center gap-2 mb-6">
                    <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                       <MapPin size={10} className="text-primary-400" />
                       <span className="text-[10px] font-black uppercase tracking-widest">
                         { (myProfile?.latitude && myProfile?.longitude && currentProfile?.latitude && currentProfile?.longitude) 
                           ? (() => {
                               const dist = parseFloat(calculateDistance(myProfile.latitude, myProfile.longitude, currentProfile.latitude, currentProfile.longitude) || '0');
                               if (dist < 0.5) return '< 500m away';
                               if (dist < 1) return '< 1 km away';
                               return `~${Math.round(dist)} km away`;
                             })()
                           : 'Nearby campus'}
                       </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 relative z-30">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePass(); }}
                      className="flex-1 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] flex items-center justify-center text-white active:scale-90 transition shadow-xl"
                    >
                      <X size={28} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleLike(currentProfile.id); }}
                      className="flex-[2] h-16 bg-primary-500 rounded-[2rem] flex items-center justify-center text-white active:scale-95 transition shadow-2xl shadow-primary-500/40 relative overflow-hidden group"
                    >
                      <Heart size={28} fill="currentColor" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSecretCrush(currentProfile.id); }}
                      className={`h-16 w-16 rounded-[2rem] flex items-center justify-center transition shadow-xl ${isDarkMode ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}
                      title="Secret crush"
                    >
                      <Star size={24} fill={crushList.includes(currentProfile.id) ? "currentColor" : "none"} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Match Overlay */}
      <AnimatePresence>
        {matchedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-primary-950/95 backdrop-blur-2xl"
          >
            <div className="text-center w-full max-w-sm">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                className="relative mb-12"
              >
                <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl mx-auto rotate-6">
                   {matchedUser.avatar_url && <img src={matchedUser.avatar_url} className="w-full h-full object-cover" alt="" />}
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white rounded-full flex items-center justify-center text-primary-500 shadow-2xl -rotate-12">
                   <Heart size={36} fill="currentColor" />
                </div>
              </motion.div>

              <h2 className="text-5xl font-black text-white italic tracking-tighter mb-4 uppercase">It's a Match!</h2>
              <p className="text-white/60 font-medium mb-12 px-8 leading-relaxed uppercase tracking-widest text-[10px]">
                You and {matchedUser.name} liked each other! Don't be shy, say something sweet.
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => navigate(`/chat/${matchId}`)}
                  className="w-full py-5 bg-white text-primary-600 font-black rounded-3xl shadow-2xl flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
                >
                  <MessageCircle size={18} /> Send a Message
                </button>
                <button
                  onClick={() => setMatchedUser(null)}
                  className="w-full py-5 border-2 border-white/20 text-white font-black rounded-3xl text-xs uppercase tracking-widest"
                >
                  Keep Swiping
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Detail Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-0 z-40 ${isDarkMode ? 'bg-gray-950' : 'bg-white'} safe-pt`}
          >
            <div className="h-full flex flex-col">
               <div className="relative h-2/5">
                 {selectedProfile.avatar_url ? (
                   <img src={selectedProfile.avatar_url} className="w-full h-full object-cover" alt="" />
                 ) : (
                   <div className="w-full h-full bg-gradient-to-br from-primary-400 to-indigo-500" />
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                 <button 
                   onClick={() => setSelectedProfile(null)}
                   className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20"
                 >
                   <X size={20} />
                 </button>
                 <div className="absolute bottom-6 left-6 text-white">
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black tracking-tighter">{selectedProfile.name}, {selectedProfile.age}</h2>
                      {selectedProfile.is_verified && <Sparkles size={20} className="text-blue-400" />}
                    </div>
                    <p className="opacity-70 text-sm font-bold uppercase tracking-widest italic">{selectedProfile.course}</p>
                 </div>
               </div>

               <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                       <User size={14} /> About Student
                    </p>
                    <p className="text-base font-medium leading-relaxed opacity-80 italic">
                      "{selectedProfile.bio || 'This Poly student is keeping it mysterious...'}"
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                       <GraduationCap size={14} /> Campus Info
                    </p>
                    <div className="p-4 rounded-2xl bg-primary-500/5 border border-primary-500/10">
                      <p className="text-sm font-bold text-primary-500">— {selectedProfile.college || 'Kwekwe Polytechnic'}</p>
                      <p className="text-xs opacity-60 font-medium mt-1 uppercase tracking-widest">{selectedProfile.course}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                         {selectedProfile.department && (
                           <span className="px-2 py-1 bg-primary-500/10 rounded-lg text-[8px] font-black tracking-widest uppercase text-primary-500">
                             {selectedProfile.department} Dept
                           </span>
                         )}
                         {selectedProfile.campus_zone && (
                           <span className="px-2 py-1 bg-green-500/10 rounded-lg text-[8px] font-black tracking-widest uppercase text-green-500">
                             Zone: {selectedProfile.campus_zone}
                           </span>
                         )}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => { handleLike(selectedProfile.id); setSelectedProfile(null); }}
                    className="w-full py-5 bg-primary-500 text-white font-black rounded-[2rem] shadow-xl shadow-primary-500/30 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                  >
                    <Heart size={20} fill="currentColor" /> Like Profile
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
