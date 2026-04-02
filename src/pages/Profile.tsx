import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { LogOut, Save, Camera, User, BookOpen, GraduationCap, MapPin, Navigation, Loader, BellRing, Share2, Copy, Check, Zap } from 'lucide-react';
import { AudioToggle } from '../components/features/SafetyAndTheme';
import { requestNotificationPermission, subscribeToPush } from '../lib/pushManager';

export default function Profile() {
  const { profile, session, signOut, fetchProfile } = useAuthStore();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [gender, setGender] = useState('');
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  // Live location state
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'watching' | 'error'>('idle');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');
  const [copied, setCopied] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPushRef = useRef<number>(0);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAge(profile.age?.toString() || '');
      setCollege(profile.college || '');
      setCourse(profile.course || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setGender(profile.gender || '');
      setIsLocationEnabled(profile.is_location_enabled || false);
      if (profile.latitude && profile.longitude) {
        setLiveCoords({ lat: profile.latitude, lng: profile.longitude });
      }
    }
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, [profile]);

  // ── Real-time GPS Watcher ──────────────────────────────────────────────────
  useEffect(() => {
    if (isLocationEnabled && session?.user?.id) {
      if (!('geolocation' in navigator)) {
        setLocationStatus('error');
        return;
      }
      setLocationStatus('watching');
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setLiveCoords({ lat: latitude, lng: longitude });
          setLocationAccuracy(accuracy);
          // Throttle DB writes to once every 30 seconds
          const now = Date.now();
          if (now - lastPushRef.current > 30000) {
            lastPushRef.current = now;
            await supabase.from('users').update({
              latitude,
              longitude,
              location_updated_at: new Date().toISOString(),
            }).eq('id', session.user.id);
          }
        },
        (err) => {
          console.warn('Geolocation watch error:', err);
          setLocationStatus('error');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      // Stop watching
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLocationStatus('idle');
      setLiveCoords(null);
      setLocationAccuracy(null);
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isLocationEnabled, session?.user?.id]);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const path = `${session.user.id}/avatar-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('users').update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() }).eq('id', session.user.id);
      setAvatarUrl(data.publicUrl);
      await fetchProfile(session.user.id);
    } catch (err: any) {
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
      name, age: age ? parseInt(age) : null, college, course, bio, avatar_url: avatarUrl, gender,
      is_location_enabled: isLocationEnabled,
      updated_at: new Date().toISOString(),
    };

    if (liveCoords) {
      updates.latitude = liveCoords.lat;
      updates.longitude = liveCoords.lng;
      updates.location_updated_at = new Date().toISOString();
    } else if (!isLocationEnabled) {
      updates.latitude = null;
      updates.longitude = null;
    }

    try {
      const { error } = await supabase.from('users').upsert(updates);
      if (error) throw error;
      await fetchProfile(session.user.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/u/${profile?.crush_id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/u/${profile?.crush_id}`;
    if (navigator.share) {
      navigator.share({
        title: 'UniLink Secret Crush',
        text: `Send me an anonymous heart on UniLink! 🔥`,
        url: link,
      }).catch(console.error);
    } else {
      handleCopyLink();
    }
  };

  // Map thumbnail using OpenStreetMap static rendering
  const mapThumb = liveCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${liveCoords.lng - 0.005}%2C${liveCoords.lat - 0.005}%2C${liveCoords.lng + 0.005}%2C${liveCoords.lat + 0.005}&layer=mapnik&marker=${liveCoords.lat}%2C${liveCoords.lng}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-36 font-sans">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          My Profile
          {session?.user?.email && ['joshuamujakari15@gmail.com'].includes(session.user.email.toLowerCase()) && (
            <button 
              onClick={() => window.location.href = '/admin'} 
              className="w-6 h-6 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center cursor-pointer hover:bg-red-500 hover:text-white transition-colors"
              title="Admin Portal"
            >
              <div className="w-2 h-2 rounded-full bg-current" />
            </button>
          )}
        </h1>
        <div className="flex items-center gap-4">
          <AudioToggle />
          <button onClick={() => signOut()} className="flex items-center gap-2 text-red-500 font-semibold text-sm hover:text-red-600 transition-colors">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>

      <form onSubmit={saveProfile} className="max-w-md mx-auto px-6 py-8 space-y-8">
        {/* Avatar */}
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
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute bottom-0 right-0 w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white hover:bg-primary-600 transition">
              {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={18} />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">{name || 'Your Name'}</h2>
            <p className="text-sm text-gray-500">{college || 'Student'}</p>
          </div>
        </div>

        {/* 🚀 VIRAL SECRET LINK SECTION */}
        <div className="bg-gradient-to-br from-primary-50 to-indigo-50 rounded-2xl shadow-sm border border-primary-100 p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary-500 text-xs font-black uppercase tracking-wider">
             <Zap size={14} fill="currentColor" /> Viral Secret Crush Link
          </div>
          <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase bg-white/50 p-3 rounded-xl border border-white">
            Share this link on your <span className="text-green-600">WhatsApp Status</span>. Anyone who clicks can send you an anonymous heart. If they're in your crush list, it's a match!
          </p>
          <div className="flex items-stretc gap-2 h-12">
             <div className="flex-1 bg-white border border-primary-100 rounded-xl px-4 flex items-center overflow-hidden">
                <span className="text-[10px] font-bold text-primary-500/50 truncate">
                   {window.location.origin}/u/{profile?.crush_id}
                </span>
             </div>
             <button type="button" onClick={handleCopyLink} className="w-12 bg-white border border-primary-100 rounded-xl flex items-center justify-center text-primary-500 active:scale-90 transition shadow-sm">
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
             </button>
          </div>
          <button type="button" onClick={handleShareLink} className="w-full py-4 bg-primary-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
             <Share2 size={16} /> Share Link to Campus
          </button>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider"><User size={14} /> Basic Information</div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition">
                <option value="">Select Gender...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Age</label>
              <input value={age} onChange={e => setAge(e.target.value)} type="number" placeholder="Age" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
          </div>
        </div>

        {/* School Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider"><GraduationCap size={14} /> Campus Information</div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">College / University</label>
              <input value={college} onChange={e => setCollege(e.target.value)} placeholder="e.g. Kwekwe Polytechnic" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">Course / Department</label>
              <input value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g. Computer Science" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none transition" />
            </div>
          </div>
        </div>

        {/* ── LIVE LOCATION SECTION ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
            <MapPin size={14} /> Live Location Sharing
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Campus Hotspot Locator</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Share your live location so matches can find you on campus.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsLocationEnabled(!isLocationEnabled)}
              className={`w-14 h-8 rounded-full transition-all relative ${isLocationEnabled ? 'bg-primary-500 shadow-inner' : 'bg-gray-200'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm transition-all ${isLocationEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {/* Status indicator */}
          {isLocationEnabled && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
              locationStatus === 'watching' && liveCoords ? 'bg-green-50 text-green-700 border border-green-200'
              : locationStatus === 'error' ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              {locationStatus === 'watching' && !liveCoords && <Loader size={14} className="animate-spin" />}
              {locationStatus === 'watching' && liveCoords && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
              {locationStatus === 'error' && <span className="w-2 h-2 bg-red-500 rounded-full" />}
              <span>
                {locationStatus === 'error' ? '⚠️ Location permission denied. Please allow in browser settings.'
                  : liveCoords ? `📍 Live · ${liveCoords.lat.toFixed(5)}, ${liveCoords.lng.toFixed(5)} · ±${locationAccuracy ? Math.round(locationAccuracy) : '?'}m`
                  : '🔍 Acquiring GPS signal...'}
              </span>
            </div>
          )}

          {/* Live Map Preview */}
          {liveCoords && mapThumb && (
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-lg" style={{ height: 200 }}>
              <iframe
                title="my-location-preview"
                src={mapThumb}
                width="100%"
                height="100%"
                className="pointer-events-none"
                style={{ border: 0 }}
              />
              {/* Pulsing accuracy ring overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  <span className="absolute w-10 h-10 bg-primary-500/20 rounded-full animate-ping -translate-x-1/2 -translate-y-1/2" />
                  <div className="w-5 h-5 bg-primary-500 rounded-full border-2 border-white shadow-xl -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 flex gap-2">
                <a
                  href={`https://www.google.com/maps?q=${liveCoords.lat},${liveCoords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white text-gray-800 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg border border-gray-100 hover:bg-primary-500 hover:text-white transition"
                >
                  Open Maps
                </a>
              </div>
              <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                <Navigation size={9} /> Live
              </div>
            </div>
          )}
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
            <BellRing size={14} /> Background Alerts
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Push Notifications & Screen Wake</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Get native OS pop-ups for calls, matches, and texts even when the app is closed.</p>
            </div>
            
            {pushStatus === 'granted' ? (
              <div className="text-green-500 text-xs font-black uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                ENABLED ✓
              </div>
            ) : pushStatus === 'denied' ? (
              <div className="text-red-500 text-xs font-black uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 text-center">
                BLOCKED ✕<br/><span className="text-[8px]">Unblock in browser</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  if (granted) {
                     setPushStatus('granted');
                     if (session) subscribeToPush(session.user.id);
                  } else {
                     setPushStatus('denied');
                  }
                }}
                className="w-20 py-2 bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                ENABLE
              </button>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider"><BookOpen size={14} /> About Me</div>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
            maxLength={200}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 resize-none focus:ring-2 focus:ring-primary-500 outline-none transition"
          />
          <p className="text-[10px] text-gray-400 text-right">{bio.length}/200</p>
        </div>

        {/* Save */}
        <button
          type="submit"
          disabled={saving}
          className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3 ${saved ? 'bg-green-500' : 'bg-primary-500 hover:bg-primary-600 active:scale-95'}`}
        >
          <Save size={20} />
          {saving ? 'Saving...' : saved ? '✓ Changes Saved!' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

