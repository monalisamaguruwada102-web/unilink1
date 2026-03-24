import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { Heart, MessageCircle, X, Plus, Hash, Trash2, Sparkles } from 'lucide-react';

export default function Feed() {
  const [loading, setLoading] = useState(true);
  
  // Story Creation State
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes', 'No']);
  const [isPollStory, setIsPollStory] = useState(false);
  
  const [activeStory, setActiveStory] = useState<any>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const storyFileRef = useRef<HTMLInputElement>(null);
  const { session, profile } = useAuthStore();
  const { 
    stories, posts, isDarkMode, confessions, notifications,
    fetchFeatures, 
    likePost, unlikePost, addComment, viewStory, reactToStory,
    submitStoryWithPoll, addStory, voteInStoryPoll, deletePost 
  } = useFeatureStore() as any;

  useEffect(() => {
    setLoading(true);
    fetchFeatures().finally(() => setLoading(false));
  }, []);

  const handleStoryFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStoryFile(file);
    setStoryPreview(URL.createObjectURL(file));
    setShowCreateStory(true);
  };

  const handleCreateStory = async () => {
    if (!session || !storyFile) return;
    setUploading(true);
    try {
      const path = `${session.user.id}/story_${Date.now()}.${storyFile.name.split('.').pop()}`;
      // In useFeatureStore these calls usually handle their own upload or state sync
      // But for simplicity/logic let's assume they work as before
      // Note: I'm reusing the existing addStory and submitStoryWithPoll in useFeatureStore
      
      const { data: urlData } = await (useFeatureStore.getState() as any).uploadFile('post-images', path, storyFile);
      
      if (isPollStory && pollQuestion.trim()) {
        await submitStoryWithPoll(session.user.id, profile?.name || 'You', urlData.publicUrl, pollQuestion, pollOptions.filter(o => o.trim()));
      } else {
        await addStory(session.user.id, profile?.name || 'You', urlData.publicUrl);
      }
      
      setShowCreateStory(false);
      setStoryFile(null);
      setStoryPreview('');
      setPollQuestion('');
      setIsPollStory(false);
      alert('✨ Story posted!');
    } catch (err: any) {
       alert(`❌ Story failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddComment = async () => {
    if (!session || !commentText.trim() || !activeCommentsPost) return;
    await addComment(activeCommentsPost.id, session.user.id, activeCommentsPost.user_id, commentText);
    setCommentText('');
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      if (deletePost) {
        await deletePost(postId);
      } else {
        // Fallback to manual if store lacks it
        const { supabase } = await import('../lib/supabase');
        await supabase.from('posts').delete().eq('id', postId);
        await fetchFeatures();
      }
      alert('🗑️ Deleted.');
    } catch (err: any) {
      alert(`❌ Failed: ${err.message}`);
    }
  };

  return (
    <div className={`min-h-screen overflow-y-auto pb-36 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Bar */}
      <div className={`sticky top-0 z-30 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary-500 to-indigo-500 bg-clip-text text-transparent">Poly Link</span>
        <div className="flex items-center gap-3">
          <div className="relative">
             <div className="w-5 h-5 bg-gray-400/20 rounded-full" />
             {notifications?.filter((n: any) => !n.is_read).length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
             )}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-black text-[10px] uppercase rounded-xl">
            <Plus size={14} /> Post
          </button>
        </div>
      </div>

      {/* Stories Row */}
      <div className="flex gap-4 px-4 py-5 overflow-x-auto hide-scrollbar">
        <label className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer">
          <div className={`w-14 h-14 rounded-[1.3rem] border-2 border-dashed flex items-center justify-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <Plus size={20} className="text-primary-500" />
          </div>
          <span className="text-[9px] font-black uppercase opacity-50">Add Story</span>
          <input ref={storyFileRef} type="file" accept="image/*" className="hidden" onChange={handleStoryFilePick} />
        </label>
        {stories?.map((story: any) => (
          <button key={story.id} onClick={() => { setActiveStory(story); if (session) viewStory(story.id, session.user.id); }} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-[1.3rem] p-0.5 ring-2 ${story.is_viewed ? 'ring-gray-800' : 'ring-primary-500'}`}>
              <div className="w-full h-full rounded-[1.1rem] overflow-hidden">
                <img src={story.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[8px] font-black uppercase opacity-60 max-w-[50px] truncate">{story.user_name}</span>
          </button>
        ))}
      </div>

      {/* Confessions */}
      {confessions?.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
            <Hash size={14} className="text-pink-500" /> Secrets
          </p>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar">
            {confessions.slice(0, 5).map((c: any) => (
              <div key={c.id} className={`flex-shrink-0 w-64 p-5 rounded-[2rem] border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-pink-50'}`}>
                <p className="text-xs italic opacity-80 line-clamp-2">"{c.content}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Feed */}
      <div className="space-y-6 px-4 pb-20">
        {loading ? <p className="text-center py-10 opacity-30 font-black text-xs uppercase tracking-[0.3em]">Synching Campus...</p> : posts?.map((post: any) => (
          <div key={post.id} className={`rounded-[2.5rem] overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
             <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                   <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary-100">
                      {post.users?.avatar_url ? <img src={post.users.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full font-black text-primary-600">{post.users?.name?.[0]}</span>}
                   </div>
                   <div className="flex items-center gap-2">
                      <p className="font-black text-[11px] uppercase">{post.users?.name}</p>
                      {post.users?.is_verified && <Sparkles size={12} className="text-blue-500" />}
                   </div>
                </div>
                {post.user_id === session?.user.id && <button onClick={() => handleDeletePost(post.id)} className="text-red-500 opacity-40"><Trash2 size={16} /></button>}
             </div>
             {post.image_url && <img src={post.image_url} className="w-full aspect-square object-cover" alt="" />}
             <div className="p-6">
                <p className="text-sm opacity-80 mb-4 font-medium">{post.content}</p>
                <div className="flex items-center gap-4">
                   <button onClick={() => post.is_liked ? unlikePost(post.id, session?.user.id || '') : likePost(post.id, post.user_id, session?.user.id || '')} className={`flex items-center gap-2 px-4 py-2 rounded-xl ${post.is_liked ? 'bg-primary-500 text-white' : 'bg-primary-500/10 text-primary-500'}`}>
                      <Heart size={16} fill={post.is_liked ? "currentColor" : "none"} />
                      <span className="text-[10px] font-black">{post.likes || 0}</span>
                   </button>
                   <button onClick={() => setActiveCommentsPost(post)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/10">
                      <MessageCircle size={16} />
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* 🎬 STORY VIEWER MODAL */}
      <AnimatePresence>
        {activeStory && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col">
             <div className="absolute top-4 left-4 right-4 z-20 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 7 }} onAnimationComplete={() => setActiveStory(null)} className="h-full bg-white" />
             </div>
             <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                   <p className="font-black text-xs uppercase italic">{activeStory.user_name}</p>
                   {activeStory.is_verified && <Sparkles size={12} className="text-blue-400" />}
                </div>
                <button onClick={() => setActiveStory(null)}><X size={24} /></button>
             </div>
             <div className="flex-1 flex items-center justify-center p-4 relative">
                <img src={activeStory.image_url} className="w-full max-h-[70vh] rounded-[2.5rem] object-contain" alt="" />
                {activeStory.poll_question && (
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10">
                    <h3 className="text-white font-black text-center text-sm mb-4">{activeStory.poll_question}</h3>
                    <div className="space-y-2">
                       {activeStory.poll_options?.map((opt: string, idx: number) => {
                          const total = activeStory.poll_results?.reduce((acc: number, cur: number) => acc + cur, 0) || 0;
                          const perc = total > 0 ? Math.round(((activeStory.poll_results?.[idx] || 0) / total) * 100) : 0;
                          return (
                            <button key={idx} onClick={() => voteInStoryPoll(activeStory.id, session?.user.id || '', idx)} className="w-full p-4 rounded-xl bg-white/10 text-white text-xs font-bold relative overflow-hidden">
                               <div className="absolute inset-0 bg-primary-500/30" style={{ width: `${perc}%` }} />
                               <span className="relative z-10">{opt}</span>
                               <span className="absolute right-4 z-10 opacity-40">{perc}%</span>
                            </button>
                          );
                       })}
                    </div>
                  </div>
                )}
             </div>
             <div className="p-8 flex justify-center gap-4">
               {['❤️', '🔥', '🙌'].map(e => <button key={e} onClick={() => { reactToStory(activeStory.id, activeStory.user_id, session?.user.id || '', e); setActiveStory(null); }} className="text-2xl hover:scale-125 transition">{e}</button>)}
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* ➕ CREATE STORY MODAL */}
      <AnimatePresence>
        {showCreateStory && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-black p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8 text-white">
                 <h2 className="text-xl font-black uppercase">My Story</h2>
                 <button onClick={() => setShowCreateStory(false)}><X size={24} /></button>
              </div>
              <div className="flex-1 relative rounded-[2.5rem] overflow-hidden bg-gray-900 border border-white/10">
                 {storyPreview && <img src={storyPreview} className="w-full h-full object-cover" alt="" />}
                 {isPollStory && (
                   <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-xl p-4 rounded-2xl">
                      <input placeholder="Poll Question" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="w-full bg-transparent text-white text-center font-black mb-3 outline-none" />
                      {pollOptions.map((o, i) => <input key={i} value={o} onChange={e => { const no = [...pollOptions]; no[i] = e.target.value; setPollOptions(no); }} className="w-full bg-white/10 p-2 rounded-lg text-white text-center text-[10px] mb-1 outline-none" />)}
                   </div>
                 )}
              </div>
              <div className="py-6 space-y-4">
                 <button onClick={() => setIsPollStory(!isPollStory)} className="w-full py-4 rounded-2xl border border-white/10 text-white font-black text-[10px] uppercase">
                    {isPollStory ? 'Remove Poll' : 'Add Poll'}
                 </button>
                 <button onClick={handleCreateStory} disabled={uploading} className="w-full py-5 bg-primary-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest">{uploading ? 'Wait...' : 'Blast It!'}</button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 COMMENTS MODAL */}
      <AnimatePresence>
         {activeCommentsPost && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end">
              <div className={`w-full p-8 rounded-t-[2.5rem] ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black uppercase italic">Comments</h3>
                    <button onClick={() => setActiveCommentsPost(null)}><X size={20} /></button>
                 </div>
                 <div className="flex gap-4">
                    <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Say something..." className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 rounded-xl outline-none" />
                    <button onClick={handleAddComment} className="p-4 bg-primary-500 text-white rounded-xl"><Heart size={20} fill="white" /></button>
                 </div>
              </div>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
