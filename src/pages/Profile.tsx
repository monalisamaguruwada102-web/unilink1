import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { LogOut, Save, Camera, User, ShieldCheck, Sparkles, BookOpen, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const KWEKWE_POLY_DEPARTMENTS = [
  'Civil Engineering', 'Electrical Engineering', 'Mechanical Engineering',
  'Business Studies', 'Accounting', 'Marketing', 'Computer Science',
  'Information Technology', 'Fashion & Design', 'Agriculture',
  'Construction', 'Auto Mechanics', 'Plumbing', 'Welding & Fabrication'
];

const CAMPUS_ZONES = [
  'Block A', 'Block B', 'Block C', 'Workshop Area', 'Library', 'Main Gate', 'Sports Field', 'Dining Hall'
];

export default function Profile() {
  const { profile, session, signOut, fetchProfile } = useAuthStore();
  const { isDarkMode } = useFeatureStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [course, setCourse] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [campusZone, setCampusZone] = useState('');
  const [department, setDepartment] = useState('');
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
      setCampusZone(profile.campus_zone || '');
      setDepartment(profile.department || '');
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
        campus_zone: campusZone,
        department,
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
  const inputStyle = isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 font-bold text-xs';

  return (
    <div className={`min-h-screen pb-36 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <h1 className="text-xl font-black tracking-tighter uppercase italic">My Profile</h1>
        <button onClick={() => signOut()} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-500/10 text-red-500 font-bold text-[10px] uppercase">
          <LogOut size={14} /> Out
        </button>
      </div>

      <form onSubmit={saveProfile} className="px-5 space-y-6 pt-6">
        <div className={`p-5 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20`}>
           <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-white/20 rounded-2xl"><Sparkles size={20} /></div>
                 <div>
                    <p className="font-black text-[10px] uppercase tracking-widest">Verification Status</p>
                    <p className="text-[9px] font-bold opacity-70 uppercase leading-none">{profile?.is_verified ? 'Identity Verified ✓' : 'Status: Pending'}</p>
                 </div>
              </div>
              {!profile?.is_verified && (
                <button type="button" onClick={() => setShowVerifyModal(true)} className="px-4 py-2 bg-white text-black font-black text-[10px] uppercase rounded-xl active:scale-95 transition">Verify</button>
              )}
           </div>
        </div>

        <div className={`p-4 rounded-[2rem] border ${card} flex items-center justify-between`}>
           <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isStudyBuddyMode ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                 <BookOpen size={20} />
              </div>
              <div>
                 <p className="font-black text-[10px] uppercase tracking-widest">Study Buddy</p>
              </div>
           </div>
           <button type="button" onClick={() => setIsStudyBuddyMode(!isStudyBuddyMode)} className={`w-12 h-7 rounded-full transition relative ${isStudyBuddyMode ? 'bg-indigo-500' : 'bg-gray-800'}`}>
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${isStudyBuddyMode ? 'left-6' : 'left-1'}`} />
           </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <div className={`w-24 h-24 rounded-[2rem] overflow-hidden ring-4 ring-primary-500/20 shadow-2xl`}>
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-800" />}
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white border-4 border-gray-950">
              <Camera size={16} />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
        </div>

        <div className={`p-6 rounded-[2.5rem] border space-y-4 ${card}`}>
          <div className="space-y-3">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-2"><User size={12} /> Personal</p>
             <input value={name} onChange={e => setName(e.target.value)} placeholder="Display Name" className={`w-full px-5 py-4 rounded-xl border outline-none ${inputStyle}`} />
             <input value={age} onChange={e => setAge(e.target.value)} type="number" placeholder="Age" className={`w-full px-5 py-4 rounded-xl border outline-none ${inputStyle}`} />
          </div>
          <div className="space-y-3 pt-4 border-t border-gray-800">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 flex items-center gap-2"><Map size={12} /> Campus Location</p>
             <select value={campusZone} onChange={e => setCampusZone(e.target.value)} className={`w-full px-5 py-4 rounded-xl border outline-none ${inputStyle}`}>
                <option value="">Campus Zone</option>
                {CAMPUS_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
             </select>
             <select value={department} onChange={e => setDepartment(e.target.value)} className={`w-full px-5 py-4 rounded-xl border outline-none ${inputStyle}`}>
                <option value="">Department</option>
                {KWEKWE_POLY_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
             </select>
          </div>
        </div>

        <button type="submit" disabled={saving} className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.15em] transition flex items-center justify-center gap-3 ${saved ? 'bg-green-500' : 'bg-primary-500 text-white'}`}>
          <Save size={18} /> {saving ? 'Wait...' : saved ? 'Done' : 'Save Profile'}
        </button>
      </form>

      <AnimatePresence>
        {showVerifyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6">
             <div className="bg-gray-900 border border-blue-500/20 w-full max-w-sm rounded-[2.5rem] p-8 text-center">
                <ShieldCheck size={48} className="mx-auto mb-6 text-blue-500" />
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter mb-4">Verification</h2>
                <div className="py-8 border-2 border-dashed border-blue-500/10 rounded-2xl mb-6 bg-blue-500/5">
                   {idFile ? <img src={URL.createObjectURL(idFile)} className="h-20 mx-auto rounded-lg" alt="" /> : <button onClick={() => idRef.current?.click()} className="text-[10px] font-black text-blue-400 uppercase">Upload Student ID</button>}
                </div>
                <input ref={idRef} type="file" accept="image/*" className="hidden" onChange={e => setIdFile(e.target.files?.[0] || null)} />
                <div className="flex gap-3">
                   <button onClick={() => setShowVerifyModal(false)} className="flex-1 py-4 rounded-xl bg-white/5 text-white/40 font-black text-[10px] uppercase">Back</button>
                   <button onClick={handleVerifyId} disabled={!idFile || uploading} className="flex-1 py-4 rounded-xl bg-blue-500 text-white font-black text-[10px] uppercase shadow-lg shadow-blue-500/30">Submit</button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
