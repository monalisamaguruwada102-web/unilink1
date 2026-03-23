import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { LogOut, Save, Camera, MapPin, GraduationCap, User, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const KWEKWE_POLY_DEPARTMENTS = [
  'Civil Engineering', 'Electrical Engineering', 'Mechanical Engineering',
  'Business Studies', 'Accounting', 'Marketing', 'Computer Science',
  'Information Technology', 'Fashion & Design', 'Agriculture',
  'Construction', 'Auto Mechanics', 'Plumbing', 'Welding & Fabrication'
];

export default function Profile() {
  const { profile, session, signOut, fetchProfile } = useAuthStore();
  const { isDarkMode } = useFeatureStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [course, setCourse] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [canInstall, setCanInstall] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if we captured the install prompt
    if ((window as any).deferredPrompt) setCanInstall(true);
    window.addEventListener('beforeinstallprompt', () => setCanInstall(true));
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age?.toString() || '');
      setCourse(profile.course || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
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

      // 1. Upload the file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      
      // 3. Update the user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      await fetchProfile(session.user.id);
      console.log('Avatar updated successfully:', publicUrl);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      alert(`❌ Update failed: ${err.message || 'Unknown error'}. Check your internet and storage permissions.`);
    } finally {
      setUploading(false);
    }
  };

  const shareLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!session) return;
        await supabase.from('users').update({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }).eq('id', session.user.id);
        setLocationStatus('done');
      },
      () => setLocationStatus('error')
    );
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);

    const updates = {
      id: session.user.id,
      email: session.user.email,
      name,
      age: age ? parseInt(age) : null,
      college: 'Kwekwe Poly',
      course: course || '',
      bio: bio || '',
      avatar_url: avatarUrl || '',
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('users').upsert(updates);
      if (error) throw error;
      await fetchProfile(session.user.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
       console.error('Profile save error:', err);
       alert(`❌ Profile update failed: ${err.message || 'Check connection'}`);
    } finally {
      setSaving(false);
    }
  };
  const installApp = async () => {
    const prompt = (window as any).deferredPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      (window as any).deferredPrompt = null;
      setCanInstall(false);
    }
  };

  const card = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const input = isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';

  return (
    <div className={`min-h-screen pb-36 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tighter">My Profile</h1>
          {canInstall && (
            <button 
              onClick={installApp}
              className="bg-primary-500 text-white p-2 rounded-xl animate-bounce shadow-lg"
              title="Install App"
            >
              <Download size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-500/10 text-red-500 font-black text-[11px] uppercase tracking-widest"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <form onSubmit={saveProfile} className="px-5 space-y-6 pt-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-3xl overflow-hidden ring-4 ring-primary-500/30 shadow-xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-400 to-indigo-500 flex items-center justify-center">
                  <User size={48} className="text-white/60" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-3 -right-3 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-primary-500/40 border-4 border-gray-950"
            >
              {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={16} />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
          <div className="text-center">
            <p className="font-black text-lg">{name || 'Your Name'}</p>
            <p className="text-sm opacity-40 font-bold">Kwekwe Polytechnic</p>
          </div>
        </div>

        {/* Name & Age */}
        <div className={`p-5 rounded-3xl border space-y-4 ${card}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
            <User size={12} /> Basic Info
          </p>
          <div className="space-y-3">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full Name"
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none focus:ring-2 ring-primary-500 transition ${input}`}
            />
            <input
              value={age}
              onChange={e => setAge(e.target.value)}
              type="number"
              placeholder="Age"
              min={16}
              max={40}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none focus:ring-2 ring-primary-500 transition ${input}`}
            />
          </div>
        </div>

        {/* Department */}
        <div className={`p-5 rounded-3xl border space-y-4 ${card}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
            <GraduationCap size={12} /> Department / Course
          </p>
          <select
            value={course}
            onChange={e => setCourse(e.target.value)}
            className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none focus:ring-2 ring-primary-500 transition ${input}`}
          >
            <option value="">Select your department...</option>
            {KWEKWE_POLY_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Bio */}
        <div className={`p-5 rounded-3xl border space-y-4 ${card}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">About Me</p>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell other students about yourself — your hobbies, what you're studying, what you're looking for..."
            rows={4}
            maxLength={200}
            className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium resize-none outline-none focus:ring-2 ring-primary-500 transition ${input}`}
          />
          <p className="text-[10px] opacity-30 text-right">{bio.length}/200</p>
        </div>

        {/* Location */}
        <div className={`p-5 rounded-3xl border ${card}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2 mb-1">
                <MapPin size={12} /> Location
              </p>
              <p className="text-sm font-bold">
                {locationStatus === 'done' ? '✅ Location shared!' :
                  locationStatus === 'error' ? '❌ Location access denied' :
                  locationStatus === 'loading' ? 'Getting your location...' :
                  'Share your location to show proximity to others'}
              </p>
            </div>
            <button
              type="button"
              onClick={shareLocation}
              disabled={locationStatus === 'loading' || locationStatus === 'done'}
              className={`px-4 py-2 rounded-2xl font-black text-[11px] uppercase tracking-widest transition ${locationStatus === 'done' ? 'bg-green-500/20 text-green-500' : 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'}`}
            >
              {locationStatus === 'loading' ? '...' : locationStatus === 'done' ? 'On! ✓' : 'Share'}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <motion.button
          type="submit"
          disabled={saving}
          whileTap={{ scale: 0.97 }}
          className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${saved ? 'bg-green-500 shadow-green-500/30 text-white' : 'bg-primary-500 shadow-primary-500/30 text-white'}`}
        >
          <Save size={20} /> {saving ? 'Saving...' : saved ? 'Saved! ✓' : 'Save Profile'}
        </motion.button>
      </form>
    </div>
  );
}
