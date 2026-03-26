import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useFeatureStore } from '../store/useFeatureStore';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Users, MessageSquare, ShieldAlert, Trash2, 
  RefreshCw, UserX, ShieldCheck, Lock, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// 🚨 Define the authorized admin emails here
const ADMIN_EMAILS = ['joshuamujakari15@gmail.com'];

export default function Admin() {
  const [stats, setStats] = useState({ users: 0, posts: 0, reports: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'posts' | 'reports'>('stats');
  
  const { isDarkMode } = useFeatureStore();
  const { session } = useAuthStore();
  const navigate = useNavigate();

  // Check Authorization
  const isAuthorized = session?.user?.email && ADMIN_EMAILS.includes(session.user.email.toLowerCase());

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [activeTab, isAuthorized]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uCount, pCount] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        users: uCount.count || 0,
        posts: pCount.count || 0,
        reports: 0
      });

      if (activeTab === 'users') {
        const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(50);
        setUsers(data || []);
      } else if (activeTab === 'posts') {
        const { data } = await supabase.from('posts').select('*, users(name)').order('created_at', { ascending: false }).limit(50);
        setPosts(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Are you sure you want to incinerate this post permanently?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) setPosts(p => p.filter(x => x.id !== id));
  };

  const deleteUser = async (id: string) => {
    if (!confirm('CRITICAL WARNING: Are you sure you want to permanently execute this user from the platform? This cannot be undone.')) return;
    try {
      // NOTE: true account deletion requires Supabase Admin API,
      // but deleting from the public 'users' table will trigger 
      // cascading deletes across the app and break their session
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(u => u.filter(x => x.id !== id));
      alert('User successfully eradicated.');
    } catch (err: any) {
      alert('Failed to delete user: ' + err.message);
    }
  };

  const card = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50';

  if (!isAuthorized) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Access Denied</h1>
        <p className="text-sm font-bold opacity-50 text-center max-w-xs mb-8">This portal requires clearance level 5. Your account is not authorized.</p>
        <button onClick={() => navigate('/')} className="px-8 py-4 bg-primary-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl flex items-center gap-2">
          <ChevronLeft size={16} /> Return to Campus
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-12 pb-20 px-4 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className="mb-10 px-2">
        <button onClick={() => navigate('/')} className="mb-6 w-10 h-10 bg-primary-500/10 text-primary-500 rounded-xl flex items-center justify-center active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">Admin Portal</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-red-500">
              <ShieldAlert size={12} /> RESTRICTED ACCESS
            </p>
          </div>
          <button onClick={fetchData} className="p-4 rounded-2xl bg-gray-500/10 text-gray-500 active:scale-90 transition">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Students', value: stats.users, icon: Users, color: 'text-primary-500' },
          { label: 'Campus Posts', value: stats.posts, icon: MessageSquare, color: 'text-green-500' },
          { label: 'Active Reports', value: stats.reports, icon: ShieldAlert, color: 'text-red-500' },
        ].map((s, i) => (
          <div key={i} className={`p-6 rounded-[2.5rem] border ${card}`}>
            <s.icon size={20} className={`${s.color} mb-3`} />
            <p className="text-2xl font-black tracking-tighter">{s.value}</p>
            <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar">
        {['stats', 'users', 'posts', 'reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                : isDarkMode ? 'bg-gray-900 text-gray-500' : 'bg-white text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="space-y-4">
        {loading ? (
          <div className="text-center py-20 opacity-40 italic font-black uppercase tracking-widest text-[10px]">Accessing Secure Server...</div>
        ) : activeTab === 'users' ? (
          users.map(u => (
            <div key={u.id} className={`p-5 rounded-3xl border flex items-center justify-between ${card}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-black overflow-hidden">
                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover rounded-2xl" /> : u.name?.[0]}
                </div>
                <div>
                  <p className="font-black text-sm">{u.name}</p>
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{u.course || 'Poly Student'}</p>
                </div>
              </div>
              <button onClick={() => deleteUser(u.id)} className="p-3 text-red-500 bg-red-500/10 rounded-xl active:scale-90 transition hover:bg-red-500 hover:text-white">
                 <UserX size={18} />
              </button>
            </div>
          ))
        ) : activeTab === 'posts' ? (
          posts.map(p => (
            <div key={p.id} className={`p-5 rounded-3xl border ${card}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">@{p.users?.name || 'Unknown'}</p>
                <button onClick={() => deletePost(p.id)} className="p-2 text-red-500 active:scale-90 transition">
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm font-medium opacity-80 line-clamp-2 mb-2">{p.content}</p>
              {p.image_url && <div className="text-[9px] text-green-500 font-bold uppercase tracking-widest">📷 Includes Media</div>}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
             <ShieldCheck size={48} className="mb-4 text-red-500 opacity-50" />
             <p className="font-black text-xs uppercase tracking-widest text-center px-10">Systems Secured.<br/>No active anomalies detected.</p>
          </div>
        )}
      </main>
    </div>
  );
}
