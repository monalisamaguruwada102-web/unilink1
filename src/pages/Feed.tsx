import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import PostCard from '../components/PostCard';
import { Camera, Calendar, ArrowRight, Vote, MessageCircleHeart, Plus, Users, ChevronRight, Image, Send, Sparkles } from 'lucide-react';

export default function Feed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { session, profile } = useAuthStore();
  const { stories, events, isDarkMode, currentPoll, voteInPoll } = useFeatureStore();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*, users!inner(name, avatar_url)')
      .order('created_at', { ascending: false });

    if (data) {
      setPosts(data.map((post: any) => ({
        ...post,
        _count: { likes: 0, comments: 0 }
      })));
    }
    setLoading(false);
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !session) return;

    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .insert({
        user_id: session.user.id,
        content: newPostContent
      })
      .select('*, users!inner(name, avatar_url)')
      .single();

    if (data) {
      setPosts((prev) => [{...data, _count: { likes: 0, comments: 0 }}, ...prev]);
      setNewPostContent('');
    }
    setLoading(false);
  };

  return (
    <div className={`flex-1 overflow-y-auto pt-10 pb-32 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50'}`}>
      <header className="px-6 flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black tracking-tighter">Community</h1>
        <button className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isDarkMode ? 'bg-gray-900 border border-gray-800 shadow-xl' : 'bg-white shadow-xl shadow-primary-500/10'}`}>
          <Camera size={22} className="text-primary-500" />
        </button>
      </header>

      {/* Feature 18: Story Highlights */}
      <div className="mb-12 overflow-x-auto hide-scrollbar whitespace-nowrap px-6">
        <div className="flex gap-5">
           <div className="flex flex-col items-center gap-2 group">
              <div className={`w-20 h-20 rounded-[2rem] border-2 border-dashed flex items-center justify-center transition group-hover:bg-primary-50 ${isDarkMode ? 'border-gray-800' : 'border-gray-200 shadow-inner'}`}>
                 <div className="w-16 h-16 rounded-[1.5rem] bg-primary-100 flex items-center justify-center text-primary-600 transition group-hover:rotate-12">
                    <Plus size={24} strokeWidth={3} />
                 </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Add Story</span>
           </div>
           {stories.map((story) => (
             <div key={story.id} className="flex flex-col items-center gap-2 group">
                <div className="w-20 h-20 rounded-[2rem] p-1.5 border-2 border-primary-500 group-hover:scale-105 transition duration-300">
                   <img src={story.image_url} alt={story.user_name} className="w-full h-full rounded-[1.5rem] object-cover" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:text-primary-500">{story.user_name}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Feature 3: Poll of the Day */}
      {currentPoll && (
        <div className="px-6 mb-12">
           <div className={`p-8 rounded-[3rem] border transition-all shadow-2xl ${isDarkMode ? 'bg-indigo-900/10 border-indigo-800/40 text-indigo-100' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                       <Vote size={20} />
                    </div>
                    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] opacity-60">Poll of the Day</h3>
                 </div>
                 <span className="text-[8px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>
              </div>
              <p className="text-xl font-black mb-8 leading-tight tracking-tight">{currentPoll.question}</p>
              <div className="space-y-3">
                 {currentPoll.options.map((option, idx) => {
                    const totalVotes = currentPoll.options.reduce((acc, o) => acc + o.votes, 0);
                    const percentage = Math.round((option.votes / totalVotes) * 100);
                    return (
                       <button 
                         key={option.label}
                         onClick={() => voteInPoll(idx)}
                         className={`w-full p-5 rounded-2xl relative overflow-hidden transition-all text-left border ${isDarkMode ? 'border-indigo-800/50 hover:bg-indigo-900/40' : 'border-indigo-100 hover:bg-white shadow-sm'}`}
                       >
                          <div className="flex justify-between items-center relative z-10">
                              <span className="text-[11px] font-black uppercase tracking-widest">{option.label}</span>
                              <span className="text-[10px] font-black opacity-60">{percentage}%</span>
                          </div>
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${percentage}%` }}
                             className={`absolute inset-0 transition-opacity ${isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-500/5'}`}
                          />
                       </button>
                    )
                 })}
              </div>
           </div>
        </div>
      )}

      {/* Feature 2: Anonymous Confessions */}
      <div className="px-6 mb-12">
         <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
               <MessageCircleHeart size={14} className="text-pink-500" />
               Campus Confessions
            </h3>
            <span className="text-[9px] font-black text-pink-500 underline underline-offset-4 decoration-pink-500/30">Add Secret</span>
         </div>
         <div className="space-y-5 overflow-x-auto flex gap-4 hide-scrollbar px-1 pb-4">
            {[
               { text: "I finally finished my dissertation and I'm crying in the library right now. Best feeling ever! 😭✨", time: "just now", tags: ["#GraduationVibes"] },
               { text: "To the guy in the white hoodie at the canteen: You have the best smile. Hope we meet again! ☕", time: "12m ago", tags: ["#CanteenCrush"] }
            ].map((secret, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex-shrink-0 w-80 p-8 rounded-[3rem] border transition-all shadow-xl ${isDarkMode ? 'bg-pink-950/20 border-pink-800/30' : 'bg-pink-50 border-pink-100 shadow-pink-200/20'}`}
              >
                 <p className="text-[13px] font-bold leading-relaxed mb-6 italic tracking-tight opacity-80">"{secret.text}"</p>
                 <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                       {secret.tags.map(t => <span key={t} className="text-[9px] font-black text-pink-500 opacity-60 uppercase tracking-tighter">{t}</span>)}
                    </div>
                    <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">{secret.time}</span>
                 </div>
              </motion.div>
            ))}
         </div>
      </div>

      {/* Create Post Section */}
      <div className="px-6 mb-12">
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={createPost} 
          className={`p-6 rounded-[3rem] shadow-2xl border relative overflow-hidden group transition-all duration-500 ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-white shadow-gray-200/40'}`}
        >
          <div className="flex gap-4 items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex-shrink-0 overflow-hidden border-2 border-primary-50 p-1 shadow-inner">
              <img src={profile?.avatar_url || 'https://via.placeholder.com/100'} alt="YOU" className="w-full h-full object-cover rounded-xl shadow-md" />
            </div>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's happening on campus?"
              className="w-full min-h-[80px] pt-3 bg-transparent border-none rounded-lg resize-none focus:ring-0 outline-none transition text-base font-bold placeholder:text-gray-400"
            />
          </div>
          
          <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-800">
            <button type="button" className="flex items-center gap-3 text-gray-400 hover:text-primary-600 font-black text-[10px] uppercase tracking-widest transition group">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-primary-50 group-hover:text-primary-500 transition-all border border-transparent group-hover:border-primary-100">
                <Image size={18} />
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition duration-300">Photo / Video</span>
            </button>
            
            <button
              type="submit"
              disabled={!newPostContent.trim() || loading}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white font-black rounded-2xl shadow-xl shadow-primary-500/20 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 text-[10px] uppercase tracking-widest"
            >
              <Send size={16} strokeWidth={3} />
              {loading ? 'Posting...' : 'Share'}
            </button>
          </div>
        </motion.form>
      </div>

      {/* Feature 12: Campus Events */}
      <div className="px-6 mb-12">
        <div className="flex justify-between items-center mb-6 px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
             <Calendar size={14} className="text-primary-500" />
             Campus Events
          </h3>
          <ArrowRight size={16} className="opacity-20" />
        </div>
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className={`p-6 rounded-[2.5rem] border flex items-center justify-between transition group hover:scale-[1.02] active:scale-[0.98] ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white shadow-xl shadow-primary-500/5'}`}>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-3xl bg-primary-100 flex flex-col items-center justify-center text-primary-600 shrink-0 font-black shadow-inner">
                  <span className="text-[9px] leading-none uppercase tracking-tighter opacity-60">Ton</span>
                  <span className="text-xl leading-none mt-1">124</span>
                </div>
                <div>
                  <h4 className="text-sm font-black mb-1">{event.title}</h4>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{event.location} • Mixed Mixer</p>
                </div>
              </div>
              <button className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-primary-500 group-hover:text-white group-hover:shadow-lg transition-all duration-300 group-hover:rotate-[-5deg]">
                <ChevronRight size={22} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Campus Feed Posts */}
      <div className="px-6 pb-40 space-y-8">
        <div className="flex items-center justify-between mb-2 px-2">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
              <Plus size={14} className="text-primary-500" />
              Latest Feed
           </h3>
           <Users size={16} className="opacity-20" />
        </div>
        <AnimatePresence mode="popLayout">
          {posts.map((post, idx) => (
            <motion.div
              layout
              key={post.id}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <PostCard
                post={post}
                onLike={(id) => console.log('Liked', id)}
                onComment={(id) => console.log('Comment on', id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {posts.length === 0 && !loading && (
          <div className="text-center py-20 grayscale opacity-40 flex flex-col items-center">
            <Sparkles className="mb-4 text-primary-500 animate-pulse" size={64} />
            <p className="font-black text-xs uppercase tracking-widest">Nothing to show yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
