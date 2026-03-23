import { useState } from 'react';
import { useFeatureStore } from '../store/useFeatureStore';
import { useAuthStore } from '../store/useAuthStore';
import { Users, ChevronRight, Plus, X, Package, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

type Modal = 'group' | null;

export default function CommunityHub() {
  const { isDarkMode, courseGroups, createGroup } = useFeatureStore();
  const { session } = useAuthStore();
  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState({ groupName: '', groupCourse: '', groupDescription: '' });
  const [posting, setPosting] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateGroup = async () => {
    if (!form.groupName || !form.groupCourse || !session) return;
    setPosting(true);
    const newGroup = await createGroup(form.groupName, form.groupCourse, form.groupDescription);
    // Auto-join on creation
    if (newGroup?.id) {
      await supabase.from('group_members').upsert({ group_id: newGroup.id, user_id: session.user.id });
    }
    setForm({ groupName: '', groupCourse: '', groupDescription: '' });
    setModal(null);
    setPosting(false);
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!session) return;
    setJoining(groupId);
    const { error } = await supabase.from('group_members').upsert({
      group_id: groupId,
      user_id: session.user.id,
    });
    if (!error) {
      navigate(`/groups/${groupId}`);
    } else {
      alert('Could not join the group. Make sure you have run community_groups.sql in Supabase.');
    }
    setJoining(null);
  };

  return (
    <div className={`min-h-screen overflow-y-auto px-4 pt-20 pb-36 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className="mb-10 px-2 mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Community Hub</h1>
          <div className="h-1 w-12 bg-primary-500 rounded-full mb-3" />
          <p className="text-[10px] font-black opacity-40 uppercase tracking-widest leading-none">Kwekwe Poly · Campus Network</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setModal('group')}
          className="w-12 h-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/30"
        >
          <Plus size={24} />
        </motion.button>
      </header>

      {/* Section Label */}
      <div className="flex justify-between items-center px-4 mb-6">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
          <BookOpen size={12} className="text-primary-500" /> Course Groups
        </h3>
        <button
          onClick={() => setModal('group')}
          className="text-[9px] font-black text-primary-500 flex items-center gap-1 uppercase tracking-widest"
        >
          <Plus size={12} /> New Group
        </button>
      </div>

      {courseGroups.length === 0 ? (
        <div
          onClick={() => setModal('group')}
          className={`p-12 rounded-[3.5rem] border-2 border-dashed text-center cursor-pointer transition hover:border-primary-500/40 ${isDarkMode ? 'border-gray-800 text-gray-600 bg-gray-900/40' : 'border-gray-200 text-gray-400 bg-gray-50/50'}`}
        >
          <Package size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">No Groups created yet!</p>
          <p className="text-[8px] font-bold opacity-30 uppercase tracking-tight">Create a space for your course mates</p>
        </div>
      ) : (
        <div className="space-y-4 px-2">
          {courseGroups.map(group => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-6 rounded-[2.5rem] border flex items-center justify-between ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-lg shadow-gray-100/50'}`}
            >
              <div
                className="flex items-center gap-4 flex-1 cursor-pointer"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 font-black text-xl border border-indigo-500/20">
                  {group.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-sm mb-0.5">{group.name}</p>
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{group.course}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <Users size={10} className="text-primary-500 opacity-60" />
                    <p className="text-[9px] font-black text-primary-500 opacity-60 uppercase tracking-widest">
                      {group.member_count || 0} members
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleJoinGroup(group.id)}
                  disabled={joining === group.id}
                  className="px-4 py-2 bg-primary-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary-500/30 disabled:opacity-50"
                >
                  {joining === group.id ? '...' : 'Join'}
                </button>
                <button
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className={`p-3 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
                <h2 className="text-xl font-black uppercase tracking-tighter">🏫 Create a Group</h2>
                <button onClick={() => setModal(null)} className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <X size={20} />
                </button>
              </div>

              <input
                placeholder="Group Name (e.g. CS101 Squad)"
                value={form.groupName}
                onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))}
                className={`w-full px-6 py-5 rounded-3xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              />
              <input
                placeholder="Course/Topic"
                value={form.groupCourse}
                onChange={e => setForm(f => ({ ...f, groupCourse: e.target.value }))}
                className={`w-full px-6 py-5 rounded-3xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              />
              <textarea
                placeholder="Description (optional)"
                value={form.groupDescription}
                onChange={e => setForm(f => ({ ...f, groupDescription: e.target.value }))}
                rows={3}
                className={`w-full px-6 py-5 rounded-3xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 resize-none ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              />
              <button
                onClick={handleCreateGroup}
                disabled={posting || !form.groupName || !form.groupCourse}
                className="w-full py-5 bg-primary-500 text-white rounded-3xl font-black uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-primary-500/30"
              >
                {posting ? 'Creating...' : 'Create Group'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
