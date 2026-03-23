import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useFeatureStore } from '../store/useFeatureStore';
import { 
  Users, MessageSquare, ShieldAlert, Trash2, 
  RefreshCw, UserX, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Admin() {
  const [stats, setStats] = useState({ users: 0, posts: 0, reports: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'posts' | 'reports'>('stats');
  
  const { isDarkMode } = useFeatureStore();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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
    if (!confirm('Are you sure you want to delete this post?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (!error) setPosts(p => p.filter(x => x.id !== id));
  };

  const card = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-xl shadow-gray-200/50';

  return (
    <div className={`min-h-screen pt-20 pb-20 px-4 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className="mb-10 px-2 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Campus Control</h1>
          <p className="text-[10px] font-black opacity-40 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={12} className="text-primary-500" /> Admin Interface
          </p>
        </div>
        <button onClick={fetchData} className="p-4 rounded-2xl bg-primary-500/10 text-primary-500">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
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
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
              activeTab === tab 
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                : isDarkMode ? 'bg-gray-900 text-gray-500' : 'bg-white text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="space-y-4">
        {loading ? (
          <div className="text-center py-20 opacity-40 italic font-black uppercase tracking-widest text-[10px]">Accessing Database...</div>
        ) : activeTab === 'users' ? (
          users.map(u => (
            <div key={u.id} className={`p-5 rounded-3xl border flex items-center justify-between ${card}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-black">
                  {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover rounded-2xl" /> : u.name?.[0]}
                </div>
                <div>
                  <p className="font-black text-sm">{u.name}</p>
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{u.course || 'Poly Student'}</p>
                </div>
              </div>
              <button className="p-3 text-red-500 bg-red-500/10 rounded-xl">
                 <UserX size={18} />
              </button>
            </div>
          ))
        ) : activeTab === 'posts' ? (
          posts.map(p => (
            <div key={p.id} className={`p-5 rounded-3xl border ${card}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">@{p.users?.name || 'Unknown'}</p>
                <button onClick={() => deletePost(p.id)} className="p-2 text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm font-medium opacity-80 line-clamp-2 mb-2">{p.content}</p>
              {p.image_url && <div className="text-[9px] text-green-500 font-bold uppercase tracking-widest">📷 Includes Media</div>}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
             <ShieldCheck size={48} className="mb-4" />
             <p className="font-black text-xs uppercase tracking-widest text-center px-10">Campus security protocol active. No critical threats detected.</p>
          </div>
        )}
      </main>
    </div>
  );
}
