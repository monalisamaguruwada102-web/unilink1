import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Send, ArrowLeft, Mic, Smile, MoreVertical, Play, User, MapPin, Grid, Pause, Check, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { useCallStore } from '../store/useCallStore';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  type?: 'text' | 'sticker' | 'voice';
  read_at?: string | null;
}

interface ChatWindowProps {
  matchId: string;
  otherUser: {
    id: string;
    name: string;
    avatar_url: string;
    last_seen?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_updated_at?: string | null;
    course?: string | null;
    college?: string | null;
  };
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SLANG_STICKERS = [
  'Bho zvese', 'Yabhowa', 'Kusvika rini', 'Zvese-zvese', 'Tichasangana', 'Muchiri bho?', 'Zvatovhara', 'Ndakakuda',
];



// ─── Typing Dot (memoised, never re-renders) ──────────────────────────────────
const TypingDot = memo(({ delay }: { delay: number }) => (
  <motion.span
    className="w-2 h-2 bg-gray-400 rounded-full inline-block"
    animate={{ y: [0, -6, 0] }}
    transition={{ repeat: Infinity, duration: 0.8, delay, ease: 'easeInOut' }}
  />
));

// ─── Voice Player (standalone so it manages its own play state) ───────────────
const VoicePlayer = memo(({ url, isMine }: { url: string; isMine: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setProgress(audio.currentTime / (audio.duration || 1));
    audio.onended = () => { setPlaying(false); setProgress(0); };
    return () => { audio.pause(); audio.src = ''; };
  }, [url]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3 py-1 min-w-[180px]">
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 ${isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-primary-500/20 hover:bg-primary-500/30'}`}
      >
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      {/* Waveform bar + scrub rail */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex gap-0.5 items-end h-4">
          {[2, 4, 6, 3, 7, 5, 4, 6, 3, 5, 7, 4].map((h, i) => (
            <div key={i} className="w-1 rounded-full transition-all" style={{ height: `${h * 2}px`, background: progress > i / 12 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)' }} />
          ))}
        </div>
      </div>
      <span className="text-[9px] font-black opacity-50 tabular-nums">{fmt(duration)}</span>
    </div>
  );
});

// ─── Single message bubble (memoised — only re-renders when content changes) ──
const MessageBubble = memo(({ msg, isMine, isDarkMode }: { msg: Message; isMine: boolean; isDarkMode: boolean }) => {
  const ts = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });



  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 6 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm relative
          ${isMine
            ? 'bg-primary-500 text-white rounded-tr-sm'
            : `border rounded-tl-sm ${isDarkMode ? 'bg-gray-900 text-gray-100 border-gray-800' : 'bg-white text-gray-800 border-gray-100'}`
          }`}
      >
        {msg.type === 'sticker' ? (
          <span className="text-xl font-black italic uppercase tracking-tighter bg-white/20 px-3 py-1 rounded-lg border border-white/20">{msg.content}</span>
        ) : msg.type === 'voice' ? (
          <VoicePlayer url={msg.content} isMine={isMine} />
        ) : (
          <p className="font-medium text-[13px] leading-relaxed">{msg.content}</p>
        )}
        <div className="flex items-center justify-end gap-1 mt-1.5 opacity-40">
           <p className="text-[8px] font-bold uppercase tracking-widest">{ts}</p>
           {isMine && (
             <div className="flex -space-x-1 ml-0.5">
               <Check size={8} className={msg.read_at ? 'text-blue-400' : 'text-white'} strokeWidth={4} />
               <Check size={8} className={msg.read_at ? 'text-blue-400' : 'text-white'} strokeWidth={4} />
             </div>
           )}
        </div>
      </motion.div>
    </div>
  );
});

// ─── Main ChatWindow ────────────────────────────────────────────────────────
const PAGE_SIZE = 30;

export default function ChatWindow({ matchId, otherUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [otherUserPosts, setOtherUserPosts] = useState<any[]>([]);

  const [uploading, setUploading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);

  const { session } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const msgsContainerRef = useRef<HTMLDivElement>(null);

  const { callStatus, setIncomingOffer, setCallStatus, endCall, addRemoteIceCandidate, handleCallAnswer, initCall } = useCallStore();

  // Moved call logic to useCallStore

  // ── Derived online status from last_seen (fallback) ──────────────────────
  const isOnlineByLastSeen = otherUser.last_seen
    ? new Date().getTime() - new Date(otherUser.last_seen).getTime() < 180000
    : false;
  const isOnline = isOtherOnline || isOnlineByLastSeen;

  // ─── Presence / Typing Broadcaster ───────────────────────────────────────
  const broadcastTyping = useCallback((typing: boolean) => {
    presenceChannelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: session?.user.id, typing },
    });
  }, [session?.user.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    broadcastTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  // ─── Load initial messages (paginated) ───────────────────────────────────
  const fetchMessages = useCallback(async (pageNum: number, prepend = false) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, pageNum * PAGE_SIZE + PAGE_SIZE - 1);

    if (!data) return;
    if (data.length < PAGE_SIZE) setHasMore(false);
    const ordered = [...data].reverse();
    setMessages(prev => prepend ? [...ordered, ...prev] : ordered);
  }, [matchId]);

  // ─── Infinite scroll upward ───────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const prev = msgsContainerRef.current;
    const prevHeight = prev?.scrollHeight || 0;
    await fetchMessages(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
    // Maintain scroll position
    requestAnimationFrame(() => {
      if (prev) prev.scrollTop = prev.scrollHeight - prevHeight;
    });
  }, [hasMore, loadingMore, page, fetchMessages]);

  // IntersectionObserver for top sentinel
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { threshold: 0.1 });
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [loadMore]);

  // ─── Channel setup ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages(0);

    // 1. Messages realtime
    const msgChannel = supabase
      .channel(`chat_${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload: any) => {
        setMessages(prev => [...prev, payload.new as Message]);
        if (payload.new.sender_id !== session?.user.id) {
          import('../lib/audioManager').then(({ playSound }) => playSound('message'));
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    // 2. Typing + Online presence via Broadcast
    const presenceChannel = supabase.channel(`presence_${matchId}`, {
      config: { broadcast: { self: false } },
    });

    presenceChannel
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload.payload.user_id === otherUser.id) {
          setIsOtherTyping(payload.payload.typing);
          clearTimeout(typingTimeoutRef.current);
          if (payload.payload.typing) {
            typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3500);
          }
        }
      })
      .on('broadcast', { event: 'online' }, (payload: any) => {
        if (payload.payload.user_id === otherUser.id) {
          setIsOtherOnline(true);
        }
      })
      .on('broadcast', { event: 'call_offer' }, (payload: any) => {
        if (payload.payload.to === session?.user.id) {
          setCallStatus('ringing');
          setIncomingOffer(payload.payload.offer);
        }
      })
      .on('broadcast', { event: 'call_answer' }, (payload: any) => {
        if (payload.payload.to === session?.user.id) {
          handleCallAnswer(payload.payload.answer);
        }
      })
      .on('broadcast', { event: 'ice_candidate' }, (payload: any) => {
        if (payload.payload.to === session?.user.id) {
          addRemoteIceCandidate(payload.payload.candidate);
        }
      })
      .on('broadcast', { event: 'call_end' }, (payload: any) => {
        if (payload.payload.to === session?.user.id) {
          endCall(false, session?.user.id || '');
        }
      })
      .on('broadcast', { event: 'call_declined' }, (payload: any) => {
        if (payload.payload.to === session?.user.id) {
          setCallStatus('declined');
          setTimeout(() => endCall(false, session?.user.id || ''), 2000);
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          // Announce our presence every 25s
          const announce = () => presenceChannel.send({ type: 'broadcast', event: 'online', payload: { user_id: session?.user.id } });
          announce();
          const hb = setInterval(announce, 25000);
          (presenceChannel as any)._hb = hb;
        }
      });

