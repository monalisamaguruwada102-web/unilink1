import { useState } from 'react';
import { useFeatureStore } from '../store/useFeatureStore';
import { useAuthStore } from '../store/useAuthStore';
import { Briefcase, Wrench, ChevronRight, Bell, Plus, X, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

type Tab = 'all' | 'groups' | 'jobs' | 'services';
type Modal = 'group' | 'job' | null;

export default function CommunityHub() {
  const { isDarkMode, courseGroups, jobs, createGroup } = useFeatureStore();
  const { session } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [modal, setModal] = useState<Modal>(null);
  const [form, setForm] = useState({ title: '', price: '', category: 'Books', company: '', type: 'Part-time', salary: '', groupName: '', groupCourse: '', groupDescription: '' });
  const [posting, setPosting] = useState(false);
  const navigate = useNavigate();

  const tabs = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'groups', label: 'Groups', icon: Briefcase },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'services', label: 'Services', icon: Wrench },
  ];

  const handleCreateGroup = async () => {
    if (!form.groupName || !form.groupCourse || !session) return;
    setPosting(true);
    await createGroup(form.groupName, form.groupCourse, form.groupDescription);
    setForm({ ...form, groupName: '', groupCourse: '', groupDescription: '' });
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
    setForm({ ...form, title: '', company: '', type: 'Part-time', salary: '' });
    setModal(null);
    setPosting(false);
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
        {/* Groups */}
        {(activeTab === 'all' || activeTab === 'groups') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Course Groups</h3>
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
                    onClick={() => navigate(`/groups/${group.id}`)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-6 rounded-[2.5rem] border flex items-center justify-between cursor-pointer transition-all group-hover ${isDarkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' : 'bg-white border-gray-100 hover:bg-gray-50 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                        <Briefcase size={24} />
                      </div>
                      <div>
                        <p className="font-black text-sm mb-0.5">{group.name}</p>
                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{group.course}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Jobs */}
        {(activeTab === 'all' || activeTab === 'jobs') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Campus Jobs</h3>
              <button onClick={() => setModal('job')} className="text-[9px] font-black text-primary-500 flex items-center gap-1 uppercase tracking-widest">
                <Plus size={12} /> Post Job
              </button>
            </div>
            {jobs.length === 0 ? (
               <div className={`p-12 rounded-[3.5rem] border-2 border-dashed text-center ${isDarkMode ? 'border-gray-800 text-gray-600 bg-gray-900/40' : 'border-gray-200 text-gray-400 bg-gray-50/50'}`}>
                  <Briefcase size={36} className="mx-auto mb-4 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Looking for help or a gig?</p>
               </div>
            ) : (
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
            )}
          </div>
        )}
      </div>



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
                <h2 className="text-xl font-black uppercase tracking-tighter">
                  {modal === 'group' ? '🏫 Create a Group' : '💼 Post a Job'}
                </h2>
                <button onClick={() => setModal(null)} className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <X size={20} />
                </button>
              </div>

              {modal === 'group' ? (
                <>
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
                    placeholder="Description"
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
                </>
              ) : (
                <>
                  <input
                    placeholder="Job title (e.g. Math Tutor)"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className={`w-full px-6 py-5 rounded-3xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <input
                    placeholder="Company / Dept (e.g. Student Union)"
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className={`w-full px-6 py-5 rounded-3xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <input
                    placeholder="Pay/Salary (e.g. $10/hr)"
                    value={form.salary}
                    onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                    className={`w-full px-6 py-5 rounded-3xl text-sm font-bold border outline-none focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                  />
                  <button
                    onClick={handlePostJob}
                    disabled={posting || !form.title || !form.company}
                    className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-emerald-500/30"
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
