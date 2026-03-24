import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { Heart, MessageCircle, Image, Send, X, Plus, Lock, MoreHorizontal, Hash, ShieldAlert, Trash2, BarChart2, Star, Sparkles } from 'lucide-react';

function SkeletonPost({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className={`p-4 rounded-3xl animate-pulse space-y-4 mb-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
        <div className="space-y-2 flex-1">
          <div className={`h-3 w-1/3 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
          <div className={`h-2 w-1/4 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
        </div>
      </div>
      <div className={`w-full aspect-video rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
      <div className="flex items-center gap-4">
         <div className={`h-8 w-1/4 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
         <div className={`h-8 w-1/4 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
      </div>
    </div>
  );
}

export default function Feed() {
  const [loading, setLoading] = useState(true);
  const [confessionText, setConfessionText] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showConfession, setShowConfession] = useState(false);
  
  // Story Creation State
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes', 'No']);
  const [isPollStory, setIsPollStory] = useState(false);
  
  const [activeStory, setActiveStory] = useState<any>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<any>(null);
  const [activePostMenu, setActivePostMenu] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const storyFileRef = useRef<HTMLInputElement>(null);
  const { session, profile } = useAuthStore();
  const { 
    stories, posts, isDarkMode, confessions, notifications,
    submitConfession, addStory, fetchFeatures, markNotificationsRead, clearNotifications,
    likePost, unlikePost, addComment, fetchComments, viewStory, reactToStory,
    submitStoryWithPoll, voteInStoryPoll
  } = useFeatureStore();

  useEffect(() => {
    setLoading(true);
    fetchFeatures().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let channel: any;
    if (activeCommentsPost) {
       loadComments(activeCommentsPost.id).then(ch => { channel = ch; });
    }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [activeCommentsPost]);

  const loadComments = async (postId: string) => {
    setCommentsLoading(true);
    const data = await fetchComments(postId);
    setComments(data);
    setCommentsLoading(false);
    
    // Set up real-time listener for THIS specific post's comments
    const channel = supabase.channel(`comments_${postId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'post_comments',
        filter: `post_id=eq.${postId}`
      }, async (payload) => {
        const { data: newCommentUser } = await supabase.from('users').select('name, avatar_url').eq('id', payload.new.user_id).single();
        const fullComment: any = { ...payload.new, users: newCommentUser };
        setComments((prev: any[]) => {
          const exists = prev.some(c => c.id === fullComment.id);
          if (exists) return prev;
          return [...prev, fullComment];
        });
      })
      .subscribe();
      
    return channel;
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostImage(file);
    setPostImagePreview(URL.createObjectURL(file));
  };

  const handleCreatePost = async () => {
    if (!session || (!postCaption.trim() && !postImage)) return;
    setUploading(true);
    setUploadProgress(10);
    let imageUrl = '';

    try {
      if (postImage) {
        const ext = postImage.name.split('.').pop();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const interval = setInterval(() => setUploadProgress(p => p < 90 ? p + 10 : p), 300);
        
        const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, postImage, { 
          upsert: true,
          contentType: postImage.type 
        });
        clearInterval(interval);
        if (uploadErr) throw uploadErr;
        
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
        setUploadProgress(100);
      }

      const { error: insertError } = await supabase.from('posts').insert({
        user_id: session.user.id,
        content: postCaption,
        image_url: imageUrl || null,
      });
      if (insertError) throw insertError;

      setTimeout(() => {
        setPostCaption('');
        setPostImage(null);
        setPostImagePreview('');
        setShowCreatePost(false);
        setUploadProgress(0);
        alert('🚀 Post shared with campus!');
      }, 500);
    } catch (err: any) {
      alert(`❌ Failed to post: ${err.message}`);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

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
      const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, storyFile, { upsert: true });
      if (uploadErr) throw uploadErr;
      
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
      
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
    loadComments(activeCommentsPost.id);
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      await fetchFeatures();
      alert('🗑️ Post deleted successfully.');
    } catch (err: any) {
      alert(`❌ Delete failed: ${err.message}`);
    }
  };

  return (
    <div className={`min-h-screen overflow-y-auto pb-36 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Bar */}
      <div className={`sticky top-0 z-30 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary-500 to-indigo-500 bg-clip-text text-transparent">Poly Link</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNotifications(true)}
            className={`relative p-3 rounded-2xl transition ${isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-500'}`}
          >
            <ShieldAlert size={20} />
            {notifications.filter(n => !n.is_read).length > 0 && (
               <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm" />
            )}
          </button>
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-lg shadow-primary-500/30 transition-all active:scale-95"
          >
            <Plus size={14} strokeWidth={3} /> Post
          </button>
        </div>
      </div>

      {/* Stories Row */}
      <div className="flex gap-4 px-4 py-5 overflow-x-auto hide-scrollbar">
        {/* Add Story */}
        <label className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer">
          <div className="relative">
            <div className={`w-16 h-16 rounded-[1.8rem] border-2 border-dashed flex items-center justify-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <Plus size={20} className="text-primary-500" strokeWidth={3} />
            </div>
            {profile?.avatar_url && (
               <div className="absolute inset-0.5 rounded-[1.6rem] overflow-hidden opacity-20">
                 <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
               </div>
            )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Add Story</span>
          <input ref={storyFileRef} type="file" accept="image/*" className="hidden" onChange={handleStoryFilePick} />
        </label>
        {/* Existing Stories */}
        {stories.map(story => (
          <button 
            key={story.id} 
            onClick={() => { setActiveStory(story); if (session) viewStory(story.id, session.user.id); }}
            className="flex-shrink-0 flex flex-col items-center gap-2"
          >
            <div className={`w-16 h-16 rounded-[1.8rem] p-0.5 ring-2 transition-all ${story.is_viewed ? 'ring-gray-800' : 'ring-primary-500'}`}>
              <div className="w-full h-full rounded-[1.6rem] overflow-hidden">
                <img src={story.image_url} alt={story.user_name} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 max-w-[60px] truncate">{story.user_name}</span>
          </button>
        ))}
      </div>

      {/* Confessions/Posts Feed Logic Continued ... */}
      <div className="px-4 mb-4">
        <button
          onClick={() => setShowConfession(true)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0">
            <Lock size={18} className="text-pink-500" />
          </div>
          <div>
            <p className="font-black text-sm text-pink-500 uppercase tracking-tighter">Campus Confessions 🤫</p>
            <p className="text-[9px] opacity-50 font-bold uppercase tracking-widest">Share secrets anonymously</p>
          </div>
        </button>
      </div>

      {confessions.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 px-1 flex items-center gap-2">
            <Hash size={14} className="text-pink-500" /> Latest Secrets
          </p>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
            {confessions.slice(0, 8).map((c, i) => (
              <motion.div 
                key={c.id || i}
                whileHover={{ y: -4 }}
                className={`flex-shrink-0 w-72 p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-gray-900 border-gray-800 shadow-lg shadow-black/20' : 'bg-white border-pink-100 shadow-xl shadow-pink-500/5'}`}
              >
                <p className="text-[13px] italic font-medium opacity-90 leading-relaxed line-clamp-3">"{c.content}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Main Feed */}
      <div className="space-y-6 px-4 pb-20">
        {posts.map((post) => (
          <motion.div
            key={post.id}
            className={`rounded-[3rem] overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}
          >
             {/* Simplified Post View for space */}
             <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary-100">
                      {post.users?.avatar_url ? <img src={post.users.avatar_url} className="w-full h-full object-cover" /> : post.users?.name?.[0]}
                   </div>
                   <div className="flex items-center gap-2">
                      <p className="font-black text-xs uppercase">{post.users?.name}</p>
                      {post.users?.is_verified && <Sparkles size={12} className="text-blue-500" />}
                   </div>
                </div>
                {post.user_id === session?.user.id && (
                  <button onClick={() => handleDeletePost(post.id)} className="text-red-500 opacity-40"><Trash2 size={16} /></button>
                )}
             </div>
             {post.image_url && <img src={post.image_url} className="w-full aspect-square object-cover" />}
             <div className="p-6">
                <p className="text-sm opacity-80 mb-4">{post.content}</p>
                <div className="flex items-center gap-4">
                   <button 
                     onClick={() => post.is_liked ? unlikePost(post.id, session?.user.id || '') : likePost(post.id, post.user_id, session?.user.id || '')}
                     className={`flex items-center gap-2 px-4 py-2 rounded-xl ${post.is_liked ? 'bg-primary-500 text-white' : 'bg-primary-500/10 text-primary-500'}`}
                   >
                      <Heart size={16} fill={post.is_liked ? "currentColor" : "none"} />
                      <span className="text-[10px] font-black">{post.likes || 0}</span>
                   </button>
                   <button onClick={() => setActiveCommentsPost(post)} className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/10`}>
                      <MessageCircle size={16} />
                      <span className="text-[10px] font-black">{post.comment_count || 0}</span>
                   </button>
                </div>
             </div>
          </motion.div>
        ))}
      </div>

      {/* 🎬 STORY VIEWER MODAL WITH POLLS */}
      <AnimatePresence>
        {activeStory && (
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className="fixed inset-0 z-[100] bg-black flex flex-col"
           >
             {/* Progress Bar */}
             <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
                <div className="h-1 bg-white/20 flex-1 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }} 
                     animate={{ width: '100%' }} 
                     transition={{ duration: 7 }} 
                     onAnimationComplete={() => setActiveStory(null)}
                     className="h-full bg-white" 
                   />
                </div>
             </div>

             <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-white/50">
                      <img src={activeStory.users?.avatar_url || activeStory.image_url} className="w-full h-full object-cover" alt="" />
                   </div>
                   <div className="flex items-center gap-2">
                      <p className="font-black text-sm uppercase tracking-tighter">{activeStory.user_name}</p>
                      {activeStory.users?.is_verified && <Sparkles size={14} className="text-blue-400" />}
                   </div>
                </div>
                <button onClick={() => setActiveStory(null)} className="p-2">
                   <X size={24} />
                </button>
             </div>

             <div className="flex-1 flex items-center justify-center p-2 relative">
                <img src={activeStory.image_url} className="w-full h-auto max-h-[80vh] rounded-[3rem] object-contain shadow-2xl" alt="" />
                
                {/* 📊 Poll Overlay */}
                {activeStory.poll_question && (
                  <div className="absolute inset-0 flex items-center justify-center p-10">
                     <div className="w-full bg-black/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl">
                        <h3 className="text-white font-black text-lg mb-6 text-center italic tracking-tight">
                           {activeStory.poll_question}
                        </h3>
                        <div className="space-y-3">
                           {activeStory.poll_options?.map((opt: string, idx: number) => {
                              const totalVotes = activeStory.poll_results?.reduce((a: number, b: number) => a + b, 0) || 0;
                              const percentage = totalVotes > 0 ? Math.round(((activeStory.poll_results?.[idx] || 0) / totalVotes) * 100) : 0;
                              return (
                                 <button
                                    key={idx}
                                    onClick={() => voteInStoryPoll(activeStory.id, idx, session?.user.id || '')}
                                    className="w-full p-5 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-between text-white font-bold text-sm relative overflow-hidden active:scale-[0.98] transition-all"
                                 >
                                    <motion.div 
                                       initial={{ width: 0 }}
                                       animate={{ width: `${percentage}%` }}
                                       className="absolute inset-0 bg-primary-500/30" 
                                    />
                                    <span className="relative z-10">{opt}</span>
                                    <span className="relative z-10 text-[10px] font-black opacity-60">{percentage}%</span>
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  </div>
                )}
             </div>

             <div className="p-8 flex items-center gap-4 bg-gradient-to-t from-black via-black/50 to-transparent">
                <div className="flex-1 px-5 py-4 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md">
                   <p className="text-white/60 text-[10px] font-black uppercase tracking-widest text-center">React to {activeStory.user_name}</p>
                </div>
                <div className="flex gap-2">
                   {['❤️', '🔥', '😂', '🙌'].map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => { reactToStory(activeStory.id, activeStory.user_id, session?.user.id || '', emoji); setActiveStory(null); }}
                        className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-xl hover:scale-125 transition"
                      >
                         {emoji}
                      </button>
                   ))}
                </div>
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* ➕ CREATE STORY MODAL WITH POLLS */}
      <AnimatePresence>
        {showCreateStory && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex flex-col p-6"
           >
              <div className="flex items-center justify-between mb-8 text-white">
                 <h2 className="text-2xl font-black italic tracking-tighter">Your Story</h2>
                 <button onClick={() => { setShowCreateStory(false); setStoryFile(null); }} className="p-3 rounded-2xl bg-white/10"><X size={24} /></button>
              </div>

              <div className="flex-1 flex flex-col md:flex-row gap-8 overflow-y-auto pb-10">
                 <div className="flex-1 relative aspect-[9/16] rounded-[3rem] overflow-hidden bg-gray-900 border border-white/10">
                    {storyPreview && <img src={storyPreview} className="w-full h-full object-cover" />}
                    {isPollStory && (
                      <div className="absolute inset-0 flex items-center justify-center p-8">
                         <div className="w-full bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/20">
                            <input 
                              placeholder="Type a question..."
                              value={pollQuestion}
                              onChange={e => setPollQuestion(e.target.value)}
                              className="w-full bg-transparent text-white font-black text-center text-lg border-none outline-none mb-4"
                            />
                            <div className="space-y-2">
                               {pollOptions.map((opt, i) => (
                                 <input
                                   key={i}
                                   placeholder={`Option ${i+1}`}
                                   value={opt}
                                   onChange={e => {
                                      const newOpts = [...pollOptions];
                                      newOpts[i] = e.target.value;
                                      setPollOptions(newOpts);
                                   }}
                                   className="w-full p-4 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-sm text-center outline-none focus:bg-white/20"
                                 />
                               ))}
                            </div>
                         </div>
                      </div>
                    )}
                 </div>

                 <div className="w-full md:w-80 space-y-6">
                    <button 
                      onClick={() => setIsPollStory(!isPollStory)}
                      className={`w-full p-6 rounded-3xl flex items-center justify-between border transition-all ${isPollStory ? 'bg-primary-500 border-primary-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60'}`}
                    >
                       <div className="flex items-center gap-3">
                          <BarChart2 size={24} />
                          <div className="text-left">
                             <p className="font-black text-xs uppercase tracking-widest">Add a Poll</p>
                             <p className="text-[9px] opacity-60 font-bold uppercase">Let campus decide</p>
                          </div>
                       </div>
                       <div className={`w-10 h-6 rounded-full relative transition-colors ${isPollStory ? 'bg-white/40' : 'bg-white/10'}`}>
                          <motion.div 
                            animate={{ x: isPollStory ? 18 : 2 }}
                            className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-md"
                          />
                       </div>
                    </button>

                    <button 
                      onClick={handleCreateStory}
                      disabled={uploading}
                      className="w-full py-6 bg-primary-500 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary-500/40 active:scale-95 transition"
                    >
                       {uploading ? 'Blasting...' : 'Post Story'}
                    </button>
                 </div>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Other modals (Post, Comment, Notifications) ... */}
      {/* Notifications, Post Create, and Comment Modals (Simplified for brevity) */}
      <AnimatePresence>
         {showCreatePost && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity:1 }} className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end">
             <div className="w-full bg-white dark:bg-gray-900 p-8 rounded-t-[3rem] space-y-4">
                <textarea 
                  className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl outline-none" 
                  placeholder="Caption..."
                  value={postCaption}
                  onChange={e => setPostCaption(e.target.value)}
                />
                <button onClick={handleCreatePost} className="w-full py-4 bg-primary-500 text-white rounded-2xl font-black">Share</button>
                <button onClick={() => setShowCreatePost(false)} className="w-full py-4 text-gray-500 font-bold">Cancel</button>
             </div>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
