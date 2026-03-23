import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, MoreVertical, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion } from 'framer-motion';

interface GroupMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  users?: { name: string; avatar_url: string };
}

export default function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [groupInfo, setGroupInfo] = useState<{name: string, course: string, description: string} | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;
    fetchGroupData();
    fetchMessages();

    const channel = supabase
      .channel(`group_chat_${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload: any) => {
        // Fetch user data for the new message
        const { data: userData } = await supabase.from('users').select('name, avatar_url').eq('id', payload.new.sender_id).single();
        const newMessage = { ...payload.new, users: userData } as GroupMessage;
        setMessages((prev) => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchGroupData = async () => {
    const { data } = await supabase.from('course_groups').select('name, course, description').eq('id', groupId).single();
    if (data) setGroupInfo(data);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('group_messages')
      .select('*, users(name, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data as any);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session || !groupId) return;
    
    const content = input;
    setInput('');

    const { error: msgError } = await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: session.user.id,
      content,
    });

    if (msgError) {
       console.error('Message send failed:', msgError);
       alert(`❌ Message failed: ${msgError.message}`);
    }
  };

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto transition-colors duration-500 overflow-hidden ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50'}`}>
      <header className={`fixed top-0 w-full max-w-md p-4 flex items-center justify-between border-b shadow-sm z-10 pt-safe transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/community')} className={`p-2 rounded-full transition ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold border border-indigo-500/20">
            <Briefcase size={20} />
          </div>
          <div>
            <h2 className="font-black text-base flex items-center gap-2">
              {groupInfo?.name || 'Group Chat'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">{groupInfo?.course || 'Loading...'}</p>
          </div>
        </div>
        <button className="p-2 opacity-40">
          <MoreVertical size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pt-24 pb-20 space-y-4 hide-scrollbar">
        {groupInfo?.description && (
          <div className={`p-4 rounded-2xl text-center text-sm font-medium opacity-60 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            {groupInfo.description}
          </div>
        )}
        {messages.map((msg, index) => {
          const isMine = msg.sender_id === session?.user.id;
          const showHeader = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {showHeader && !isMine && (
                 <span className="text-[10px] uppercase font-black tracking-widest ml-2 mb-1 opacity-60 text-primary-500">
                    {msg.users?.name || 'Unknown'}
                 </span>
              )}
              <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {showHeader && !isMine && msg.users?.avatar_url && (
                   <img src={msg.users.avatar_url} className="w-6 h-6 rounded-full object-cover mb-1" alt="" />
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm relative ${
                    isMine
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-tr-sm'
                      : `border border-gray-100 rounded-tl-sm ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`
                  }`}
                >
                  <p className="font-medium">{msg.content}</p>
                  <div
                    className={`text-[9px] mt-1.5 font-bold uppercase tracking-widest text-right ${
                      isMine ? 'text-primary-100' : 'text-gray-400'
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className={`fixed bottom-0 w-full max-w-md p-4 border-t z-20 transition-all ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} pb-safe`}>
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <div className={`flex-1 rounded-2xl flex items-center px-4 transition-all duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
             <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message group..."
              className="flex-1 bg-transparent py-4 text-sm font-medium focus:outline-none placeholder:text-gray-400"
            />
          </div>

          <motion.button
            key="send"
            type="submit"
            disabled={!input.trim()}
            className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-full shadow-lg shadow-primary-500/20 disabled:opacity-50 hover:scale-110 active:scale-95 transition"
          >
            <Send size={24} />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
