import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { Heart, MessageCircle, X, Plus, Hash, Trash2, Sparkles, Bell, CheckCircle2, Send, Image as ImageIcon, ShieldAlert } from 'lucide-react';

export default function Feed() {
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateConfession, setShowCreateConfession] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // State
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState('');
  
  const [postContent, setPostContent] = useState('');
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState('');
  
  const [confessionContent, setConfessionContent] = useState('');

  const [activeStory, setActiveStory] = useState<any>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const storyFileRef = useRef<HTMLInputElement>(null);
  const postFileRef = useRef<HTMLInputElement>(null);
  
  const { session, profile } = useAuthStore();
  const { 
    stories, posts, isDarkMode, confessions, notifications,
    fetchFeatures, 
    likePost, unlikePost, addComment, viewStory, reactToStory,
    addStory, deletePost,
    markNotificationsRead, clearNotifications, submitConfession
  } = useFeatureStore();

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
      const { supabase } = await import('../lib/supabase');
      const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, storyFile);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
      
      await addStory(session.user.id, profile?.name || 'You', urlData.publicUrl);
      
      setShowCreateStory(false);
      setStoryFile(null);
      setStoryPreview('');
    } catch (err: any) {
       alert(`❌ Story failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!session || (!postContent.trim() && !postFile)) return;
    setUploading(true);
    try {
      let imageUrl = '';
      if (postFile) {
        const path = `${session.user.id}/post_${Date.now()}.${postFile.name.split('.').pop()}`;
        const { supabase } = await import('../lib/supabase');
        await supabase.storage.from('post-images').upload(path, postFile);
        imageUrl = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
      }
      
      const { supabase } = await import('../lib/supabase');
      await supabase.from('posts').insert({
        user_id: session.user.id,
        content: postContent,
        image_url: imageUrl,
        likes: 0
      });
      
      setPostContent('');
      setPostFile(null);
      setPostPreview('');
      setShowCreatePost(false);
      await fetchFeatures();
    } catch (err: any) {
       alert(`❌ Post failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateConfession = async () => {
    if (!confessionContent.trim()) return;
    setUploading(true);
    try {
      await submitConfession(confessionContent, ['Campus Life']);
      setConfessionContent('');
      setShowCreateConfession(false);
      await fetchFeatures();
    } catch (err: any) {
       alert(`❌ Secret failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddComment = async () => {
    if (!session || !commentText.trim() || !activeCommentsPost) return;
    await addComment(activeCommentsPost.id, session.user.id, activeCommentsPost.user_id, commentText);
    setCommentText('');
  };
  
  const handleDeletePost = (postId: string) => {
    if (!confirm('Are you sure?')) return;
    deletePost(postId).catch(err => alert(err.message));
  };

  const handleClearNotifications = () => {
    if (!session) return;
    clearNotifications(session.user.id);
  };

  return (
    <div className={`min-h-screen overflow-y-auto pb-36 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Bar */}
      <div className={`sticky top-0 z-30 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary-500 to-indigo-500 bg-clip-text text-transparent italic">Poly Link</span>
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowNotifications(true); if(session) markNotificationsRead(session.user.id); }} className="relative p-2.5 rounded-xl bg-gray-500/10 active:scale-95 transition">
             <Bell size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
             {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
             )}
          </button>
          <button onClick={() => setShowCreatePost(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-black text-[10px] uppercase rounded-xl shadow-lg shadow-primary-500/20 active:scale-95 transition">
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
        {stories.map(story => (
          <button key={story.id} onClick={() => { setActiveStory(story); if (session) viewStory(story.id, session.user.id); }} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-[1.3rem] p-0.5 ring-2 ${story.is_viewed ? 'ring-gray-800' : 'ring-primary-500 shadow-[0_0_10px_rgba(238,75,43,0.3)]'}`}>
              <div className="w-full h-full rounded-[1.1rem] overflow-hidden">
                <img src={story.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[8px] font-black uppercase opacity-60 max-w-[50px] truncate">{story.user_name}</span>
          </button>
        ))}
      </div>

      {/* Confessions Section */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
            <Hash size={14} className="text-pink-500" /> Secrets
          </p>
          <button onClick={() => setShowCreateConfession(true)} className="text-[8px] font-black uppercase text-pink-500 border border-pink-500/20 px-2 py-1 rounded-lg">+ New</button>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar">
          {confessions.length === 0 ? <p className="text-[10px] opacity-20 uppercase font-black py-4 italic">No secrets yet...</p> 
          : confessions.map(c => (
            <div key={c.id} className={`flex-shrink-0 w-64 p-5 rounded-[2rem] border ${isDarkMode ? 'bg-gray-900 border-gray-800 shadow-xl' : 'bg-white border-pink-50 shadow-sm'}`}>
              <p className="text-[11px] italic font-medium opacity-80 leading-relaxed">"{c.content}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Feed */}
      <div className="space-y-6 px-4 pb-20">
        {loading ? <p className="text-center py-10 opacity-30 font-black text-xs uppercase animate-pulse">Syncing Campus Feed...</p> : posts.map(post => (
          <div key={post.id} className={`rounded-[2.5rem] overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
             <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                   <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary-100 shadow-inner">
                      {post.users?.avatar_url ? <img src={post.users.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full font-black text-primary-600 italic">P</span>}
                   </div>
                   <div className="flex items-center gap-2">
                      <p className="font-black text-[11px] uppercase tracking-tighter">{post.users?.name}</p>
                      {post.users?.is_verified && <Sparkles size={12} className="text-blue-500" />}
                   </div>
                </div>
                {post.user_id === session?.user.id && <button onClick={() => handleDeletePost(post.id)} className="text-red-500 opacity-40 hover:opacity-100 transition"><Trash2 size={16} /></button>}
             </div>
             {post.image_url && <img src={post.image_url} className="w-full aspect-square object-cover" alt="" />}
             <div className="p-6">
                <p className="text-sm opacity-80 mb-4 font-medium leading-relaxed">{post.content}</p>
                <div className="flex items-center gap-4">
                   <button onClick={() => post.is_liked ? unlikePost(post.id, session?.user.id || '') : likePost(post.id, post.user_id, session?.user.id || '')} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl active:scale-95 transition ${post.is_liked ? 'bg-primary-500 text-white' : 'bg-primary-500/10 text-primary-500 font-bold border border-primary-500/5'}`}>
                      <Heart size={16} fill={post.is_liked ? "currentColor" : "none"} strokeWidth={3} />
                      <span className="text-[10px] font-black">{post.likes || 0}</span>
                   </button>
                   <button onClick={() => setActiveCommentsPost(post)} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gray-500/10 active:scale-95 transition">
                      <MessageCircle size={16} className="opacity-60" />
                      <span className="text-[10px] font-black opacity-60">{post.comment_count || 0}</span>
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* ➕ CREATE POST MODAL */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6 text-black">
            <div className={`w-full max-w-sm rounded-[2.5rem] p-8 border ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-100 shadow-2xl text-black'}`}>
               <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black uppercase italic text-sm tracking-tighter">New Vibe</h3>
                  <button onClick={() => setShowCreatePost(false)} className="p-2 opacity-40 hover:rotate-90 transition"><X size={24} /></button>
               </div>
               <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="Share news, mood or questions..." className="w-full h-32 bg-transparent text-sm font-medium outline-none resize-none mb-6 italic" />
               {postPreview && <img src={postPreview} className="w-full h-40 object-cover rounded-2xl mb-6 shadow-xl" alt="" />}
               <div className="flex gap-3">
                  <button onClick={() => postFileRef.current?.click()} className="p-5 rounded-2xl bg-gray-500/10 active:scale-95 transition hover:bg-primary-500/10"><ImageIcon size={20} /></button>
                  <input ref={postFileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f){ setPostFile(f); setPostPreview(URL.createObjectURL(f)); } }} />
                  <button onClick={handleCreatePost} disabled={uploading || (!postContent.trim() && !postFile)} className="flex-1 py-5 bg-primary-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition disabled:opacity-50 text-black">
                     {uploading ? 'Processing...' : 'Share Now'}
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ➕ CREATE STORY MODAL */}
      <AnimatePresence>
        {showCreateStory && (
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[150] bg-black p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8 text-white">
                 <h2 className="text-xl font-black italic tracking-tighter uppercase">My Poly Story</h2>
                 <button onClick={() => setShowCreateStory(false)} className="p-3 bg-white/10 rounded-2xl"><X size={24} /></button>
              </div>
              <div className="flex-1 relative rounded-[3rem] overflow-hidden bg-gray-900 border border-white/10 shadow-inner">
                 {storyPreview && <img src={storyPreview} className="w-full h-full object-cover" alt="" />}
              </div>
              <div className="py-8 space-y-4">
                 <button onClick={handleCreateStory} disabled={uploading} className="w-full py-6 bg-primary-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-primary-500/40 active:scale-95 transition-all">
                   {uploading ? 'Blasting...' : 'Share with Campus'}
                 </button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🤫 CREATE CONFESSION MODAL */}
      <AnimatePresence>
        {showCreateConfession && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-xl flex items-center justify-center p-6">
             <div className={`w-full max-w-sm rounded-[2.5rem] p-8 border ${isDarkMode ? 'bg-gray-900 border-gray-800 shadow-2xl shadow-pink-500/10' : 'bg-white border-primary-50 shadow-2xl shadow-pink-500/5'}`}>
                <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500 mb-6"><ShieldAlert size={28} /></div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2 italic">Campus Secret</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 leading-relaxed">Absolute anonymity guaranteed. Share the truth.</p>
                <textarea value={confessionContent} onChange={e => setConfessionContent(e.target.value)} placeholder="What's the tea?" className="w-full h-32 bg-transparent text-sm italic font-medium outline-none resize-none mb-6" />
                <div className="flex gap-3">
                   <button onClick={() => setShowCreateConfession(false)} className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase opacity-40 hover:opacity-100 transition">Cancel</button>
                   <button onClick={handleCreateConfession} disabled={uploading || !confessionContent.trim()} className="flex-1 py-4 rounded-xl bg-pink-500 text-white font-black text-[10px] uppercase shadow-lg shadow-pink-500/30 active:scale-95 transition disabled:opacity-50">Drop It</button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔔 NOTIFICATIONS MODAL */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl p-6">
             <div className="flex items-center justify-between mb-8 text-white">
                <div className="flex items-center gap-3">
                   <Bell size={24} className="text-primary-500" />
                   <h2 className="text-2xl font-black italic tracking-tighter uppercase">Activity</h2>
                </div>
                <button onClick={() => setShowNotifications(false)} className="p-3 bg-white/10 rounded-2xl"><X size={20} /></button>
             </div>
             
             <div className="space-y-4 overflow-y-auto max-h-[70vh] hide-scrollbar pb-10">
                {notifications.length === 0 ? (
                  <div className="text-center py-20 opacity-20 font-black text-[10px] uppercase tracking-widest italic">No campus buzz yet...</div>
                ) : notifications.map(n => (
                  <div key={n.id} className={`p-4 rounded-3xl border transition-all ${n.is_read ? 'bg-white/5 border-white/5 opacity-60' : 'bg-primary-500/10 border-primary-500/20 shadow-lg shadow-primary-500/10 ring-1 ring-primary-500/20'}`}>
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-800 flex-shrink-0 shadow-inner overflow-hidden">
                           {n.users?.avatar_url && <img src={n.users.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1">
                           <p className="text-[11px] font-black uppercase text-white tracking-tight leading-none mb-1">{n.users?.name || 'Someone'}</p>
                           <p className="text-[10px] text-white/50 font-bold leading-tight uppercase tracking-tight italic">{n.content || `reacted to you`}</p>
                        </div>
                        <p className="text-[8px] font-black opacity-30 uppercase">{new Date(n.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                     </div>
                  </div>
                ))}
             </div>

             <div className="fixed bottom-10 left-6 right-6 flex gap-3">
                <button onClick={handleClearNotifications} className="flex-1 py-5 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition">Clear All</button>
                <button onClick={() => setShowNotifications(false)} className="flex-1 py-5 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest active:scale-95 transition">Return</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎬 STORY VIEWER MODAL */}
      <AnimatePresence>
        {activeStory && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black flex flex-col">
             <div className="absolute top-4 left-4 right-4 z-20 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div key={activeStory.id} initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 7 }} onAnimationComplete={() => setActiveStory(null)} className="h-full bg-white shadow-[0_0_10px_white]" />
             </div>
             <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                   <p className="font-black text-xs uppercase italic tracking-widest">{activeStory.user_name}</p>
                   {activeStory.is_verified && <CheckCircle2 size={14} className="text-blue-400" />}
                </div>
                <button onClick={() => setActiveStory(null)} className="p-2 bg-white/10 rounded-full hover:rotate-90 transition-transform"><X size={20} /></button>
             </div>
             <div className="flex-1 flex items-center justify-center p-4 relative">
                <img src={activeStory.image_url} className="w-full max-h-[75vh] rounded-[3rem] object-contain shadow-2xl shadow-white/5" alt="" />
             </div>
             <div className="p-8 flex justify-center gap-6">
               {['❤️', '🔥', '😂', '🙌'].map(e => <button key={e} onClick={() => { reactToStory(activeStory.id, activeStory.user_id, session?.user.id || '', e); setActiveStory(null); }} className="text-3xl hover:scale-125 hover:rotate-6 transition active:scale-90">{e}</button>)}
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 COMMENTS MODAL */}
      <AnimatePresence>
         {activeCommentsPost && (
           <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-end">
              <div className={`w-full p-8 rounded-t-[3rem] ${isDarkMode ? 'bg-gray-900 border-t border-gray-800 shadow-2xl' : 'bg-white border-t border-gray-100 shadow-2xl shadow-black/10'}`}>
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="font-black uppercase italic tracking-widest text-xs opacity-40 italic">Campus Vibes</h3>
                    <button onClick={() => setActiveCommentsPost(null)} className="p-2 opacity-50"><X size={20} /></button>
                 </div>
                 <div className="flex gap-4 items-center">
                    <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Join the ripple..." className={`flex-1 p-5 rounded-2xl outline-none font-bold text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200 border shadow-inner'}`} />
                    <button onClick={handleAddComment} className="w-14 h-14 bg-primary-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20 active:scale-95 transition"><Send size={20} /></button>
                 </div>
              </div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* Create Story Component Input */}
      <input ref={storyFileRef} type="file" accept="image/*" className="hidden" onChange={handleStoryFilePick} />

      {/* Post Image Input (Hidden) */}
      <input ref={postFileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f){ setPostFile(f); setPostPreview(URL.createObjectURL(f)); } }} />
    </div>
  );
}
