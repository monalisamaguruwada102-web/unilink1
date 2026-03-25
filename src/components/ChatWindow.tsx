import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowLeft, Mic, Smile, MoreVertical, Play, Dice5, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  type?: 'text' | 'sticker' | 'voice' | 'vibe_check';
}

interface ChatWindowProps {
  matchId: string;
  otherUser: {
    id: string;
    name: string;
    avatar_url: string;
    last_seen?: string;
  };
  onBack: () => void;
}

const SLANG_STICKERS = [
  'Bho zvese', 'Yabhowa', 'Kusvika rini', 'Zvese-zvese', 'Tichasangana', 'Muchiri bho?', 'Zvatovhara', 'Ndakakuda'
];

// 🎲 Vibe Check Questions
const VIBE_CHECKS = [
  '🌙 Late night study OR ☀️ Early morning grind?',
  '📚 Library silence OR 🎧 Music while studying?',
  '🍕 Pizza at the canteen OR 🍱 Packed lunch from home?',
  '📱 Text first OR 😅 Wait forever?',
  '🏃 Walk to lectures OR 🚶 Always late?',
  '☕ Coffee addict OR 💧 Water only?',
  '🎓 Study hard now OR 🎉 Figure it out later?',
  '🤫 Sit at the front OR 👀 Hide at the back?',
  '😴 Nap in free periods OR 📖 Catch up on notes?',
  '❤️ Crush on someone in class OR 🙅 Never mix love and school?',
];

// Typing indicator dot animation
const TypingDot = ({ delay }: { delay: number }) => (
  <motion.span
    className="w-2 h-2 bg-gray-400 rounded-full inline-block"
    animate={{ y: [0, -6, 0] }}
    transition={{ repeat: Infinity, duration: 0.8, delay, ease: 'easeInOut' }}
  />
);

