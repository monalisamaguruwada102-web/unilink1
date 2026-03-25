import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, Save, Camera, User, BookOpen, GraduationCap } from 'lucide-react';

export default function Profile() {
  const { profile, session, signOut, fetchProfile } = useAuthStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age?.toString() || '');
      setCollege(profile.college || '');
      setCourse(profile.course || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setIsLocationEnabled(profile.is_location_enabled || false);
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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (updateError) throw updateError;
      setAvatarUrl(publicUrl);
      await fetchProfile(session.user.id);
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setSaving(true);

    const updates: Record<string, any> = {
      id: session.user.id,
      email: session.user.email,
      name,
      age: age ? parseInt(age) : null,
      college: college || '',
      course: course || '',
      bio: bio || '',
      avatar_url: avatarUrl || '',
      is_location_enabled: isLocationEnabled,
      updated_at: new Date().toISOString(),
    };

    try {
      if (isLocationEnabled && "geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          updates.latitude = position.coords.latitude;
          updates.longitude = position.coords.longitude;
          updates.location_updated_at = new Date().toISOString();
        } catch (geoErr) {
          console.warn('Geolocation failed:', geoErr);
          // Proceed saving profile without strict location if denied or failed
        }
      } else if (!isLocationEnabled) {
        updates.latitude = null;
        updates.longitude = null;
      }

      const { error } = await supabase.from('users').upsert(updates);
      if (error) throw error;
      await fetchProfile(session.user.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
       console.error('Profile save error:', err);
       alert('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-36 font-sans">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-red-500 font-semibold text-sm hover:text-red-600 transition-colors"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      <form onSubmit={saveProfile} className="max-w-md mx-auto px-6 py-8 space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white shadow-xl bg-gray-200">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={48} className="text-gray-400" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-black/10 border-2 border-white hover:bg-primary-600 transition"
            >
              {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={18} />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">{name || 'Your Name'}</h2>
            <p className="text-sm text-gray-500">{college || 'Student'}</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
           <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
             <User size={14} /> Basic Information
           </div>
           
           <div className="space-y-4">
             <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Full Name</label>
               <input
                 value={name}
                 onChange={e => setName(e.target.value)}
                 placeholder="Full Name"
                 className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none transition"
               />
             </div>
             <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Age</label>
               <input
                 value={age}
                 onChange={e => setAge(e.target.value)}
                 type="number"
                 placeholder="Age"
                 className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none transition"
               />
             </div>
           </div>
        </div>

        {/* School Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
           <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
             <GraduationCap size={14} /> Campus Information
           </div>
           
           <div className="space-y-4">
             <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">College / University</label>
               <input
                 value={college}
                 onChange={e => setCollege(e.target.value)}
                 placeholder="e.g. Kwekwe Polytechnic"
                 className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none transition"
               />
             </div>
             <div>
               <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Course / Department</label>
               <input
                 value={course}
                 onChange={e => setCourse(e.target.value)}
                 placeholder="e.g. Computer Science"
                 className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none transition"
               />
             </div>
           </div>
        </div>

        {/* Location Privacy */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
           <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
             <BookOpen size={14} /> Privacy & Discovery
           </div>
           
           <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
             <div>
               <h4 className="text-sm font-bold text-gray-900">Campus Hotspot Locator</h4>
               <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Let others see when you are on campus to trigger vibes and meetups.</p>
             </div>
             <button
                type="button"
                onClick={() => setIsLocationEnabled(!isLocationEnabled)}
                className={`w-14 h-8 rounded-full transition-all relative ${isLocationEnabled ? 'bg-primary-500 shadow-inner' : 'bg-gray-200'}`}
             >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-all ${isLocationEnabled ? 'left-7' : 'left-1'}`} />
             </button>
           </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
             <BookOpen size={14} /> About Me
          </div>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
            maxLength={200}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium resize-none focus:ring-2 focus:ring-primary-500 outline-none transition"
          />
          <p className="text-[10px] text-gray-400 text-right">{bio.length}/200</p>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3 ${saved ? 'bg-green-500' : 'bg-primary-500 hover:bg-primary-600 active:scale-95'}`}
        >
          <Save size={20} />
          {saving ? 'Saving...' : saved ? 'Changes Saved!' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}
