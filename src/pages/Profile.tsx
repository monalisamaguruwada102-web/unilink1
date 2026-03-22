import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { LogOut, Save, Star, Bot, Plus, Eye, Ghost, EyeOff } from 'lucide-react';
import { ThemeToggle } from '../components/features/SafetyAndTheme';
import { motion } from 'framer-motion';

export default function Profile() {
  const { profile, session, signOut, fetchProfile } = useAuthStore();
  const { 
    isDarkMode, 
    isIncognito, 
    isLurkMode, 
    setIncognito, 
    setLurkMode, 
    mood,
    vibeLabels,
    setMood,
    addVibeLabel
  } = useFeatureStore();
  
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age?.toString() || '');
      setCollege(profile.college || '');
      setCourse(profile.course || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setLoading(true);

    const updates = {
      id: session.user.id,
      email: session.user.email,
      name,
      age: age ? parseInt(age) : null,
      college,
      course,
      bio,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('users').upsert(updates);
    
    if (error) {
       console.error(error);
    } else {
      await fetchProfile(session.user.id);
    }
    setLoading(false);
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !session) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${session.user.id}-${Math.random()}.${fileExt}`;
    
    setLoading(true);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    setAvatarUrl(publicUrl);
    setLoading(false);
  };

  return (
    <div className={`flex-1 overflow-y-auto pt-10 pb-40 px-6 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50'}`}>
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black tracking-tighter">Your Profile</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button 
            onClick={signOut}
            className="w-12 h-12 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition shadow-lg shadow-red-500/20 flex items-center justify-center"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      <div className={`rounded-[3.5rem] shadow-2xl border p-10 mb-12 transition-all duration-500 relative overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
        
        <div className="flex flex-col items-center mb-10 text-center relative z-10">
          <div className="relative group w-36 h-36 mb-6">
            <div className="absolute inset-0 bg-primary-500 rounded-[3rem] blur-2xl opacity-20 scale-110" />
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-36 h-36 rounded-[3rem] object-cover border-4 border-white dark:border-gray-800 shadow-2xl relative z-10" />
            ) : (
              <div className="w-36 h-36 bg-primary-500 rounded-[3rem] border-4 border-white dark:border-gray-800 shadow-2xl flex items-center justify-center text-white font-black text-6xl relative z-10">
                {name ? name.charAt(0) : 'U'}
              </div>
            )}
            <label className="absolute inset-0 bg-black/60 rounded-[3rem] z-20 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300">
              <Plus size={32} className="mb-2" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Add Photo</span>
              <input type="file" accept="image/*" onChange={uploadAvatar} disabled={loading} className="hidden" />
            </label>
            
            {/* Feature 13: Top Badge */}
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-black p-2.5 rounded-2xl shadow-xl border-4 border-white dark:border-gray-900 z-30 animate-bounce cursor-pointer">
              <Star size={18} fill="currentColor" />
            </div>
          </div>

          <div className="space-y-2">
             <h2 className="text-3xl font-black tracking-tight">{name || 'Guest User'}</h2>
             {mood && (
               <motion.div 
                 onClick={() => setMood({ emoji: '🔥', text: 'On Grind Mode' })}
                 whileHover={{ scale: 1.05 }}
                 className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all mx-auto w-fit ${isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}
               >
                 <span className="text-base">{mood.emoji}</span>
                 {mood.text}
               </motion.div>
             )}
             <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em] mt-3">{session?.user.email}</p>
          </div>
        </div>

        {/* Feature 8: Vibe Tags */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 relative z-10">
          {vibeLabels.map((badge) => (
            <div key={badge} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm transition-all hover:scale-105 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-100 text-gray-500'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              {badge}
            </div>
          ))}
          <button 
             onClick={() => addVibeLabel('Sports Fan')}
             className="w-10 h-10 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 flex items-center justify-center hover:border-primary-500 hover:text-primary-500 transition"
          >
             <Plus size={18} />
          </button>
        </div>

        {/* Feature 19: AI Profile Assistant */}
        <div className={`p-8 rounded-[2.5rem] mb-12 border relative overflow-hidden transition-all duration-500 group ${isDarkMode ? 'bg-indigo-900/10 border-indigo-800/20' : 'bg-indigo-50 border-indigo-100'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
          <div className="flex items-center gap-5 mb-6 relative z-10">
            <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-xl transition-all duration-500 group-hover:rotate-12 ${isDarkMode ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 shadow-indigo-200/50'}`}>
              <Bot size={32} />
            </div>
            <div>
              <h3 className="font-black text-[11px] uppercase tracking-[0.2em] opacity-60">AI Assistant</h3>
              <p className="text-base font-black tracking-tight">Boost your vibe score</p>
            </div>
          </div>
          <p className={`text-sm font-bold mb-6 leading-relaxed relative z-10 opacity-70 ${isDarkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>
            "Students in <span className="text-primary-600 font-black">{college || 'Uni'}</span> are looking for study buddies in <span className="text-primary-600 font-black">{course || 'your course'}</span>. Toggle Study Mode to get 2x matches!"
          </p>
          <button 
            className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all relative z-10"
          >
            Optimize Profile
          </button>
        </div>

        {/* Feature 16: Profile Visitors */}
        <div className={`p-8 rounded-[2.5rem] mb-12 border transition-all ${isDarkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-white shadow-xl shadow-gray-200/20'}`}>
           <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center">
                    <Eye size={20} />
                 </div>
                 <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Recent Visitors</h3>
              </div>
              <span className="text-[9px] font-black text-primary-500 underline underline-offset-4">Upgrade</span>
           </div>
           <div className="flex -space-x-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-14 h-14 rounded-2xl border-4 border-white dark:border-gray-900 bg-gray-100 shadow-lg relative flex items-center justify-center overflow-hidden">
                   <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
                   {i === 5 && <div className="absolute inset-0 bg-primary-500/80 backdrop-blur-sm text-white flex items-center justify-center font-black text-sm">+12</div>}
                </div>
              ))}
           </div>
        </div>

        {/* Feature 15 & 20: Privacy Settings */}
        <div className="space-y-5 mb-12">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 ml-4 mb-4">Privacy & Safety</h3>
          
          <div className={`p-6 rounded-[2.5rem] border flex items-center justify-between transition-all group ${isDarkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all ${isIncognito ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-gray-200 text-gray-400 dark:bg-gray-800'}`}>
                <Ghost size={28} />
              </div>
              <div>
                <p className="text-sm font-black">Incognito Mode</p>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Profile: Hidden</p>
              </div>
            </div>
            <button 
              onClick={() => setIncognito(!isIncognito)}
              className={`w-16 h-9 rounded-full relative transition-all duration-500 ${isIncognito ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-xl ${isIncognito ? 'right-1.5' : 'left-1.5'}`} />
            </button>
          </div>

          <div className={`p-6 rounded-[2.5rem] border flex items-center justify-between transition-all group ${isDarkMode ? 'bg-gray-950 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-3xl flex items-center justify-center transition-all ${isLurkMode ? 'bg-primary-500 text-white shadow-xl shadow-primary-500/30' : 'bg-gray-200 text-gray-400 dark:bg-gray-800'}`}>
                <EyeOff size={28} />
              </div>
              <div>
                <p className="text-sm font-black">Lurk Mode</p>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Activity: Anonymous</p>
              </div>
            </div>
            <button 
              onClick={() => setLurkMode(!isLurkMode)}
              className={`w-16 h-9 rounded-full relative transition-all duration-500 ${isLurkMode ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            >
              <div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-xl ${isLurkMode ? 'right-1.5' : 'left-1.5'}`} />
            </button>
          </div>
        </div>

        <form onSubmit={updateProfile} className="space-y-8">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-5 mb-3">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-7 py-5 rounded-3xl border outline-none transition font-black text-sm ${isDarkMode ? 'bg-gray-950 border-gray-800 focus:border-primary-500' : 'bg-gray-50 border-gray-100 focus:border-primary-500 focus:bg-white shadow-inner'}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-5 mb-3">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={`w-full px-7 py-5 rounded-3xl border outline-none transition font-black text-sm ${isDarkMode ? 'bg-gray-950 border-gray-800 focus:border-primary-500' : 'bg-gray-50 border-gray-100 focus:border-primary-500 focus:bg-white shadow-inner'}`}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-5 mb-3">College / University</label>
            <input
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              placeholder="e.g. University of Zimbabwe"
              className={`w-full px-7 py-5 rounded-3xl border outline-none transition font-black text-sm ${isDarkMode ? 'bg-gray-950 border-gray-800 focus:border-primary-500' : 'bg-gray-50 border-gray-100 focus:border-primary-500 focus:bg-white shadow-inner'}`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-5 mb-3">Course / Department</label>
            <input
              type="text"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. BSc Computer Science"
              className={`w-full px-7 py-5 rounded-3xl border outline-none transition font-black text-sm ${isDarkMode ? 'bg-gray-950 border-gray-800 focus:border-primary-500' : 'bg-gray-50 border-gray-100 focus:border-primary-500 focus:bg-white shadow-inner'}`}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest opacity-40 ml-5 mb-3">About Me</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write something cool..."
              rows={4}
              className={`w-full px-7 py-5 rounded-[2.5rem] border outline-none resize-none transition font-black text-sm ${isDarkMode ? 'bg-gray-950 border-gray-800 focus:border-primary-500' : 'bg-gray-50 border-gray-100 focus:border-primary-500 focus:bg-white shadow-inner'}`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-gradient-to-r from-primary-500 to-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-xs mt-10"
          >
            <Save size={22} strokeWidth={3} />
            {loading ? 'Saving Vibes...' : 'Update Campus Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
