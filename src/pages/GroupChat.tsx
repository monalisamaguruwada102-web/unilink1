import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { motion, AnimatePresence } from 'framer-motion';

interface GroupMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  users?: { name: string; avatar_url: string };
}

interface GroupMember {
  user_id: string;
  users: { name: string; avatar_url: string; course: string };
}

export default function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [input, setInput] = useState('');
  const [groupInfo, setGroupInfo] = useState<{name: string, course: string, description: string} | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!groupId || !session) return;
    fetchGroupData();
    fetchMessages();
    fetchMembers();

    const channel = supabase.channel(`group_chat_${groupId}`, {
      config: { presence: { key: session.user.id } }
    });

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload: any) => {
        const { data: userData } = await supabase.from('users').select('name, avatar_url').eq('id', payload.new.sender_id).single();
        const newMessage = { ...payload.new, users: userData } as GroupMessage;
        setMessages((prev) => [...prev, newMessage]);
        
        if (payload.new.sender_id !== session?.user.id) {
          import('../lib/audioManager').then(({ playSound }) => playSound('message'));
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_members',
        filter: `group_id=eq.${groupId}`,
      }, () => fetchMembers())
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(Object.keys(state));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { channel.unsubscribe(); };
  }, [groupId, session]);

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

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, users(name, avatar_url, course)')
      .eq('group_id', groupId);
    if (data) setMembers(data as any);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session || !groupId) return;
    const content = input;
    setInput('');
    const { error } = await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: session.user.id,
      content,
    });
    if (error) {
      console.error('Message send failed:', error);
      alert(`❌ Message failed: ${error.message}`);
    }
  };

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto transition-colors duration-500 overflow-hidden ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50'}`}>
      <header className={`fixed top-0 w-full max-w-md p-4 flex items-center justify-between border-b shadow-sm z-10 pt-safe transition-colors ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/community')} className={`p-2 rounded-full transition ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <ArrowLeft size={24} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-lg border border-indigo-500/20">
            {groupInfo?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="font-black text-base">{groupInfo?.name || 'Group Chat'}</h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest leading-none mt-0.5">{onlineUsers.length} Online Now</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowMembers(true)}
          className={`relative p-2.5 rounded-2xl transition ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          <Users size={20} />
          {members.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-[9px] flex items-center justify-center rounded-full font-black border-2 border-white dark:border-gray-900">
              {members.length}
            </span>
          )}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 pt-24 pb-20 space-y-4 hide-scrollbar">
        {groupInfo?.description && (
          <div className={`p-4 rounded-2xl text-center text-sm font-medium opacity-60 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            {groupInfo.description}
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-center py-12 opacity-30">
            <p className="font-black text-xs uppercase tracking-widest">No messages yet. Say hello!</p>
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
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                  isMine
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-tr-sm'
                    : `border border-gray-100 rounded-tl-sm ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'}`
                }`}>
                  <p className="font-medium">{msg.content}</p>
                  <div className={`text-[9px] mt-1.5 font-bold uppercase tracking-widest text-right ${isMine ? 'text-primary-100' : 'text-gray-400'}`}>
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
            type="submit"
            disabled={!input.trim()}
            className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-full shadow-lg shadow-primary-500/20 disabled:opacity-50 hover:scale-110 active:scale-95 transition"
          >
            <Send size={24} />
          </motion.button>
        </form>
      </div>

      {/* Members Modal */}
      <AnimatePresence>
        {showMembers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end"
            onClick={() => setShowMembers(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className={`w-full rounded-t-[3rem] p-8 max-h-[70vh] flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">Group Members</h2>
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1">{members.length} students</p>
                </div>
                <button onClick={() => setShowMembers(false)} className={`p-3 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {members.length === 0 ? (
                  <p className="text-center opacity-30 font-bold text-sm uppercase tracking-widest py-10">No members yet</p>
                ) : (
                  members.map((m) => (
                    <div key={m.user_id} className={`flex items-center gap-4 p-4 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary-100 flex-shrink-0">
                          {m.users?.avatar_url
                            ? <img src={m.users.avatar_url} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center font-black text-primary-600 text-lg">{m.users?.name?.[0]}</div>
                          }
                        </div>
                        {onlineUsers.includes(m.user_id) && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-sm">{m.users?.name}</p>
                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{m.users?.course || 'Student'}</p>
                      </div>
                      {m.user_id === session?.user.id && (
                        <span className="ml-auto text-[8px] font-black text-primary-500 uppercase tracking-widest bg-primary-500/10 px-3 py-1 rounded-full">You</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
