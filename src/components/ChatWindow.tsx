import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Mic, Smile, MoreVertical } from 'lucide-react';
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
  const { session } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async (content: string, type: 'text' | 'sticker' | 'voice' = 'text') => {
    if (!content.trim() || !session) return;
    
    setInput('');
    setShowStickers(false);

    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: session.user.id,
      content,
      type,
    });

    // Notify the other user of the message
    await supabase.from('notifications').insert({
      user_id: otherUser.id,
      sender_id: session.user.id,
      type: 'message',
      content: content.length > 30 ? content.slice(0, 30) + '...' : content,
      post_id: matchId // We use post_id as a reference to the match_id here for notifications
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
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
          </div>
          <div>
            <h2 className="font-black text-base">{otherUser.name}</h2>
            <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest leading-none mt-0.5">Online</p>
          </div>
        </div>
        <button className="p-2 opacity-40">
          <MoreVertical size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pt-24 pb-20 space-y-4 hide-scrollbar">
        {messages.map((msg) => {
          const isMine = msg.sender_id === session?.user.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm relative ${
                  isMine
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-tr-sm'
                    : `border border-gray-100 rounded-tl-sm ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`
                }`}
              >
                {msg.type === 'sticker' ? (
                  <div className="py-2 px-1">
                    <span className="text-2xl font-black italic tracking-tighter uppercase whitespace-nowrap bg-white/20 px-4 py-2 rounded-xl border border-white/30">
                      {msg.content}
                    </span>
                  </div>
                ) : msg.type === 'voice' ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Mic size={16} />
                    </div>
                    <div className="h-1 w-24 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full w-1/2 bg-white rounded-full animate-pulse" />
                    </div>
                    <span className="text-[10px] font-bold opacity-70">0:12</span>
                  </div>
                ) : (
                  <p className="font-medium">{msg.content}</p>
                )}
                <div
                  className={`text-[9px] mt-1.5 font-bold uppercase tracking-widest text-right ${
                    isMine ? 'text-primary-100' : 'text-gray-400'
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className={`fixed bottom-0 w-full max-w-md p-4 border-t z-20 transition-all ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} pb-safe`}>
        <AnimatePresence>
          {showStickers && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="mb-4 grid grid-cols-2 gap-2 p-2"
            >
              {SLANG_STICKERS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s, 'sticker')}
                  className="py-3 px-4 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-300 font-black text-xs uppercase tracking-tighter italic border border-primary-100 dark:border-primary-900 hover:scale-105 active:scale-95 transition"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setShowStickers(!showStickers)}
            className={`p-3 rounded-2xl transition ${showStickers ? 'bg-primary-100 text-primary-600' : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
          >
            <Smile size={24} />
          </button>
          
          <div className={`flex-1 rounded-2xl flex items-center px-4 transition-all duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} ${isRecording ? 'bg-red-500/10 border-red-500 ring-1 ring-red-500' : ''}`}>
             <input
              type="text"
              value={input}
              disabled={isRecording}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? 'Recording...' : 'Type a message...'}
              className="flex-1 bg-transparent py-4 text-sm font-medium focus:outline-none placeholder:text-gray-400"
            />
            {isRecording && (
              <motion.div 
                animate={{ opacity: [0, 1] }} 
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-2.5 h-2.5 bg-red-500 rounded-full ml-2" 
              />
            )}
          </div>

          <AnimatePresence mode="wait">
            {!input.trim() ? (
              <motion.button
                key="voice"
                type="button"
                onMouseDown={() => { setIsRecording(true); alert('🎙️ Recording voice note...'); }}
                onMouseUp={() => { setIsRecording(false); handleSend('Voice Note', 'voice'); }}
                className={`p-4 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 text-white scale-125 shadow-lg shadow-red-500/40' : isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
              >
                <Mic size={24} />
              </motion.button>
            ) : (
              <motion.button
                key="send"
                type="submit"
                className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-full shadow-lg shadow-primary-500/20 hover:scale-110 active:scale-95 transition"
              >
                <Send size={24} />
              </motion.button>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}

