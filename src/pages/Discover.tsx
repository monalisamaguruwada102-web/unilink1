import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, X, MapPin, GraduationCap, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in metres
  return d;
}

export default function Discover() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedUser, setMatchedUser] = useState<any>(null);
  const [matchId, setMatchId] = useState<string>('');
  const { session, profile: myProfile } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const navigate = useNavigate();

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      const { data: liked } = await supabase
        .from('likes')
        .select('liked_id')
        .eq('liker_id', session.user.id);

      const excludeIds = liked?.map((l: any) => l.liked_id) || [];
      excludeIds.push(session.user.id);

      // Fetch basics defensively to avoid 'missing column' crashes
      let query = supabase
        .from('users')
        .select('id, name, age, course, bio, avatar_url, college')
        .not('id', 'in', `(${excludeIds.map(id => `'${id}'`).join(',')})`)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data, error } = await query;

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Discover error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (profileId: string, direction: 'like' | 'pass') => {
    if (!session) return;
    setProfiles(prev => prev.filter(p => p.id !== profileId));

    if (direction === 'pass') return;

    // Record the like
    await supabase.from('likes').upsert({ liker_id: session.user.id, liked_id: profileId });

    // Check if it's mutual
    const { data: mutual } = await supabase
      .from('likes')
      .select('id')
      .eq('liker_id', profileId)
      .eq('liked_id', session.user.id)
      .single();

    if (mutual) {
      // Create a match record
      const { data: newMatch } = await supabase
        .from('matches')
        .insert({ user1_id: session.user.id, user2_id: profileId })
        .select()
        .single();

      const matchedProfile = profiles.find(p => p.id === profileId);
      setMatchedUser(matchedProfile);
      if (newMatch) setMatchId(newMatch.id);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col pb-36 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <div>
          <h1 className="text-2xl font-black tracking-tighter">Discover</h1>
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Kwekwe Poly Students</p>
        </div>
        <button onClick={fetchProfiles} className="p-3 rounded-2xl bg-primary-500/10 text-primary-500">
          <RefreshCcw size={18} />
        </button>
      </div>

      {/* Card Stack */}
      <div className="flex-1 flex items-center justify-center px-4">
        {loading ? (
          <div className="text-center opacity-40">
            <RefreshCcw className="animate-spin mx-auto mb-4 text-primary-500" size={40} />
            <p className="text-xs font-black uppercase tracking-widest">Scanning Campus...</p>
          </div>
        ) : profiles.length > 0 ? (
          <div className="w-full max-w-sm h-[520px] relative">
            <AnimatePresence>
              {profiles.slice(0, 3).reverse().map((p, i) => (
                <SwipeCard
                  key={p.id}
                  currentProfile={myProfile}
                  profile={p}
                  isTop={i === profiles.slice(0, 3).length - 1}
                  stackIndex={profiles.slice(0, 3).length - 1 - i}
                  onLike={() => handleSwipe(p.id, 'like')}
                  onPass={() => handleSwipe(p.id, 'pass')}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center p-10">
            <div className="text-6xl mb-6">😅</div>
            <h2 className="text-2xl font-black mb-2">You've seen everyone!</h2>
            <p className="text-sm opacity-40 mb-8">Check back later for new Poly students.</p>
            <button
              onClick={fetchProfiles}
              className="px-8 py-4 bg-primary-500 text-white font-black rounded-2xl shadow-lg shadow-primary-500/30 text-sm uppercase tracking-widest"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Match Overlay */}
      <AnimatePresence>
        {matchedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-gray-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-white"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="text-center"
            >
              <div className="flex justify-center -space-x-8 mb-10">
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white z-10 -rotate-6 shadow-2xl">
                  {myProfile?.avatar_url
                    ? <img src={myProfile.avatar_url} className="w-full h-full object-cover" alt="You" />
                    : <div className="w-full h-full bg-primary-500 flex items-center justify-center font-black text-3xl text-white">{myProfile?.name?.[0]}</div>
                  }
                </div>
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-primary-500 z-20 rotate-6 shadow-2xl">
                  {matchedUser.avatar_url
                    ? <img src={matchedUser.avatar_url} className="w-full h-full object-cover" alt={matchedUser.name} />
                    : <div className="w-full h-full bg-indigo-500 flex items-center justify-center font-black text-3xl text-white">{matchedUser.name?.[0]}</div>
                  }
                </div>
              </div>

              <div className="text-6xl mb-3">🎉</div>
              <h2 className="text-4xl font-black mb-2 bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">It's a Match!</h2>
              <p className="text-lg font-bold opacity-60 mb-10">You and <strong>{matchedUser.name}</strong> both swiped right!</p>

              <div className="space-y-3 w-full">
                <button
                  onClick={() => { setMatchedUser(null); navigate(`/chat/${matchId}`); }}
                  className="w-full py-5 bg-primary-500 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary-500/30 flex items-center justify-center gap-3"
                >
                  Message Them
                </button>
                <button
                  onClick={() => setMatchedUser(null)}
                  className="w-full py-5 bg-white/10 rounded-2xl font-black uppercase tracking-widest text-sm border border-white/10"
                >
                  Keep Swiping
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SwipeCard({ profile, currentProfile, isTop, stackIndex, onLike, onPass }: any) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const likeOpacity = useTransform(x, [20, 80], [0, 1]);
  const passOpacity = useTransform(x, [-80, -20], [1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) onLike();
    else if (info.offset.x < -100) onPass();
  };

  const distanceText = (() => {
    if (!currentProfile?.latitude || !currentProfile?.longitude || !profile.latitude || !profile.longitude) {
      return 'Kwekwe Poly';
    }
    const dist = calculateDistance(currentProfile.latitude, currentProfile.longitude, profile.latitude, profile.longitude);
    if (dist < 100) return 'Very Close • On Campus';
    if (dist < 1000) return `${Math.round(dist)}m away`;
    return `${(dist / 1000).toFixed(1)}km away`;
  })();

  return (
    <motion.div
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: 1 - stackIndex * 0.04,
        zIndex: 10 - stackIndex,
        y: stackIndex * 10,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      exit={{ x: 500, opacity: 0, rotate: 30 }}
      animate={{ x: 0 }}
      className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
    >
      {/* Card Image */}
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt={profile.name} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center">
          <span className="text-8xl font-black text-white/30">{profile.name?.[0]}</span>
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Swipe Indicators */}
      <motion.div style={{ opacity: likeOpacity }} className="absolute top-10 left-8 px-6 py-3 border-4 border-green-400 rounded-2xl rotate-[-20deg]">
        <span className="text-green-400 font-black text-2xl uppercase tracking-widest">Like</span>
      </motion.div>
      <motion.div style={{ opacity: passOpacity }} className="absolute top-10 right-8 px-6 py-3 border-4 border-red-400 rounded-2xl rotate-[20deg]">
        <span className="text-red-400 font-black text-2xl uppercase tracking-widest">Nope</span>
      </motion.div>

      {/* Profile Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
        <h2 className="text-3xl font-black tracking-tighter mb-1 uppercase">{profile.name}{profile.age && `, ${profile.age}`}</h2>
        {profile.course && (
          <p className="flex items-center gap-2 text-sm font-bold opacity-80 mb-1">
            <GraduationCap size={16} /> {profile.course}
          </p>
        )}
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
          <MapPin size={14} className="text-primary-400" /> {distanceText}
        </p>
        {profile.bio && <p className="text-sm opacity-70 mt-3 leading-relaxed line-clamp-2">{profile.bio}</p>}

        {/* Action Buttons (Actual buttons remain clickable) */}
        {isTop && (
          <div className="flex justify-center gap-6 mt-5 pointer-events-auto">
            <button
              onClick={onPass}
              className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-red-500 transition-colors"
            >
              <X size={28} />
            </button>
            <button
              onClick={onLike}
              className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-primary-500/50 hover:scale-110 transition"
            >
              <Heart size={28} fill="white" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
