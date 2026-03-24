import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Mic, Smile, MoreVertical, Play, Pause, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  type?: 'text' | 'sticker' | 'voice';
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

export default function ChatWindow({ matchId, otherUser, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { session } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const [showMenu, setShowMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const isOnline = otherUser.last_seen ? (new Date().getTime() - new Date(otherUser.last_seen).getTime()) < 60000 * 3 : false;

  useEffect(() => {
    fetchMessages();

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

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
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('🎙️ Microphone access denied!');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadVoiceNote = async (blob: Blob) => {
    if (!session) return;
    const fileName = `${session.user.id}/voice_${Date.now()}.webm`;
    
    try {
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(fileName, blob, { contentType: 'audio/webm' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(fileName);
      handleSend(publicUrl, 'voice');
    } catch (err: any) {
      console.error('Voice upload error:', err);
      alert('❌ Failed to send voice note.');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSend = async (content: string, type: 'text' | 'sticker' | 'voice' = 'text') => {
    if (!content.trim() || !session) return;
    
    setInput('');
    setShowStickers(false);

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
      content: type === 'voice' ? 'Sent a voice note 🎙️' : (content.length > 30 ? content.slice(0, 30) + '...' : content),
      post_id: matchId
    });
  };

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto transition-colors duration-500 overflow-hidden ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50'}`}>
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
            <p className={`text-[10px] font-bold uppercase tracking-widest leading-none mt-0.5 ${isOnline ? 'text-green-500' : 'text-gray-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <button onClick={() => setShowMenu(!showMenu)} className="p-2 opacity-40 hover:opacity-100 transition">
          <MoreVertical size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pt-24 pb-20 space-y-4 hide-scrollbar">
        {messages.map((msg) => {
          const isMine = msg.sender_id === session?.user.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm relative ${isMine ? 'bg-primary-500 text-white rounded-tr-sm' : `border border-gray-100 rounded-tl-sm ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`}`}>
                {msg.type === 'sticker' ? (
                   <span className="text-xl font-black italic uppercase tracking-tighter bg-white/20 px-3 py-1 rounded-lg border border-white/20">{msg.content}</span>
                ) : msg.type === 'voice' ? (
                  <div className="flex items-center gap-4 py-1">
                    <button onClick={() => { const a = new Audio(msg.content); a.play(); }} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:scale-110 active:scale-90 transition shadow-xl">
                      <Play size={18} fill="white" />
                    </button>
                    <div className="flex-1 space-y-1">
                       <div className="h-1.5 w-24 bg-white/20 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 12, repeat: Infinity }} className="h-full bg-white" />
                       </div>
                       <p className="text-[8px] font-black uppercase opacity-60 tracking-widest">Voice Note</p>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium text-[13px] leading-relaxed">{msg.content}</p>
                )}
                <p className={`text-[8px] mt-1.5 font-bold uppercase tracking-widest text-right opacity-40`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className={`fixed bottom-0 w-full max-w-md p-4 border-t z-20 transition-all ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} pb-safe`}>
        <AnimatePresence>
          {showStickers && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="mb-4 grid grid-cols-2 gap-2 p-2">
              {SLANG_STICKERS.map((s) => (
                <button key={s} onClick={() => handleSend(s, 'sticker')} className="py-3 px-4 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-300 font-black text-xs uppercase tracking-tighter italic border border-primary-100 dark:border-primary-900 hover:scale-105 active:scale-95 transition">{s}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex items-center gap-3">
          <button type="button" onClick={() => setShowStickers(!showStickers)} className={`p-4 rounded-2xl transition ${showStickers ? 'bg-primary-100 text-primary-600' : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
            <Smile size={24} />
          </button>
          
          <div className={`flex-1 rounded-2xl flex items-center px-4 transition-all duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} ${isRecording ? 'bg-red-500/10 border-red-500' : ''}`}>
             <input
              type="text"
              value={input}
              disabled={isRecording}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? 'Recording Voice...' : 'Type a message...'}
              className="flex-1 bg-transparent py-5 text-sm font-medium focus:outline-none placeholder:text-gray-400"
            />
            {isRecording && <motion.div animate={{ opacity: [0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="flex items-center gap-2 pr-2 text-red-500 font-black text-[10px] uppercase tracking-widest"><div className="w-2.5 h-2.5 bg-red-500 rounded-full" /> {formatTime(recordingTime)}</motion.div>}
          </div>

          <AnimatePresence mode="wait">
            {!input.trim() ? (
              <motion.button
                key="voice"
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                className={`p-5 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 text-white scale-125 shadow-lg shadow-red-500/40' : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
              >
                <Mic size={24} />
              </motion.button>
            ) : (
              <motion.button key="send" type="submit" className="p-5 bg-primary-500 text-white rounded-full shadow-lg shadow-primary-500/30 active:scale-90 transition"><Send size={24} /></motion.button>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
