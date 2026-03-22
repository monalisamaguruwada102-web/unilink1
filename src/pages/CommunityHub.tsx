import { useState } from 'react';
import { useFeatureStore } from '../store/useFeatureStore';
import { useAuthStore } from '../store/useAuthStore';
import { ShoppingBag, Briefcase, Wrench, Car, AlertTriangle, ChevronRight, Bell, TrendingUp, Plus, X, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

type Tab = 'all' | 'market' | 'jobs' | 'services';
type Modal = 'item' | 'job' | null;

export default function CommunityHub() {
  const { isDarkMode, marketplaceItems, jobs, campusAlerts } = useFeatureStore();
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState({ title: '', price: '', category: 'Books', company: '', type: 'Part-time', salary: '' });
  const [posting, setPosting] = useState(false);

  const tabs = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'market', label: 'Market', icon: ShoppingBag },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'services', label: 'Services', icon: Wrench },
  ];

  const handlePostItem = async () => {
    if (!form.title || !form.price) return;
    setPosting(true);
    await supabase.from('marketplace').insert({
      title: form.title,
      price: form.price,
      category: form.category,
      user_id: profile?.id,
    });
    setForm({ title: '', price: '', category: 'Books', company: '', type: 'Part-time', salary: '' });
    setModal(null);
    setPosting(false);
  };

  const handlePostJob = async () => {
    if (!form.title || !form.company) return;
    setPosting(true);
    await supabase.from('jobs').insert({
      title: form.title,
      company: form.company,
      type: form.type,
      salary: form.salary,
    });
    setForm({ title: '', price: '', category: 'Books', company: '', type: 'Part-time', salary: '' });
    setModal(null);
    setPosting(false);
  };

  return (
    <div className={`flex-1 overflow-y-auto px-4 pt-20 pb-40 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50'}`}>
      <header className="mb-10 px-2 mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Community Hub</h1>
          <div className="h-1 w-12 bg-primary-500 rounded-full mb-3" />
          <p className="text-[10px] font-black opacity-40 uppercase tracking-widest leading-none">Kwekwe Poly · Campus Network</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setModal('item')}
          className="w-12 h-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30"
        >
          <Plus size={24} />
        </motion.button>
      </header>

      {/* Live Alerts */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-500" />
            ZESA & Utility Alerts
          </h3>
          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 animate-pulse">LIVE</span>
        </div>
        <div className="space-y-4">
          {campusAlerts.length === 0 && (
            <p className="text-center text-xs opacity-30 py-6">No active alerts. Campus is all clear 🟢</p>
          )}
          {campusAlerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-6 rounded-[2.5rem] border flex items-center justify-between transition-all group ${isDarkMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-100'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500 text-white flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-yellow-600">{alert.type} ALERT</p>
                  <p className="text-sm font-black">{alert.status}</p>
                </div>
              </div>
              <ChevronRight size={20} className="opacity-20 group-hover:opacity-100 transition" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className={`p-8 rounded-[3rem] mb-12 border transition-all relative overflow-hidden ${isDarkMode ? 'bg-indigo-900/10 border-indigo-800/30' : 'bg-indigo-50 border-indigo-100'}`}>
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-black text-[11px] uppercase tracking-[0.2em] opacity-60">Poly Leaderboard</h3>
          </div>
        </div>
        <div className="space-y-6">
          {[
            { rank: 1, name: "Kuda M.", pts: 2450, color: 'bg-yellow-400' },
            { rank: 2, name: "Tariro S.", pts: 2100, color: 'bg-gray-400' },
            { rank: 3, name: "Munashe J.", pts: 1850, color: 'bg-orange-400' },
          ].map(user => (
            <div key={user.rank} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-[10px] font-black text-white shadow-lg`}>{user.rank}</div>
                <span className="text-xs font-bold">{user.name}</span>
              </div>
              <span className="text-sm font-black tracking-tighter text-indigo-600">{user.pts.toLocaleString()} <span className="text-[8px] opacity-40 ml-1">xp</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-10 overflow-x-auto hide-scrollbar pb-4 px-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap border shadow-xl ${
              activeTab === tab.id
                ? 'bg-primary-500 border-primary-400 text-white shadow-primary-500/30 scale-105'
                : isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-500 shadow-black/40' : 'bg-white border-gray-100 text-gray-400 shadow-gray-200/50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {/* Marketplace */}
        {(activeTab === 'all' || activeTab === 'market') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Student Marketplace</h3>
              <button
                onClick={() => setModal('item')}
                className="text-[9px] font-black text-primary-500 flex items-center gap-1"
              >
                <Plus size={12} /> Sell Item
              </button>
            </div>
            {marketplaceItems.length === 0 && (
              <div
                onClick={() => setModal('item')}
                className={`p-10 rounded-[3rem] border-2 border-dashed text-center cursor-pointer transition hover:border-primary-500/40 ${isDarkMode ? 'border-gray-800 text-gray-600' : 'border-gray-200 text-gray-400'}`}
              >
                <Package size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest opacity-40">Be the first to list an item!</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-5">
              {marketplaceItems.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -5 }}
                  className={`p-5 rounded-[2.5rem] border flex flex-col transition-all group ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white shadow-xl shadow-gray-200/40'}`}
                >
                  <div className="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-3xl mb-4 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition" />
                    <ShoppingBag size={40} className="text-primary-500 opacity-20" />
                  </div>
                  <div className="px-1">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-primary-500 opacity-80">{item.category}</p>
                    <p className="text-[11px] font-black leading-tight line-clamp-1">{item.title}</p>
                    <p className="text-lg font-black mt-3 tracking-tighter text-indigo-600">{item.price}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Jobs */}
        {(activeTab === 'all' || activeTab === 'jobs') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Campus Jobs</h3>
              <button onClick={() => setModal('job')} className="text-[9px] font-black text-primary-500 flex items-center gap-1">
                <Plus size={12} /> Post Job
              </button>
            </div>
            {jobs.length === 0 && (
              <p className="text-center text-xs opacity-30 py-6">No jobs posted yet. Be the first!</p>
            )}
            <div className="space-y-4 px-2">
              {jobs.map((job, i) => (
                <motion.div
                  key={job.id || i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-6 rounded-[2.5rem] border flex items-center justify-between transition-all group ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white shadow-xl shadow-gray-200/40'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Briefcase size={28} />
                    </div>
                    <div>
                      <p className="text-[13px] font-black mb-0.5">{job.title}</p>
                      <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{job.company} · {job.type}</p>
                      {job.salary && <p className="text-[10px] font-black text-emerald-500 mt-1 tracking-widest">{job.salary}</p>}
                    </div>
                  </div>
                  <button className="w-10 h-10 bg-primary-50 dark:bg-primary-900/10 text-primary-500 rounded-2xl flex items-center justify-center transition group-hover:bg-primary-500 group-hover:text-white">
                    <ChevronRight size={20} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transport Card */}
      <div className="mt-16 p-10 rounded-[4rem] bg-gradient-to-br from-indigo-600 to-primary-600 text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div className="w-16 h-16 rounded-[2rem] bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl">
              <Car size={32} />
            </div>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-black uppercase tracking-widest">Transport Match</span>
          </div>
          <h3 className="text-2xl font-black mb-3 tracking-tighter leading-none">Taxi Share to CBD?</h3>
          <p className="text-xs font-medium opacity-80 mb-8 leading-loose uppercase tracking-widest">Splitting a fare with 4 others. Heading to Belvedere at 16:30 today.</p>
          <button className="w-full py-5 bg-white text-indigo-600 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-black/40 hover:scale-105 active:scale-95 transition-all">
            Join Taxi Share
          </button>
        </div>
      </div>

      {/* Post Modals */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end"
            onClick={(e) => e.target === e.currentTarget && setModal(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className={`w-full p-8 rounded-t-[3rem] space-y-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black">
                  {modal === 'item' ? '📦 Sell an Item' : '💼 Post a Job'}
                </h2>
                <button onClick={() => setModal(null)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <X size={20} />
                </button>
              </div>

              {modal === 'item' ? (
                <>
                  <input
                    placeholder="Item title (e.g. Calculus Textbook)"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <input
                    placeholder="Price (e.g. $5)"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  >
                    {['Books', 'Appliances', 'Clothing', 'Electronics', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <button
                    onClick={handlePostItem}
                    disabled={posting || !form.title || !form.price}
                    className="w-full py-5 bg-primary-500 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {posting ? 'Posting...' : 'List Item Now'}
                  </button>
                </>
              ) : (
                <>
                  <input
                    placeholder="Job title (e.g. Math Tutor)"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <input
                    placeholder="Company / Dept (e.g. Student Union)"
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <input
                    placeholder="Pay/Salary (e.g. $10/hr)"
                    value={form.salary}
                    onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                    className={`w-full px-5 py-4 rounded-2xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <button
                    onClick={handlePostJob}
                    disabled={posting || !form.title || !form.company}
                    className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-50"
                  >
                    {posting ? 'Posting...' : 'Post Job Now'}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
