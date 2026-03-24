import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { LogOut, Save, Camera, User, ShieldCheck, Sparkles, BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
  const { profile, session, signOut, fetchProfile } = useAuthStore();
  const { isDarkMode } = useFeatureStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [course, setCourse] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isStudyBuddyMode, setIsStudyBuddyMode] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age?.toString() || '');
      setCourse(profile.course || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setIsStudyBuddyMode(profile.is_study_buddy_mode || false);
    }
  }, [profile]);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const path = `${session.user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      await fetchProfile(session.user.id);
    } catch (err: any) {
      alert(`❌ Update failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyId = async () => {
    if (!idFile || !session) return;
    setUploading(true);
    try {
       const path = `verifications/${session.user.id}/${Date.now()}_id.jpg`;
       const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, idFile);
       if (uploadErr) throw uploadErr;
       
       await supabase.from('verifications').insert({
          user_id: session.user.id,
          id_url: (supabase.storage.from('avatars').getPublicUrl(path)).data.publicUrl,
          status: 'pending'
       });
       
       alert('✅ ID Uploaded! We will review it soon.');
       setShowVerifyModal(false);
    } catch (err: any) {
       alert(`❌ Upload failed: ${err.message}`);
    } finally {
       setUploading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('users').update({
        name,
        age: age ? parseInt(age) : null,
        course,
        bio,
        is_study_buddy_mode: isStudyBuddyMode,
        updated_at: new Date().toISOString(),
      }).eq('id', session.user.id);
      if (error) throw error;
      await fetchProfile(session.user.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
       alert(`❌ Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const card = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm';
  const inputStyle = isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 font-bold text-xs shadow-inner';

  return (
    <div className={`min-h-screen pb-40 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <h1 className="text-xl font-black tracking-tighter uppercase italic">Account</h1>
        <button onClick={() => signOut()} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-500 text-white font-black text-[9px] uppercase shadow-lg shadow-red-500/20 active:scale-95 transition">
          <LogOut size={14} strokeWidth={3} /> Sign Out
        </button>
      </div>

      <form onSubmit={saveProfile} className="px-5 space-y-6 pt-6">
        {/* Verification Status Banner */}
        <div className={`p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-primary-600 shadow-xl shadow-indigo-500/20 text-white overflow-hidden relative`}>
           <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/10 rounded-2xl ring-4 ring-white/5"><Sparkles size={24} /></div>
                 <div>
                    <p className="font-black text-[11px] uppercase tracking-widest text-white/50 mb-0.5">Campus Trust</p>
                    <p className="text-sm font-black italic tracking-tighter uppercase">{profile?.is_verified ? 'Verified Sparkle ✓' : 'Unverified Student'}</p>
                 </div>
              </div>
              {!profile?.is_verified && (
                <button type="button" onClick={() => setShowVerifyModal(true)} className="px-5 py-2.5 bg-white text-primary-600 font-black text-[10px] uppercase rounded-xl shadow-lg active:scale-95 transition">Verify Now</button>
              )}
           </div>
           <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
        </div>

        {/* Study Buddy Toggle */}
        <div className={`p-5 rounded-[2.2rem] border ${card} flex items-center justify-between shadow-sm`}>
           <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl transition-colors ${isStudyBuddyMode ? 'bg-primary-500 text-white rotate-6 shadow-lg shadow-primary-500/30' : 'bg-gray-800 text-gray-500 ring-2 ring-gray-700'}`}>
                 <BookOpen size={20} strokeWidth={3} />
              </div>
              <div>
                 <p className="font-black text-[11px] uppercase tracking-[0.15em] mb-0.5">Study Buddy</p>
                 <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter italic">Open for academic collabs</p>
              </div>
           </div>
           <button type="button" onClick={() => setIsStudyBuddyMode(!isStudyBuddyMode)} className={`w-14 h-8 rounded-full transition-all relative ${isStudyBuddyMode ? 'bg-primary-500 shadow-inner' : 'bg-gray-800 border border-gray-700'}`}>
              <motion.div animate={{ x: isStudyBuddyMode ? 26 : 4 }} className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-xl flex items-center justify-center">
                 {isStudyBuddyMode && <div className="w-1.5 h-1.5 bg-primary-500 rounded-full" />}
              </motion.div>
           </button>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4 py-6 bg-white/5 rounded-[3rem] border border-white/5">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            <div className={`w-28 h-28 rounded-[2.5rem] overflow-hidden ring-4 ring-primary-500/20 shadow-2xl transition-transform group-hover:scale-105 active:scale-95 duration-500`}>
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-800 flex items-center justify-center"><User size={40} className="text-white/10" /></div>}
            </div>
            <div className="absolute -bottom-2 -right-2 w-11 h-11 bg-primary-500 rounded-[1.2rem] flex items-center justify-center text-white border-4 border-gray-950 shadow-xl group-hover:rotate-12 transition-all">
              <Camera size={20} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mt-2 italic">Student Avatar</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
        </div>

        {/* Form Fields */}
        <div className={`p-8 rounded-[3rem] border space-y-5 ${card}`}>
          <div className="space-y-4">
             <div className="space-y-1.5 px-1">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-30 italic">Real Name</p>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Takunda J" className={`w-full px-6 py-4 rounded-2xl border outline-none font-bold text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all ${inputStyle}`} />
             </div>
             
             <div className="grid grid-cols-2 gap-4 px-1">
                <div className="space-y-1.5">
                   <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-30 italic">Age</p>
                   <input value={age} onChange={e => setAge(e.target.value)} type="number" placeholder="21" className={`w-full px-6 py-4 rounded-2xl border outline-none font-bold text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all ${inputStyle}`} />
                </div>
                <div className="space-y-1.5">
                   <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-30 italic">Course</p>
                   <input value={course} onChange={e => setCourse(e.target.value)} placeholder="Eng / IT" className={`w-full px-6 py-4 rounded-2xl border outline-none font-bold text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all ${inputStyle}`} />
                </div>
             </div>

             <div className="space-y-1.5 px-1 pt-2">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-30 italic">Campus Bio</p>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Low energy but high matching potential..." className={`w-full h-32 px-6 py-4 rounded-3xl border outline-none font-bold text-sm resize-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all ${inputStyle}`} />
             </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className={`w-full py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] ${saved ? 'bg-green-500 text-white rotate-0' : 'bg-primary-500 text-white shadow-primary-500/40 hover:-translate-y-1'}`}>
           {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={20} strokeWidth={2.5} />} 
           {saving ? 'Processing...' : saved ? 'Data Sync Complete ✓' : 'Save Connection'}
        </button>
      </form>

      {/* Verification ID Upload Fragment */}
      <AnimatePresence>
        {showVerifyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-8">
             <div className="bg-gray-900 border border-blue-500/20 w-full max-w-sm rounded-[3rem] p-10 text-center shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-blue-500 ring-4 ring-blue-500/5 anim-pulse">
                  <ShieldCheck size={48} />
                </div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">Identity Audit</h2>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed mb-10 px-4">Upload your Poly ID to earn the Sparkle badget and boost match priority.</p>
                
                <div className={`py-12 border-4 border-dashed rounded-[2rem] mb-10 transition-all ${idFile ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' : 'border-white/5 bg-white/5'}`}>
                   {idFile ? (
                     <div className="relative inline-block">
                        <img src={URL.createObjectURL(idFile)} className="h-24 rounded-2xl border-2 border-white/20 shadow-2xl" alt="" />
                        <button onClick={() => setIdFile(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white border-2 border-gray-950"><X size={14} /></button>
                     </div>
                   ) : (
                     <button type="button" onClick={() => idRef.current?.click()} className="flex flex-col items-center gap-4 mx-auto group">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform"><Camera size={24} className="text-white/20 group-hover:text-blue-400" /></div>
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] group-hover:text-blue-400">Scan Student ID</span>
                     </button>
                   )}
                </div>
                <input ref={idRef} type="file" accept="image/*" className="hidden" onChange={e => setIdFile(e.target.files?.[0] || null)} />
                
                <div className="flex gap-4">
                   <button onClick={() => setShowVerifyModal(false)} className="flex-1 py-5 rounded-2xl bg-white/5 text-white/30 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition">Back</button>
                   <button onClick={handleVerifyId} disabled={!idFile || uploading} className="flex-1 py-5 rounded-2xl bg-blue-500 text-white font-black text-[9px] uppercase tracking-widest shadow-xl shadow-blue-500/40 active:scale-95 transition disabled:opacity-30">Verify Securely</button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
