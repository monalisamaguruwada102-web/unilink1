import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, X, Plus, Hash, Trash2, Sparkles, Bell, CheckCircle2, MoreVertical, Image as ImageIcon, Send, Smile, TrendingUp, Users, Flag, Copy, Share2 } from 'lucide-react';

export default function Feed() {
  const [liveOnlineCount, setLiveOnlineCount] = useState(0);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [votedPollOption, setVotedPollOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<string | null>(null);
  // State for Modals
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showConfessionModal, setShowConfessionModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<any>(null);

  // Form State
  const [postContent, setPostContent] = useState('');
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState('');
  const [commentText, setCommentText] = useState('');
  const [activeComments, setActiveComments] = useState<any[]>([]);
  const [confessionText, setConfessionText] = useState('');
  const [uploading, setUploading] = useState(false);

  // Story state
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes', 'No']);
  const [isPollStory, setIsPollStory] = useState(false);
  
  const storyFileRef = useRef<HTMLInputElement>(null);
  const postFileRef = useRef<HTMLInputElement>(null);
  
  const { session, profile } = useAuthStore();
  const { 
    stories, posts, isDarkMode, confessions, notifications, currentPoll, onlineCount,
    fetchFeatures, fetchComments,
    likePost, unlikePost, addComment, viewStory, reactToStory,
    submitStoryWithPoll, addStory, voteInStoryPoll, deletePost, createPost,
    markNotificationsRead, clearNotifications, submitConfession, createPoll
  } = useFeatureStore();

  useEffect(() => {
    if (activeCommentsPost) {
       fetchComments(activeCommentsPost.id).then(setActiveComments);
    } else {
       setActiveComments([]);
    }
  }, [activeCommentsPost, fetchComments]);

  useEffect(() => {
    setLoading(true);
    fetchFeatures().finally(() => setLoading(false));
  }, []);

  // ── Real-time Presence: count users actually on app now ──────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    const presenceCh = supabase.channel('global_presence', {
      config: { presence: { key: session.user.id } },
    });
    presenceCh
      .on('presence', { event: 'sync' }, () => {
        const state = presenceCh.presenceState();
        setLiveOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceCh.track({ user_id: session.user.id, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(presenceCh); };
  }, [session?.user?.id]);

  const handleStoryFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStoryFile(file);
    setStoryPreview(URL.createObjectURL(file));
    setShowCreateStory(true);
  };

  const handlePostFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostFile(file);
    setPostPreview(URL.createObjectURL(file));
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
        const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, postFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      
      await createPost(session.user.id, postContent, imageUrl);
      setShowCreatePost(false);
      setPostContent('');
      setPostFile(null);
      setPostPreview('');
    } catch (err: any) {
      alert(`❌ Post failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddComment = async () => {
    if (!session || !commentText.trim() || !activeCommentsPost) return;
    await addComment(activeCommentsPost.id, session.user.id, activeCommentsPost.user_id, commentText);
    setCommentText('');
    fetchComments(activeCommentsPost.id).then(setActiveComments);
  };
  
  const handleAddConfession = async () => {
    if (!confessionText.trim()) return;
    await submitConfession(confessionText, []);
    setConfessionText('');
    setShowConfessionModal(false);
  };
  
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || !session) return;
    const validOptions = pollOptions.filter(o => o.trim()).map(o => ({ label: o, votes: 0 }));
    if (validOptions.length < 2) {
      alert("At least 2 options required");
      return;
    }
    await createPoll(pollQuestion, validOptions, session.user.id);
    setPollQuestion('');
    setPollOptions(['Yes', 'No']);
    setShowPollModal(false);
  };
  
  const handleDeletePost = (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    deletePost(postId).catch((err: any) => alert(err.message));
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return then.toLocaleDateString();
  };

  const greet = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className={`min-h-screen overflow-y-auto pb-36 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* 🚀 TOP BAR */}
      <div className={`sticky top-0 z-30 flex items-center justify-between px-6 py-5 border-b backdrop-blur-2xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary-500 to-indigo-500 bg-clip-text text-transparent">Poly Link</span>
          <span className="text-[8px] font-black uppercase tracking-widest opacity-40 ml-0.5">Campus Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowNotifications(true); if(session) markNotificationsRead(session.user.id); }} className="relative p-2.5 rounded-2xl bg-gray-500/10 hover:bg-gray-500/20 transition-all">
             <Bell size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
             {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
             )}
          </button>
          <button onClick={() => setShowCreatePost(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-black text-[10px] uppercase rounded-2xl shadow-xl shadow-primary-500/30 active:scale-95 transition-all">
            <Plus size={14} strokeWidth={3} /> Post
          </button>
        </div>
      </div>

      {/* 👋 WELCOME SECTION */}
      <div className="px-6 pt-6 mb-2">
         <div className={`p-6 rounded-[2.5rem] border relative overflow-hidden ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="relative z-10">
               <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{greet()}, Poly Student</p>
               <h2 className="text-2xl font-black tracking-tight mb-2">Welcome Back, <span className="text-primary-500">{profile?.name || 'Viber'}</span>!</h2>
               <div className="flex flex-wrap gap-2 mt-4">
                  <div className="px-3 py-1.5 rounded-xl bg-primary-500/10 text-primary-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-primary-500/10">
                    <Sparkles size={10} /> {profile?.course || 'No Course Set'}
                  </div>
                   <motion.div
                     key={liveOnlineCount}
                     initial={{ scale: 0.85 }}
                     animate={{ scale: 1 }}
                     className="px-3 py-1.5 rounded-xl bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-green-500/10"
                   >
                     <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                     <Users size={10} /> {liveOnlineCount > 0 ? liveOnlineCount : onlineCount} Online Now
                   </motion.div>
               </div>
            </div>
            {/* Abstract Decorative Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full -ml-12 -mb-12 blur-2xl" />
         </div>
      </div>

      {/* 🎬 STORIES ROW */}
      <div className="flex gap-4 px-6 py-6 overflow-x-auto hide-scrollbar">
        <label className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group">
          <div className={`w-16 h-16 rounded-[1.8rem] border-2 border-dashed flex items-center justify-center transition-all ${isDarkMode ? 'border-gray-800 group-hover:border-primary-500/50' : 'border-gray-200 group-hover:border-primary-500/50'}`}>
            <Plus size={24} className="text-primary-500" />
          </div>
          <span className="text-[9px] font-black uppercase opacity-40">My Story</span>
          <input ref={storyFileRef} type="file" accept="image/*" className="hidden" onChange={handleStoryFilePick} />
        </label>
        {stories.map(story => (
          <button key={story.id} onClick={() => { setActiveStory(story); if (session) viewStory(story.id, session.user.id); }} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className={`w-16 h-16 rounded-[1.8rem] p-0.5 ring-2 transition-all ${story.is_viewed ? 'ring-gray-800 scale-95 opacity-60' : 'ring-primary-500 shadow-lg shadow-primary-500/20'}`}>
              <div className="w-full h-full rounded-[1.6rem] overflow-hidden bg-gray-200">
                <img src={story.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[9px] font-black uppercase opacity-50 max-w-[64px] truncate">{story.user_name}</span>
          </button>
        ))}
      </div>

      {/* 🔮 CAMPUS PULSE (POLLS & SECRETS) */}
      <div className="px-6 mb-8">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-500" /> Campus Pulse
           </h3>
           <div className="flex items-center gap-2">
             {profile?.is_verified && (
               <button onClick={() => setShowPollModal(true)} className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-500/10 px-3 py-1.5 rounded-xl">
                 + Add Poll
               </button>
             )}
           </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
           {/* Current Poll — Now Clickable */}
           {currentPoll && (
             <div className={`p-6 rounded-[2.5rem] border ${isDarkMode ? 'bg-gray-900/50 border-gray-800/50' : 'bg-indigo-500/5 border-indigo-500/10'}`}>
               <div className="flex items-center gap-2 mb-4">
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="p-1 px-2 bg-indigo-500 text-white text-[8px] font-black uppercase rounded-lg">● LIVE</motion.span>
                  <p className="text-[12px] font-black opacity-90">{currentPoll.question}</p>
               </div>
               <div className="space-y-2">
               {currentPoll.options.map((opt, i) => {
                    const totalVotes = currentPoll.options.reduce((s, o) => s + (o.votes || 0), 0);
                    const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                    const isVoted = votedPollOption === i;
                    return (
                      <button
                        key={i}
                        onClick={() => { if (votedPollOption === null) { setVotedPollOption(i); useFeatureStore.getState().voteInPoll(i); } }}
                        className={`w-full p-4 rounded-2xl border text-left text-[10px] font-black uppercase tracking-widest relative overflow-hidden transition-all active:scale-95 ${
                          isVoted ? 'border-indigo-500 text-indigo-500' : isDarkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-indigo-500/5'
                        }`}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: votedPollOption !== null ? `${pct}%` : '0%' }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className={`absolute inset-0 ${isVoted ? 'bg-indigo-500/20' : 'bg-gray-500/10'}`}
                        />
                        <span className="relative z-10 flex justify-between items-center">
                          <span>{opt.label}</span>
                          {votedPollOption !== null && <span className="text-indigo-500 italic">{pct}%</span>}
                        </span>
                      </button>
                    );
                  })}
               </div>
               {votedPollOption === null && (
                 <p className="text-center text-[8px] font-black uppercase opacity-20 tracking-widest mt-3">Tap an option to vote</p>
               )}
             </div>
           )}

           {/* Secrets — always visible */}
           <div className={`p-5 rounded-[2.5rem] border flex items-center gap-4 relative ${isDarkMode ? 'bg-pink-500/5 border-pink-500/10' : 'bg-pink-50 border-pink-100'}`}>
              <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
                 <Hash size={20} />
              </div>
              <div className="flex-1 overflow-hidden">
                 <p className="text-[9px] font-black uppercase text-pink-600 mb-1 opacity-60">Campus Confessions</p>
                 <p className="text-xs font-bold italic truncate opacity-80">{confessions.length > 0 ? `"${confessions[0].content}"` : 'Be the first to whisper...'}</p>
              </div>
              <button
                onClick={() => setShowConfessionModal(true)}
                className="shrink-0 flex items-center gap-1 bg-pink-500 text-white px-3 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition shadow-lg shadow-pink-500/30"
              >
                <Plus size={12} /> Add
              </button>
           </div>
        </div>
      </div>

      {/* 📰 MAIN FEED */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Global Feed</h3>
           <div className="flex items-center gap-2">
              <button className="text-[9px] font-black uppercase tracking-widest text-primary-500">Recent</button>
              <div className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
           </div>
        </div>

        <div className="space-y-6 pb-20">
          {loading ? (
            <div className="text-center py-20 opacity-20 font-black text-[10px] uppercase tracking-widest animate-pulse">Syncing Campus Vibrations...</div>
          ) : posts.map(post => (
            <motion.div 
              key={post.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[2.8rem] overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
            >
               {/* User Info */}
               <div className="flex items-center justify-between px-6 py-5">
                  <div className="flex items-center gap-4">
                     <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-100 to-indigo-100 p-0.5 border border-primary-500/10">
                        {post.users?.avatar_url ? (
                          <img src={post.users.avatar_url} className="w-full h-full object-cover rounded-[0.8rem]" alt="" />
                        ) : (
                          <div className="w-full h-full rounded-[0.8rem] bg-primary-500/10 flex items-center justify-center text-primary-500 font-black text-sm italic">
                            {post.users?.name?.[0] || 'U'}
                          </div>
                        )}
                     </div>
                     <div>
                        <div className="flex items-center gap-1.5">
                           <p className="font-black text-sm tracking-tight">{post.users?.name}</p>
                           {post.users?.is_verified && <Sparkles size={12} className="text-blue-500" strokeWidth={3} />}
                        </div>
                        <div className="flex items-center gap-2 opacity-40">
                          <p className="text-[9px] font-black uppercase tracking-widest">{post.users?.course || 'Student'}</p>
                          <span className="w-1 h-1 bg-current rounded-full" />
                          <p className="text-[9px] font-black uppercase tracking-widest">{timeAgo(post.created_at)}</p>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.user_id === session?.user.id && (
                      <button onClick={() => handleDeletePost(post.id)} className="p-2 text-red-500/30 hover:text-red-500 transition-all bg-red-500/5 rounded-xl">
                        <Trash2 size={16} />
                      </button>
                    )}
                                         <div className="relative">
                     <button
                       onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                       className={`p-2.5 rounded-2xl transition-all ${openMenuPostId === post.id ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700') : 'opacity-30 hover:opacity-100'}`}
                     >
                       <MoreVertical size={16} />
                     </button>
                     <AnimatePresence>
                       {openMenuPostId === post.id && (
                         <motion.div
                           initial={{ opacity: 0, scale: 0.85, y: -8 }}
                           animate={{ opacity: 1, scale: 1, y: 0 }}
                           exit={{ opacity: 0, scale: 0.85, y: -8 }}
                           transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                           className={`absolute right-0 top-12 z-50 w-52 rounded-[1.5rem] border shadow-2xl overflow-hidden ${
                             isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'
                           }`}
                           onClick={e => e.stopPropagation()}
                         >
                           {post.user_id === session?.user.id ? (
                             <>
                               <button onClick={() => { if (navigator.share) navigator.share({ title: 'Poly Link', text: post.content, url: window.location.href }); setOpenMenuPostId(null); }} className={`w-full flex items-center gap-3 px-5 py-4 text-[11px] font-black uppercase tracking-widest transition hover:bg-gray-500/10`}>
                                 <Share2 size={15} className="text-indigo-500" /> Share Post
                               </button>
                               <button onClick={() => { navigator.clipboard.writeText(post.content); setOpenMenuPostId(null); }} className={`w-full flex items-center gap-3 px-5 py-4 text-[11px] font-black uppercase tracking-widest transition hover:bg-gray-500/10`}>
                                 <Copy size={15} className="text-green-500" /> Copy Text
                               </button>
                               <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`} />
                               <button onClick={() => { setOpenMenuPostId(null); handleDeletePost(post.id); }} className="w-full flex items-center gap-3 px-5 py-4 text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition">
                                 <Trash2 size={15} /> Delete Post
                               </button>
                             </>
                           ) : (
                             <>
                               <button onClick={() => { if (navigator.share) navigator.share({ title: 'Poly Link', text: post.content, url: window.location.href }); setOpenMenuPostId(null); }} className="w-full flex items-center gap-3 px-5 py-4 text-[11px] font-black uppercase tracking-widest hover:bg-gray-500/10 transition">
                                 <Share2 size={15} className="text-indigo-500" /> Share Post
                               </button>
                               <button onClick={() => { navigator.clipboard.writeText(post.content); setOpenMenuPostId(null); }} className="w-full flex items-center gap-3 px-5 py-4 text-[11px] font-black uppercase tracking-widest hover:bg-gray-500/10 transition">
                                 <Copy size={15} className="text-green-500" /> Copy Text
                               </button>
                               <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`} />
                               <button onClick={() => { alert('✅ Post reported. Our team will review it shortly.'); setOpenMenuPostId(null); }} className="w-full flex items-center gap-3 px-5 py-4 text-[11px] font-black uppercase tracking-widest text-amber-500 hover:bg-amber-500/10 transition">
                                 <Flag size={15} /> Report Post
                               </button>
                             </>
                           )}
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                  </div>
               </div>

               {/* Post Content */}
               <div className="px-7 pb-4">
                  <p className="text-[15px] leading-relaxed font-medium opacity-90">{post.content}</p>
               </div>

               {/* Post Image */}
               {post.image_url && (
                 <div className="px-6 pb-4">
                    <div className="rounded-[2rem] overflow-hidden border border-gray-500/10 shadow-lg">
                       <img src={post.image_url} className="w-full h-auto object-cover max-h-[400px]" alt="" />
                    </div>
                 </div>
               )}

               {/* Actions */}
               <div className="px-6 py-5 border-t border-gray-500/5 flex items-center justify-between bg-gray-500/5">
                  <div className="flex items-center gap-4">
                     <button 
                       disabled={likingId === post.id}
                       onClick={async (e) => {
                         e.stopPropagation();
                         if (likingId === post.id) return;
                         setLikingId(post.id);
                         try {
                           if (post.is_liked) {
                             await unlikePost(post.id, session?.user.id || '');
                           } else {
                             await likePost(post.id, post.user_id, session?.user.id || '');
                           }
                         } finally {
                           setLikingId(null);
                         }
                       }} 
                       className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all active:scale-95 ${post.is_liked ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-primary-500/10 text-primary-500 font-bold'}`}
                     >
                        <Heart size={18} fill={post.is_liked ? "currentColor" : "none"} strokeWidth={3} className={likingId === post.id ? 'animate-pulse' : ''} />
                        <span className="text-[11px] font-black">{post.likes || 0}</span>
                     </button>
                     <button 
                       onClick={() => setActiveCommentsPost(post)} 
                       className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-500/10 hover:bg-gray-500/20 transition-all"
                     >
                        <MessageCircle size={18} strokeWidth={2.5} />
                        <span className="text-[11px] font-black">{post.comment_count || 0}</span>
                     </button>
                  </div>
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: 'Poly Link', text: post.content, url: window.location.href }).catch(console.error);
                      } else {
                        alert('Link copied to clipboard!');
                      }
                    }}
                    className="p-3 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 rounded-2xl"
                  >
                     <Send size={18} strokeWidth={2.5} />
                  </button>
               </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ➕ CREATE POST MODAL */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-end">
            <motion.div 
               initial={{ y: '100%' }} 
               animate={{ y: 0 }} 
               exit={{ y: '100%' }} 
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className={`w-full max-h-[90vh] rounded-t-[3.5rem] flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
               <div className="p-8 flex items-center justify-between border-b border-gray-500/10">
                  <h2 className="text-xl font-black italic tracking-tighter uppercase uppercase">Create Post</h2>
                  <button onClick={() => setShowCreatePost(false)} className="p-3 bg-gray-500/10 rounded-2xl"><X size={20} /></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  <div className="flex gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-primary-100 shrink-0 overflow-hidden shadow-inner">
                        {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : null}
                     </div>
                     <textarea 
                        value={postContent}
                        onChange={e => setPostContent(e.target.value)}
                        placeholder="What's vibing on campus today? 🏫"
                        className="w-full bg-transparent border-none outline-none text-lg font-medium resize-none min-h-[150px]"
                     />
                  </div>

                  {postPreview && (
                    <div className="relative rounded-[2.5rem] overflow-hidden border-2 border-primary-500/10 shadow-2xl">
                       <img src={postPreview} className="w-full h-auto max-h-[300px] object-cover" />
                       <button onClick={() => { setPostFile(null); setPostPreview(''); }} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"><X size={20} /></button>
                    </div>
                  )}
               </div>

               <div className="p-8 border-t border-gray-500/10 space-y-4 pb-12">
                  <div className="flex items-center gap-3">
                     <button onClick={() => postFileRef.current?.click()} className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-gray-500/10 font-bold text-xs">
                        <ImageIcon size={20} className="text-primary-500" /> Image
                     </button>
                     <button className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-gray-500/10 font-bold text-xs">
                        <Smile size={20} className="text-amber-500" /> Emoji
                     </button>
                     <input ref={postFileRef} type="file" accept="image/*" className="hidden" onChange={handlePostFilePick} />
                  </div>
                  <button 
                    onClick={handleCreatePost}
                    disabled={uploading || (!postContent.trim() && !postFile)}
                    className="w-full py-6 bg-primary-500 text-white rounded-[2.3rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary-500/30 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {uploading ? 'Synching Pulse...' : 'Post Vibration'}
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ➕ ADD CONFESSION MODAL */}
      <AnimatePresence>
        {showConfessionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-end">
            <motion.div 
               initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className={`w-full max-h-[90vh] rounded-t-[3.5rem] flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
               <div className="p-8 flex items-center justify-between border-b border-gray-500/10">
                  <h2 className="text-xl font-black italic tracking-tighter uppercase text-pink-500">Share a Secret</h2>
                  <button onClick={() => setShowConfessionModal(false)} className="p-3 bg-gray-500/10 rounded-2xl"><X size={20} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8">
                  <textarea 
                     value={confessionText}
                     onChange={e => setConfessionText(e.target.value)}
                     placeholder="Whisper something anonymously..."
                     className="w-full bg-transparent border-none outline-none text-lg font-medium resize-none min-h-[150px]"
                  />
               </div>
               <div className="p-8 border-t border-gray-500/10 space-y-4 pb-12">
                  <button onClick={handleAddConfession} disabled={!confessionText.trim()} className="w-full py-6 bg-pink-500 text-white rounded-[2.3rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-pink-500/30 disabled:opacity-50 active:scale-95 transition-all">
                    Drop Secret
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ➕ ADD POLL MODAL */}
      <AnimatePresence>
        {showPollModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-end">
            <motion.div 
               initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               className={`w-full max-h-[90vh] rounded-t-[3.5rem] flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
               <div className="p-8 flex items-center justify-between border-b border-gray-500/10">
                  <h2 className="text-xl font-black italic tracking-tighter uppercase text-indigo-500">Create Campus Poll</h2>
                  <button onClick={() => setShowPollModal(false)} className="p-3 bg-gray-500/10 rounded-2xl"><X size={20} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 space-y-4">
                  <input placeholder="Poll Question..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="w-full bg-transparent text-xl font-black mb-6 border-none outline-none italic tracking-tighter" />
                  {pollOptions.map((o, i) => (
                    <input key={i} value={o} onChange={e => { const no = [...pollOptions]; no[i] = e.target.value; setPollOptions(no); }} className={`w-full p-5 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} text-sm font-bold mb-3 outline-none focus:border-indigo-500 transition`} placeholder={`Option ${i+1}`} />
                  ))}
                  {pollOptions.length < 4 && (
                     <button onClick={() => setPollOptions([...pollOptions, ''])} className="w-full py-4 text-[10px] font-black uppercase text-indigo-500 border border-indigo-500/20 border-dashed rounded-2xl">+ Add Option</button>
                  )}
               </div>
               <div className="p-8 border-t border-gray-500/10 pb-12">
                  <button onClick={handleCreatePoll} disabled={!pollQuestion.trim() || pollOptions.filter(o=>o.trim()).length < 2} className="w-full py-6 bg-indigo-500 text-white rounded-[2.3rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-indigo-500/30 disabled:opacity-50 active:scale-95 transition-all">
                    Launch Poll
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎬 STORY VIEWER MODAL */}
      <AnimatePresence>
        {activeStory && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black flex flex-col">
             <div className="absolute top-4 left-4 right-4 z-[210] h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div key={activeStory.id} initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 7 }} onAnimationComplete={() => setActiveStory(null)} className="h-full bg-white shadow-[0_0_10px_white]" />
             </div>
             <div className="absolute top-8 left-4 right-4 z-[210] flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                      {activeStory.users?.avatar_url ? <img src={activeStory.users.avatar_url} className="w-full h-full object-cover" /> : null}
                   </div>
                   <p className="font-black text-xs uppercase italic tracking-widest">{activeStory.user_name}</p>
                   {activeStory.is_verified && <CheckCircle2 size={14} className="text-blue-400" />}
                </div>
                <button onClick={() => setActiveStory(null)} className="p-2 bg-white/10 rounded-full"><X size={20} /></button>
             </div>
             <div className="flex-1 flex items-center justify-center p-4 relative">
                <img src={activeStory.image_url} className="w-full max-h-[75vh] rounded-[3rem] object-contain shadow-2xl" alt="" />
                {activeStory.poll_question && (
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/10">
                    <h3 className="text-white font-black text-center text-sm mb-6 uppercase tracking-wider leading-relaxed">{activeStory.poll_question}</h3>
                    <div className="space-y-4">
                       {activeStory.poll_options?.map((opt: string, idx: number) => {
                          const storyPollResponses = useFeatureStore.getState().storyPollResponses;
                          const filteredResponses = storyPollResponses.filter(r => r.story_id === activeStory.id);
                          const total = filteredResponses.length || 0;
                          const count = filteredResponses.filter(r => r.option_index === idx).length;
                          const perc = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <button key={idx} onClick={() => voteInStoryPoll(activeStory.id, session?.user.id || '', idx)} className="w-full p-5 rounded-2xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest relative overflow-hidden active:scale-95 transition border border-white/5">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${perc}%` }} className="absolute inset-0 bg-primary-500/40" />
                                <span className="relative z-10">{opt}</span>
                                <span className="absolute right-5 z-10 opacity-60 italic">{perc}%</span>
                            </button>
                          );
                       })}
                    </div>
                  </div>
                )}
             </div>
             <div className="p-12 flex justify-center gap-8">
               {['❤️', '🔥', '😂', '🙌'].map(e => <button key={e} onClick={() => { reactToStory(activeStory.id, activeStory.user_id, session?.user.id || '', e); setActiveStory(null); }} className="text-4xl hover:scale-125 hover:rotate-6 transition active:scale-90">{e}</button>)}
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* ➕ CREATE STORY MODAL */}
      <AnimatePresence>
        {showCreateStory && (
           <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-[220] bg-black p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8 text-white">
                 <h2 className="text-2xl font-black italic tracking-tighter uppercase">Share Vibe</h2>
                 <button onClick={() => setShowCreateStory(false)} className="p-3 bg-white/10 rounded-2xl"><X size={24} /></button>
              </div>
              <div className="flex-1 relative rounded-[3.5rem] overflow-hidden bg-gray-900 border border-white/10 shadow-inner">
                 {storyPreview && <img src={storyPreview} className="w-full h-full object-cover" alt="" />}
                 {isPollStory && (
                   <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10">
                      <input placeholder="Ask Something..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} className="w-full bg-transparent text-white text-center font-black text-xl mb-6 border-none outline-none italic tracking-tighter" />
                      {pollOptions.map((o, i) => <input key={i} value={o} onChange={e => { const no = [...pollOptions]; no[i] = e.target.value; setPollOptions(no); }} className="w-full bg-white/10 p-5 rounded-2xl text-white text-center text-[10px] font-black uppercase mb-3 outline-none border border-white/5 focus:border-primary-500 transition" />)}
                   </div>
                 )}
              </div>
              <div className="py-8 space-y-4">
                 <button onClick={() => setIsPollStory(!isPollStory)} className={`w-full py-6 rounded-[2.3rem] border transition-all font-black text-[11px] uppercase tracking-widest ${isPollStory ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                    {isPollStory ? '✓ Poll Active' : '+ Add Question'}
                 </button>
                 <button onClick={handleCreateStory} disabled={uploading} className="w-full py-6 bg-primary-500 text-white rounded-[2.3rem] font-black text-xs uppercase tracking-[0.4em] shadow-3xl shadow-primary-500/50 active:scale-95 transition-all">
                   {uploading ? 'Processing...' : 'Blast to Campus'}
                 </button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 🔔 NOTIFICATIONS MODAL */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[230] bg-black/95 backdrop-blur-3xl p-6">
             <div className="flex items-center justify-between mb-8 text-white">
                <div className="flex items-center gap-3">
                   <Bell size={24} className="text-primary-500" />
                   <h2 className="text-2xl font-black italic tracking-tighter uppercase font-black uppercase">Activity</h2>
                </div>
                <button onClick={() => setShowNotifications(false)} className="p-3 bg-white/10 rounded-2xl"><X size={20} /></button>
             </div>
             
             <div className="space-y-4 overflow-y-auto max-h-[70vh] hide-scrollbar pb-10">
                {notifications.length === 0 ? (
                  <div className="text-center py-24 opacity-20 font-black text-[10px] uppercase tracking-widest leading-loose">No Recent <br/> Vibrations</div>
                ) : notifications.map(n => (
                  <div key={n.id} className={`p-5 rounded-[2.5rem] border ${n.is_read ? 'bg-white/5 border-white/5 opacity-50' : 'bg-primary-500/10 border-primary-500/20'}`}>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-800 flex-shrink-0 border border-white/5 overflow-hidden">
                           {n.users?.avatar_url && <img src={n.users.avatar_url} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1">
                           <p className="text-[11px] font-black uppercase text-white tracking-tight">{n.users?.name || 'Someone'}</p>
                           <p className="text-[10px] text-white/60 font-medium leading-relaxed">{n.content || `Interacted with your ${n.type}`}</p>
                        </div>
                        <p className="text-[8px] font-black opacity-20 uppercase whitespace-nowrap">{new Date(n.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                     </div>
                  </div>
                ))}
             </div>

             <div className="fixed bottom-12 left-6 right-6 flex gap-4">
                <button onClick={() => { if(session) clearNotifications(session.user.id); }} className="flex-1 py-6 rounded-[2.3rem] bg-red-500/20 text-red-500 font-black text-[9px] uppercase tracking-[0.2em] border border-red-500/10">Wipe Clear</button>
                <button onClick={() => setShowNotifications(false)} className="flex-1 py-6 rounded-[2.3rem] bg-white text-black font-black text-[9px] uppercase tracking-[0.2em]">Close</button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 COMMENTS MODAL */}
      <AnimatePresence>
         {activeCommentsPost && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-xl flex items-end">
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                className={`w-full max-h-[80vh] flex flex-col rounded-t-[3.5rem] ${isDarkMode ? 'bg-gray-900 border-t border-gray-800' : 'bg-white border-t border-gray-100'}`}
              >
                 <div className="flex items-center justify-between p-8 border-b border-gray-500/10">
                    <div className="flex flex-col">
                       <h3 className="font-black uppercase italic tracking-widest text-[10px] opacity-40">Post Vibrations</h3>
                       <p className="text-[9px] font-black text-primary-500 uppercase">{activeCommentsPost.comment_count || 0} Comments</p>
                    </div>
                    <button onClick={() => setActiveCommentsPost(null)} className="p-3 bg-gray-500/10 rounded-2xl"><X size={20} /></button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {(activeCommentsPost.comment_count === 0 && activeComments.length === 0) && <p className="text-center py-12 opacity-30 font-black text-[10px] uppercase tracking-[0.2em]">No Vibes Yet. <br/>Be the first!</p>}
                    {activeComments.map((c: any) => (
                       <div key={c.id} className="flex gap-4">
                          <img src={c.users?.avatar_url || ''} className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                          <div className="flex-1 bg-gray-500/5 p-4 rounded-2xl">
                             <div className="flex justify-between items-center mb-1">
                                <p className="font-black text-xs">{c.users?.name || 'Student'}</p>
                                <span className="text-[8px] opacity-40 uppercase tracking-widest">{new Date(c.created_at).toLocaleDateString()}</span>
                             </div>
                             <p className="text-sm opacity-80">{c.content}</p>
                          </div>
                       </div>
                    ))}
                 </div>

                 <div className="p-8 pb-12 border-t border-gray-500/10 flex gap-4 items-center">
                    <input 
                       value={commentText} 
                       onChange={e => setCommentText(e.target.value)} 
                       placeholder="Drop your vibe..." 
                       className={`flex-1 p-5 rounded-2xl outline-none font-bold text-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200 border'}`} 
                    />
                    <button 
                       onClick={handleAddComment} 
                       disabled={!commentText.trim()}
                       className="w-16 h-16 bg-primary-500 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-500/30 active:scale-90 transition disabled:opacity-50"
                    >
                       <Send size={24} />
                    </button>
                 </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