    presenceChannelRef.current = presenceChannel;

    // Also mark other user offline after 45s of no heartbeat
    const onlineTimer = setInterval(() => {
      setIsOtherOnline(false);
    }, 45000);

    return () => {
      // Mark as read immediately on open
      if (session?.user.id) {
         supabase.rpc('mark_match_as_read', { target_match_id: matchId, my_id: session.user.id });
      }
      supabase.removeChannel(msgChannel);
      clearInterval((presenceChannel as any)._hb);
      supabase.removeChannel(presenceChannel);
      clearInterval(onlineTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [matchId, otherUser.id, session?.user.id, fetchMessages]);

  useEffect(() => {
    import('../lib/audioManager').then(({ playLoop, stopLoop }) => {
      if (callStatus === 'ringing') {
        playLoop('ringtone');
      } else if (callStatus === 'calling') {
        playLoop('dialing');
      } else {
        stopLoop();
      }
    });

    return () => {
      import('../lib/audioManager').then(({ stopLoop }) => stopLoop());
    };
  }, [callStatus]);

  // Handle global cross-tab Accept Call redirect
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ─── Voice recording ──────────────────────────────────────────────────────
  const startRecording = async () => {
    if (isRecording || mediaRecorderRef.current?.state === 'recording') return; // Prevent overlapping orphan recorders
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      // Pick best available codec
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { 
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); 
      };
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = []; // flush immediately after creating blob
        await uploadVoiceNote(blob, mimeType);
      };
      mediaRecorder.start(100); // collect every 100ms for lower latency
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert('🎙️ Microphone access denied! Please allow microphone access in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadVoiceNote = async (blob: Blob, mimeType: string) => {
    if (!session || blob.size < 100) return; // Ignore empty/corrupt recordings
    setUploading(true);
    
    // Clean MIME type to remove codec info which can confuse some storage filters
    const cleanMimeType = mimeType.split(';')[0];
    const ext = cleanMimeType.includes('ogg') ? 'ogg' : cleanMimeType.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `messages/${session.user.id}/voice_${Date.now()}.${ext}`;
    
    try {
      // 1. Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('post-images') // fallback to this if messages bucket doesn't exist
        .upload(fileName, blob, { 
          contentType: cleanMimeType,
          upsert: true 
        });

      if (error) throw error;

      // 2. Get Public URL (simplified syntax to avoid any TS confusion)
      const res = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);
      
      const publicUrl = res.data?.publicUrl;

      if (!publicUrl) throw new Error('Failed to generate public URL');

      // 3. Send Message
      await handleSend(publicUrl, 'voice');
    } catch (err: any) {
      console.error('Voice record error:', err);
      alert(`❌ Voice note failed: ${err.message || 'Check storage permissions'}`);
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  
  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    // Ensure appending 'Z' if missing to enforce UTC parsing from database
    const utcDate = lastSeen.endsWith('Z') ? lastSeen : `${lastSeen}Z`;
    const targetDate = new Date(utcDate);
    const now = new Date();
    
    if (isNaN(targetDate.getTime())) return 'Recently'; // Safe fallback
    
    const seconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    
    const hours = Math.floor(seconds / 3600);
    if (hours < 24 && now.getDate() === targetDate.getDate()) {
      return `Today at ${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.getDate() === targetDate.getDate()) {
      return `Yesterday at ${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `${targetDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };



  // ─── Fetch other user's posts (for profile sheet) ─────────────────────────
  const fetchOtherUserPosts = useCallback(async () => {
    const { data } = await supabase.from('posts').select('id, content, image_url, likes, created_at').eq('user_id', otherUser.id).order('created_at', { ascending: false }).limit(6);
    if (data) setOtherUserPosts(data);
  }, [otherUser.id]);

  // ─── Send Message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async (content: string, type: 'text' | 'sticker' | 'voice' = 'text') => {
    if (!content.trim() || !session) return;
    setInput('');
    setShowStickers(false);
    broadcastTyping(false);

    const { error } = await supabase.from('messages').insert({ match_id: matchId, sender_id: session.user.id, content, type });
    if (error) { alert(`❌ ${error.message}`); return; }

    supabase.from('notifications').insert({
      user_id: otherUser.id,
      sender_id: session.user.id,
      type: 'message',
      content: type === 'voice' ? 'Sent a voice note 🎙️' : content.length > 30 ? `${content.slice(0, 30)}...` : content,
      post_id: matchId,
    });
  }, [session, matchId, otherUser.id, broadcastTyping]);

  // ─── Derived location ─────────────────────────────────────────────────────
  const hasLocation = !!(otherUser.latitude && otherUser.longitude);
  const locationIsLive = otherUser.location_updated_at
    ? new Date().getTime() - new Date(otherUser.location_updated_at).getTime() < 300000
    : false;
  const mapThumb = hasLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${otherUser.longitude! - 0.006}%2C${otherUser.latitude! - 0.006}%2C${otherUser.longitude! + 0.006}%2C${otherUser.latitude! + 0.006}&layer=mapnik&marker=${otherUser.latitude}%2C${otherUser.longitude}`
    : null;

  const bg = isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50';
  const cardBg = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto transition-colors duration-500 overflow-hidden ${bg}`}>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 w-full max-w-md z-20 border-b shadow-sm pt-safe ${isDarkMode ? 'bg-gray-900/95 backdrop-blur-xl border-gray-800' : 'bg-white/95 backdrop-blur-xl border-gray-100'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className={`p-2 rounded-full transition ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
              <ArrowLeft size={22} />
            </button>

            {/* Avatar + Online dot */}
            <button onClick={() => { setShowProfileSheet(true); fetchOtherUserPosts(); }} className="relative flex-shrink-0">
              {otherUser.avatar_url ? (
                <img src={otherUser.avatar_url} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover border-2 border-primary-500/50" />
              ) : (
                <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-600 font-black text-base border-2 border-primary-500/30">
                  {otherUser.name.charAt(0)}
                </div>
              )}
              {/* Online presence indicator */}
              <AnimatePresence>
                {isOnline && (
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 bg-green-500"
                  />
                )}
              </AnimatePresence>
              {!isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 bg-gray-400" />
              )}
            </button>

            <div className="min-w-0">
              <h2 className="font-black text-[15px] tracking-tight truncate">{otherUser.name}</h2>
              <AnimatePresence mode="wait">
                <motion.p
                  key={isOtherTyping ? 'typing' : isOnline ? 'online' : 'offline'}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  className={`text-[10px] font-black uppercase tracking-widest leading-none mt-0.5 ${
                    isOtherTyping ? 'text-primary-400'
                    : isOnline ? 'text-green-500'
                    : 'text-gray-400'
                  }`}
                >
                  {isOtherTyping ? 'typing...' : isOnline ? '● Online' : `Last seen ${formatLastSeen(otherUser.last_seen)}`}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Three-dot menu and Call */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (session?.user.id) initCall(true, otherUser, matchId, session.user.id);
              }}
              className={`p-2.5 rounded-2xl transition opacity-70 hover:opacity-100 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
            >
              <Phone size={18} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(m => !m)}
              className={`p-2.5 rounded-2xl transition ${showMenu ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-100') : 'opacity-40 hover:opacity-100'}`}
            >
              <MoreVertical size={18} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className={`absolute right-0 top-12 z-50 w-52 rounded-[1.5rem] border shadow-2xl overflow-hidden ${cardBg}`}
                >
                  {/* View Profile */}
                  <button
                    onClick={() => { setShowMenu(false); setShowProfileSheet(true); fetchOtherUserPosts(); }}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-[11px] font-black uppercase tracking-widest transition hover:bg-gray-500/10`}
                  >
                    <User size={15} className="text-primary-500" /> View Profile
                  </button>

                  {/* View Location */}
                  {hasLocation && (
                    <button
                      onClick={() => { setShowMenu(false); setShowProfileSheet(true); fetchOtherUserPosts(); }}
                      className={`w-full flex items-center gap-3 px-5 py-4 text-[11px] font-black uppercase tracking-widest transition hover:bg-gray-500/10`}
                    >
                      <MapPin size={15} className={locationIsLive ? 'text-green-500' : 'text-gray-400'} />
                      {locationIsLive ? 'Live Location' : 'Last Location'}
                    </button>
                  )}

                  {/* View Posts */}
                  <button
                    onClick={() => { setShowMenu(false); setShowProfileSheet(true); fetchOtherUserPosts(); }}
                    className={`w-full flex items-center gap-3 px-5 py-4 text-[11px] font-black uppercase tracking-widest transition hover:bg-gray-500/10`}
                  >
                    <Grid size={15} className="text-indigo-500" /> Their Posts
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ── MESSAGE LIST ─────────────────────────────────────────────────── */}
      <div ref={msgsContainerRef} className="flex-1 overflow-y-auto px-4 pt-24 pb-32 hide-scrollbar">
        {/* Top sentinel for infinite scroll */}
        <div ref={topSentinelRef} className="h-1" />
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin opacity-50" />
          </div>
        )}

        <div className="space-y-3">
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={msg.sender_id === session?.user.id}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>

        {/* Typing indicator */}
        <AnimatePresence>
          {isOtherTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="flex justify-start mt-3"
            >
              <div className={`flex items-center gap-1.5 px-5 py-4 rounded-2xl rounded-tl-sm border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <TypingDot delay={0} />
                <TypingDot delay={0.15} />
                <TypingDot delay={0.3} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* ── INPUT BAR ────────────────────────────────────────────────────── */}
      <div className={`fixed bottom-0 w-full max-w-md border-t z-20 pb-safe ${isDarkMode ? 'bg-gray-900/95 backdrop-blur-xl border-gray-800' : 'bg-white/95 backdrop-blur-xl border-gray-100'}`}>
        {/* Sticker tray */}
        <AnimatePresence>
          {showStickers && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="grid grid-cols-2 gap-2 p-4 border-b border-gray-500/10"
            >
              {SLANG_STICKERS.map(s => (
                <button key={s} onClick={() => handleSend(s, 'sticker')}
                  className="py-3 px-4 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-300 font-black text-xs uppercase tracking-tighter italic border border-primary-100 dark:border-primary-900 hover:scale-105 active:scale-95 transition">
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uploading banner */}
        <AnimatePresence>
          {uploading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mx-4 mt-2 mb-1 px-4 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Uploading voice note...</span>
            </motion.div>
          )}
        </AnimatePresence>



        <form onSubmit={e => { e.preventDefault(); handleSend(input); }} className="flex items-center gap-2 p-3">
          {/* Sticker */}
          <button type="button" onClick={() => setShowStickers(s => !s)}
            className={`p-3.5 rounded-2xl transition shrink-0 ${showStickers ? 'bg-primary-100 text-primary-600' : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <Smile size={20} />
          </button>


          {/* Input */}
          <div className={`flex-1 rounded-2xl flex items-center px-4 transition-all duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} ${isRecording ? 'ring-2 ring-red-500/50' : ''}`}>
            <input
              type="text"
              value={input}
              disabled={isRecording}
              onChange={handleInputChange}
              placeholder={isRecording ? `REC ${formatTime(recordingTime)}` : 'Type a message...'}
              className="flex-1 bg-transparent py-4 text-sm font-medium focus:outline-none text-black dark:text-white"
            />
            {isRecording && (
              <motion.div animate={{ opacity: [1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1 shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
             <button
               type={input.trim() ? "submit" : "button"}
               onClick={(e) => {
                 e.preventDefault();
                 if (input.trim()) {
                   handleSend(input);
                 } else if (isRecording) {
                   stopRecording();
                 } else {
                   startRecording();
                 }
               }}
               className={`p-3.5 rounded-2xl transition-all flex items-center justify-center
                 ${input.trim() 
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20 active:scale-95' 
                    : isRecording 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                      : (isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500')
                 }`}
             >
               {input.trim() ? <Send size={20} /> : isRecording ? <Send size={20} className="text-white fill-current" /> : <Mic size={20} />}
             </button>








          </div>
        </form>
      </div>

      {/* ── PROFILE / LOCATION / POSTS SHEET ─────────────────────────────── */}
      <AnimatePresence>
        {showProfileSheet && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex flex-col justify-end"
            onClick={() => setShowProfileSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className={`rounded-t-[3rem] max-h-[92vh] overflow-y-auto hide-scrollbar ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
              </div>

              {/* Avatar + name */}
              <div className="flex flex-col items-center pt-4 pb-6 px-6">
                {otherUser.avatar_url ? (
                  <img src={otherUser.avatar_url} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-primary-500/20 shadow-2xl" alt="" />
                ) : (
                  <div className="w-24 h-24 rounded-[2rem] bg-primary-500/10 flex items-center justify-center text-primary-600 font-black text-4xl border-4 border-primary-500/20">
                    {otherUser.name.charAt(0)}
                  </div>
                )}
                <h3 className="text-2xl font-black tracking-tight mt-4">{otherUser.name}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  {isOnline && <span className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online Now</span>}
                  {otherUser.course && <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{otherUser.course}</span>}
                </div>
              </div>

              {/* Location map */}
              {hasLocation && mapThumb && (
                <div className="px-5 pb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={12} className={locationIsLive ? 'text-green-500' : 'text-gray-400'} />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      {locationIsLive ? '🟢 Live Location' : '🕓 Last Known Location'}
                    </span>
                  </div>
                  <div className="relative rounded-[2rem] overflow-hidden border border-gray-200 dark:border-gray-800 shadow-xl" style={{ height: 200 }}>
                    <iframe
                      src={mapThumb}
                      title="user-location"
                      width="100%"
                      height="100%"
                      style={{ border: 0, filter: isDarkMode ? 'invert(90%) hue-rotate(180deg)' : 'none' }}
                    />
                    {locationIsLive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="w-12 h-12 rounded-full bg-green-500/20 animate-ping" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[9px] font-black bg-green-500 text-white uppercase tracking-widest">
                      {otherUser.latitude?.toFixed(4)}°, {otherUser.longitude?.toFixed(4)}°
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${otherUser.latitude},${otherUser.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 px-3 py-1.5 bg-white text-gray-800 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg border border-gray-100 hover:bg-primary-500 hover:text-white transition"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              )}

              {/* Their Posts */}
              {otherUserPosts.length > 0 && (
                <div className="px-5 pb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Posts</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary-500">{otherUserPosts.length} posts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {otherUserPosts.map(post => (
                      <div key={post.id} className={`rounded-2xl overflow-hidden border aspect-square ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                        {post.image_url ? (
                          <img src={post.image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <p className="text-[9px] font-bold text-center line-clamp-3 opacity-60">{post.content}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="px-5 pb-12 flex gap-3">
                <button
                  onClick={() => setShowProfileSheet(false)}
                  className="flex-1 py-4 bg-primary-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-500/30 active:scale-95 transition"
                >
                  Back to Chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call UI moved to global ActiveCallOverlay */}
    </div>
  );
}
