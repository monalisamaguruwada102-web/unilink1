import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { supabase } from '../lib/supabase';
import {
  Calendar, MapPin, Plus, X, Clock, Flame, ChevronRight,
  PartyPopper, BookOpen, Music, Coffee, Trophy, Check, Sparkles
} from 'lucide-react';

type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  event_type: string;
  event_date: string;
  created_by: string;
  attendees: string[];
  max_attendees: number | null;
  image_url: string | null;
  created_at: string;
  creator?: { name: string; avatar_url: string | null; is_verified: boolean };
};

const EVENT_TYPES = [
  { id: 'party', label: 'Party', icon: PartyPopper, color: 'from-pink-500 to-rose-500', bg: 'bg-pink-500/10 text-pink-500' },
  { id: 'study', label: 'Study Group', icon: BookOpen, color: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-500/10 text-indigo-500' },
  { id: 'music', label: 'Music / Open Mic', icon: Music, color: 'from-purple-500 to-violet-500', bg: 'bg-purple-500/10 text-purple-500' },
  { id: 'hangout', label: 'Hangout', icon: Coffee, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10 text-amber-500' },
  { id: 'sports', label: 'Sports', icon: Trophy, color: 'from-green-500 to-emerald-500', bg: 'bg-green-500/10 text-green-500' },
];

function getEventStyle(type: string) {
  return EVENT_TYPES.find(t => t.id === type) || EVENT_TYPES[3];
}

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'Happening now';
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Starting soon';
  if (hours < 24) return `In ${hours}h`;
  const days = Math.floor(hours / 24);
  return `In ${days}d`;
}

export default function CampusEvents() {
  const { session } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', location: '', event_type: 'hangout',
    event_date: '', max_attendees: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const bg = isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
  const card = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm';

  useEffect(() => { fetchEvents(); }, [filterType]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('campus_events')
        .select('*, creator:created_by(name, avatar_url, is_verified)')
        .gte('event_date', new Date(Date.now() - 3600000).toISOString())
        .order('event_date', { ascending: true });
      if (filterType) q = q.eq('event_type', filterType);
      const { data } = await q.limit(50);
      setEvents(data || []);
    } finally { setLoading(false); }
  };

  const handleJoin = async (event: Event) => {
    if (!session) return;
    const uid = session.user.id;
    const isJoined = event.attendees?.includes(uid);
    setJoiningId(event.id);
    try {
      const newAttendees = isJoined
        ? (event.attendees || []).filter(a => a !== uid)
        : [...(event.attendees || []), uid];
      await supabase.from('campus_events').update({ attendees: newAttendees }).eq('id', event.id);
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, attendees: newAttendees } : e));
    } finally { setJoiningId(null); }
  };

  const handleCreate = async () => {
    if (!session || !form.title.trim() || !form.event_date || !form.location.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('campus_events').insert({
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        event_type: form.event_type,
        event_date: form.event_date,
        created_by: session.user.id,
        attendees: [session.user.id],
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : null,
      }).select('*, creator:created_by(name, avatar_url, is_verified)').single();

      if (error) throw error;
      setEvents(prev => [data, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '', location: '', event_type: 'hangout', event_date: '', max_attendees: '' });
    } catch (err: any) {
      alert('Failed to create event: ' + err.message);
    } finally { setSubmitting(false); }
  };

  return (
    <div className={`min-h-screen pb-36 transition-colors duration-500 ${bg}`}>
      {/* Header */}
      <div className={`sticky top-0 z-30 px-6 py-5 border-b backdrop-blur-2xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Campus Events</h1>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Find your people IRL</p>
          </div>
          <button
            id="create-event-btn"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-amber-500/30 active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={3} /> Host Event
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => setFilterType('')}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!filterType ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : (isDarkMode ? 'bg-gray-900 border border-gray-800 opacity-50' : 'bg-gray-100 opacity-50')}`}
          >All</button>
          {EVENT_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setFilterType(filterType === t.id ? '' : t.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === t.id ? `bg-gradient-to-r ${t.color} text-white shadow-lg` : (isDarkMode ? 'bg-gray-900 border border-gray-800 opacity-50' : 'bg-gray-100 opacity-50')}`}
            >
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="px-5 pt-6 space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-60 opacity-30">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <div className="w-20 h-20 rounded-[2.5rem] bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6">
              <Calendar size={36} />
            </div>
            <h3 className="text-xl font-black mb-2">No events yet!</h3>
            <p className="text-sm opacity-40 font-bold uppercase tracking-widest">Be the first to host something epic on campus.</p>
            <button onClick={() => setShowCreate(true)} className="mt-6 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/30">
              Host Now
            </button>
          </div>
        ) : events.map(event => {
          const style = getEventStyle(event.event_type);
          const isJoined = event.attendees?.includes(session?.user?.id || '');
          const attendeeCount = event.attendees?.length || 0;
          const isFull = event.max_attendees ? attendeeCount >= event.max_attendees : false;
          const isHot = attendeeCount >= 10;
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[2.5rem] border overflow-hidden ${card}`}
            >
              {/* Top gradient strip */}
              <div className={`h-2 bg-gradient-to-r ${style.color}`} />

              <div className="p-6">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest ${style.bg}`}>
                        <style.icon size={9} className="inline mr-1" />{style.label}
                      </span>
                      {isHot && (
                        <span className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 flex items-center gap-1">
                          <Flame size={9} /> Hot
                        </span>
                      )}
                      {isFull && (
                        <span className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest bg-gray-500/10 text-gray-400">
                          Full
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black tracking-tight leading-snug">{event.title}</h3>
                  </div>
                  <div className={`text-center px-3 py-2 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-50">
                      {new Date(event.event_date).toLocaleString('default', { month: 'short' })}
                    </p>
                    <p className="text-2xl font-black leading-none">
                      {new Date(event.event_date).getDate()}
                    </p>
                  </div>
                </div>

                {event.description && (
                  <p className="text-sm opacity-70 font-medium leading-relaxed mb-4 line-clamp-2">{event.description}</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap gap-3 mb-5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-50">
                    <MapPin size={11} className="text-amber-500 opacity-100" /> {event.location}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest opacity-50">
                    <Clock size={11} className="text-amber-500 opacity-100" />
                    {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{timeUntil(event.event_date)}
                  </div>
                </div>

                {/* Attendees + CTA */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {(event.attendees || []).slice(0, 5).map((_, i) => (
                        <div key={i} className={`w-7 h-7 rounded-full border-2 ${isDarkMode ? 'border-gray-900 bg-gradient-to-br from-amber-400 to-orange-500' : 'border-white bg-gradient-to-br from-amber-400 to-orange-400'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      {attendeeCount} going
                      {event.max_attendees ? ` / ${event.max_attendees}` : ''}
                    </span>
                  </div>

                  <button
                    id={`join-event-${event.id}`}
                    onClick={() => handleJoin(event)}
                    disabled={joiningId === event.id || (isFull && !isJoined)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                      isJoined
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                        : (isFull && !isJoined)
                          ? 'bg-gray-500/10 text-gray-400 cursor-not-allowed'
                          : `bg-gradient-to-r ${style.color} text-white shadow-lg shadow-amber-500/20`
                    }`}
                  >
                    {joiningId === event.id ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isJoined ? (
                      <><Check size={12} /> Going</>
                    ) : isFull ? (
                      'Full'
                    ) : (
                      <><ChevronRight size={12} /> Join</>
                    )}
                  </button>
                </div>

                {/* Creator */}
                {event.creator && (
                  <div className={`mt-4 pt-4 border-t flex items-center gap-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className="w-6 h-6 rounded-lg overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 shrink-0">
                      {event.creator.avatar_url && <img src={event.creator.avatar_url} className="w-full h-full object-cover" alt="" />}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                      Hosted by {event.creator.name}
                    </span>
                    {event.creator.is_verified && <Sparkles size={10} className="text-blue-500" />}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-end">
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`w-full max-h-[92vh] rounded-t-[3.5rem] flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <div className="p-8 flex items-center justify-between border-b border-gray-500/10">
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-amber-500">Host an Event</h2>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-0.5">Bring campus together</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="p-3 bg-gray-500/10 rounded-2xl"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <input
                  placeholder="Event Title *"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={`w-full p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 focus:border-amber-500' : 'bg-gray-50 border-gray-200 focus:border-amber-500'} transition`}
                />
                <textarea
                  placeholder="Describe your event..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className={`w-full p-5 rounded-2xl border outline-none font-medium text-sm resize-none ${isDarkMode ? 'bg-gray-800 border-gray-700 focus:border-amber-500' : 'bg-gray-50 border-gray-200 focus:border-amber-500'} transition`}
                />
                <input
                  placeholder="Location (e.g. Block A, Library) *"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className={`w-full p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 focus:border-amber-500' : 'bg-gray-50 border-gray-200 focus:border-amber-500'} transition`}
                />
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-3 block">Event Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {EVENT_TYPES.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, event_type: t.id }))}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border font-black text-[9px] uppercase tracking-widest transition-all ${
                          form.event_type === t.id
                            ? `bg-gradient-to-br ${t.color} text-white border-transparent shadow-lg`
                            : (isDarkMode ? 'bg-gray-800 border-gray-700 opacity-50' : 'bg-gray-50 border-gray-200 opacity-60')
                        }`}
                      >
                        <t.icon size={16} />{t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2 block">Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={form.event_date}
                      onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                      className={`w-full p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 focus:border-amber-500' : 'bg-gray-50 border-gray-200 focus:border-amber-500'} transition`}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2 block">Max Attendees</label>
                    <input
                      type="number"
                      placeholder="Unlimited"
                      value={form.max_attendees}
                      onChange={e => setForm(f => ({ ...f, max_attendees: e.target.value }))}
                      className={`w-full p-5 rounded-2xl border outline-none font-bold text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 focus:border-amber-500' : 'bg-gray-50 border-gray-200 focus:border-amber-500'} transition`}
                    />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-500/10 pb-12">
                <button
                  onClick={handleCreate}
                  disabled={submitting || !form.title.trim() || !form.event_date || !form.location.trim()}
                  className="w-full py-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-[2.3rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/30 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {submitting ? 'Creating...' : '🎉 Launch Event'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