export default function ChatWindow({ matchId, otherUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [vibeCheckQuestion, setVibeCheckQuestion] = useState<string | null>(null);

  const { session } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);

  const isOnline = otherUser.last_seen
    ? new Date().getTime() - new Date(otherUser.last_seen).getTime() < 60000 * 3
    : false;

  // ─── Presence / Typing Tracker ───────────────────────────────────────────
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

  // ─── Initial Setup ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages();

    // 1. Postgres Changes channel for new messages
    const msgChannel = supabase
      .channel(`chat_${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    // 2. Broadcast channel for typing presence
    const presenceChannel = supabase.channel(`typing_${matchId}`, {
      config: { broadcast: { self: false } },
    });

    presenceChannel.on('broadcast', { event: 'typing' }, (payload: any) => {
      if (payload.payload.user_id === otherUser.id) {
        setIsOtherTyping(payload.payload.typing);
        // Auto-clear after 3s in case we miss the "stop" broadcast
        clearTimeout(typingTimeoutRef.current);
        if (payload.payload.typing) {
          typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
        }
      }
    });

    presenceChannel.subscribe();
    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presenceChannel);
      if (timerRef.current) clearInterval(timerRef.current);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [matchId, otherUser.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // ─── Voice Recording ──────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadVoiceNote(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch {
      alert('🎙️ Microphone access denied!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadVoiceNote = async (blob: Blob) => {
    if (!session) return;
    const fileName = `${session.user.id}/voice_${Date.now()}.webm`;
    try {
      const { error } = await supabase.storage
        .from('post-images')
        .upload(fileName, blob, { contentType: 'audio/webm' });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
      handleSend(urlData.publicUrl, 'voice');
    } catch {
      alert('❌ Failed to send voice note.');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ─── Vibe Check ───────────────────────────────────────────────────────────
  const sendVibeCheck = () => {
    const q = VIBE_CHECKS[Math.floor(Math.random() * VIBE_CHECKS.length)];
    setVibeCheckQuestion(q);
    handleSend(`🎲 VIBE CHECK: ${q}`, 'vibe_check');
  };

  // ─── Send Message ─────────────────────────────────────────────────────────
  const handleSend = async (content: string, type: 'text' | 'sticker' | 'voice' | 'vibe_check' = 'text') => {
    if (!content.trim() || !session) return;
    setInput('');
    setShowStickers(false);
    broadcastTyping(false);

    const { error: msgError } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: session.user.id,
      content,
      type,
    });

    if (msgError) {
      alert(`❌ Message failed: ${msgError.message}`);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: otherUser.id,
      sender_id: session.user.id,
      type: 'message',
      content:
        type === 'voice'
          ? 'Sent a voice note 🎙️'
          : type === 'vibe_check'
          ? 'Sent a Vibe Check 🎲'
          : content.length > 30
          ? content.slice(0, 30) + '...'
          : content,
      post_id: matchId,
    });
  };

  const bg = isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50';

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto transition-colors duration-500 overflow-hidden ${bg}`}>
      {/* ── Header ── */}
      <header className={`fixed top-0 w-full max-w-md p-4 flex items-center justify-between border-b shadow-sm z-10 pt-safe transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`p-2 rounded-full transition ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={24} />
          </button>
          <div className="relative">
            {otherUser.avatar_url ? (
              <img src={otherUser.avatar_url} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover border-2 border-primary-500" />
            ) : (
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold border-2 border-primary-500">
                {otherUser.name.charAt(0)}
              </div>
            )}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          </div>
          <div>
            <h2 className="font-black text-base">{otherUser.name}</h2>
            <p className={`text-[10px] font-bold uppercase tracking-widest leading-none mt-0.5 transition-all ${isOtherTyping ? 'text-primary-400' : isOnline ? 'text-green-500' : 'text-gray-400'}`}>
              {isOtherTyping ? 'typing...' : isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <button onClick={() => setShowMenu(!showMenu)} className="p-2 opacity-40 hover:opacity-100 transition">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* ── Message List ── */}
      <div className="flex-1 overflow-y-auto p-4 pt-24 pb-28 space-y-4 hide-scrollbar">
        {messages.map((msg) => {
          const isMine = msg.sender_id === session?.user.id;
          const isVibeCheck = msg.type === 'vibe_check';
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              {isVibeCheck ? (
                /* Vibe Check card bubble */
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-[85%] bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-[2rem] p-5 shadow-2xl shadow-indigo-500/30"
                >
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2 flex items-center gap-1">
                    <span>🎲</span> Vibe Check
                  </p>
                  <p className="font-black text-sm leading-snug">{msg.content.replace('🎲 VIBE CHECK: ', '')}</p>
                  <p className="text-[8px] mt-2 opacity-40 tracking-widest uppercase text-right">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </motion.div>
              ) : (
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm relative ${isMine ? 'bg-primary-500 text-white rounded-tr-sm' : `border border-gray-100 rounded-tl-sm ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`}`}>
                  {msg.type === 'sticker' ? (
                    <span className="text-xl font-black italic uppercase tracking-tighter bg-white/20 px-3 py-1 rounded-lg border border-white/20">{msg.content}</span>
                  ) : msg.type === 'voice' ? (
                    <div className="flex items-center gap-4 py-1">
                      <button
                        onClick={() => { const a = new Audio(msg.content); a.play(); }}
                        className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:scale-110 active:scale-90 transition shadow-xl"
                      >
                        <Play size={18} fill="white" />
                      </button>
                      <div className="flex gap-0.5 items-end h-5">
                        {[3,5,7,4,8,6,3,7,5,4].map((h, i) => (
                          <div key={i} className="w-1 bg-white/60 rounded-full" style={{ height: `${h * 2}px` }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="font-medium text-[13px] leading-relaxed">{msg.content}</p>
                  )}
                  <p className="text-[8px] mt-1.5 font-bold uppercase tracking-widest text-right opacity-40">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Live Typing Indicator ── */}
        <AnimatePresence>
          {isOtherTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="flex justify-start"
            >
              <div className={`flex items-center gap-1.5 px-5 py-4 rounded-2xl rounded-tl-sm border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <TypingDot delay={0} />
                <TypingDot delay={0.15} />
                <TypingDot delay={0.3} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar ── */}
      <div className={`fixed bottom-0 w-full max-w-md border-t z-20 transition-all ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} pb-safe`}>
        {/* Stickers tray */}
        <AnimatePresence>
          {showStickers && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="grid grid-cols-2 gap-2 p-4 border-b border-gray-500/10">
              {SLANG_STICKERS.map((s) => (
                <button key={s} onClick={() => handleSend(s, 'sticker')} className="py-3 px-4 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-300 font-black text-xs uppercase tracking-tighter italic border border-primary-100 dark:border-primary-900 hover:scale-105 active:scale-95 transition">{s}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vibe check preview banner */}
        <AnimatePresence>
          {vibeCheckQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mx-4 mt-3 mb-1 px-4 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between"
            >
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate flex-1 mr-2">🎲 {vibeCheckQuestion}</p>
              <button onClick={() => setVibeCheckQuestion(null)} className="text-indigo-400 shrink-0"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex items-center gap-2 p-3">
          {/* Sticker button */}
          <button type="button" onClick={() => { setShowStickers(!showStickers); setVibeCheckQuestion(null); }} className={`p-3.5 rounded-2xl transition shrink-0 ${showStickers ? 'bg-primary-100 text-primary-600' : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <Smile size={20} />
          </button>

          {/* Vibe Check dice */}
          <button type="button" onClick={sendVibeCheck} title="Send a Vibe Check" className={`p-3.5 rounded-2xl transition shrink-0 ${isDarkMode ? 'bg-gray-800 text-indigo-400 hover:bg-indigo-500 hover:text-white' : 'bg-gray-100 text-indigo-500 hover:bg-indigo-500 hover:text-white'}`}>
            <Dice5 size={20} />
          </button>

          {/* Input field */}
          <div className={`flex-1 rounded-2xl flex items-center px-4 transition-all duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} ${isRecording ? 'bg-red-500/10 ring-2 ring-red-500' : ''}`}>
            <input
              type="text"
              value={input}
              disabled={isRecording}
              onChange={handleInputChange}
              placeholder={isRecording ? `🔴 ${formatTime(recordingTime)}` : 'Type a message...'}
              className="flex-1 bg-transparent py-4 text-sm font-medium focus:outline-none placeholder:text-gray-400"
            />
            {isRecording && (
              <motion.div animate={{ opacity: [1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1" />
            )}
          </div>

          {/* Voice / Send toggle */}
          <AnimatePresence mode="wait">
            {!input.trim() ? (
              <motion.button
                key="voice"
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className={`p-4 rounded-full transition-all duration-300 shrink-0 ${isRecording ? 'bg-red-500 text-white scale-125 shadow-lg shadow-red-500/40' : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
              >
                <Mic size={22} />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                type="submit"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="p-4 bg-primary-500 text-white rounded-full shadow-lg shadow-primary-500/30 active:scale-90 transition shrink-0"
              >
                <Send size={22} />
              </motion.button>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
