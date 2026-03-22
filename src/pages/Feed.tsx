import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { Heart, MessageCircle, Image, Send, X, Plus, Lock, MoreHorizontal, ChevronLeft, ChevronRight, Hash, ShieldAlert } from 'lucide-react';

export default function Feed() {
  const [confessionText, setConfessionText] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showConfession, setShowConfession] = useState(false);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const { session, profile } = useAuthStore();
  const { 
    stories, posts, isDarkMode, confessions, 
    submitConfession, addStory, fetchFeatures, 
    likePost, addComment, fetchComments, viewStory, reactToStory 
  } = useFeatureStore();

  useEffect(() => {
    fetchFeatures();
  }, []);

  useEffect(() => {
    if (activeCommentsPost) {
       loadComments(activeCommentsPost.id);
    }
  }, [activeCommentsPost]);

  const loadComments = async (postId: string) => {
    setCommentsLoading(true);
    const data = await fetchComments(postId);
    setComments(data);
    setCommentsLoading(false);
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
    let imageUrl = '';

    if (postImage) {
      const ext = postImage.name.split('.').pop();
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('post-images').upload(path, postImage, { upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('posts').insert({
      user_id: session.user.id,
      content: postCaption,
      image_url: imageUrl || null,
    });

    if (!error) {
      setPostCaption('');
      setPostImage(null);
      setPostImagePreview('');
      setShowCreatePost(false);
    }
    setUploading(false);
  };

  const handleAddStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!session || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const path = `${session.user.id}/story_${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('post-images').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
      await addStory(session.user.id, profile?.name || 'You', urlData.publicUrl);
    }
  };

  const handleAddComment = async () => {
    if (!session || !commentText.trim() || !activeCommentsPost) return;
    await addComment(activeCommentsPost.id, session.user.id, commentText);
    setCommentText('');
    loadComments(activeCommentsPost.id);
  };

  return (
    <div className={`min-h-screen overflow-y-auto pb-36 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Bar */}
      <div className={`sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b backdrop-blur-xl ${isDarkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-100'}`}>
        <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary-500 to-indigo-500 bg-clip-text text-transparent">Kwekwe Poly</span>
        <button
          onClick={() => setShowCreatePost(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-lg shadow-primary-500/30"
        >
          <Plus size={14} strokeWidth={3} /> Post
        </button>
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
          <input type="file" accept="image/*" className="hidden" onChange={handleAddStory} />
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

      {/* Confession CTA Banner */}
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

      {/* Confessions Horizontal Scroll */}
      {confessions.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 px-1 flex items-center gap-2">
            <Hash size={14} className="text-pink-500" /> Latest Secrets
          </p>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {confessions.slice(0, 8).map((c, i) => (
              <div key={c.id || i} className={`flex-shrink-0 w-72 p-5 rounded-[2rem] border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <p className="text-sm italic font-medium opacity-80 leading-relaxed line-clamp-3">"{c.content}"</p>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">
                    {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </p>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 opacity-20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 opacity-40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 opacity-60" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Feed Posts */}
      <div className="space-y-4 px-4 pb-10">
        {posts.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <Image size={48} className="mx-auto mb-4" />
            <p className="font-black text-sm uppercase tracking-widest">Scanning Campus...</p>
          </div>
        )}
        <AnimatePresence>
          {posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-[2.5rem] overflow-hidden border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
            >
              {/* Post Header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-primary-500/20">
                    {post.users?.avatar_url
                      ? <img src={post.users.avatar_url} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full bg-primary-100 flex items-center justify-center font-black text-primary-600">{post.users?.name?.[0]}</div>
                    }
                  </div>
                  <div>
                    <p className="font-black text-sm mb-0.5">{post.users?.name || 'Poly Student'}</p>
                    <p className="text-[10px] opacity-40 font-bold uppercase tracking-tight">{post.users?.course || 'Campus Resident'}</p>
                  </div>
                </div>
                <button className={`p-3 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}><MoreHorizontal size={18} /></button>
              </div>

              {/* Post Image */}
              {post.image_url && (
                <div className="px-3">
                   <div className="w-full aspect-square rounded-[2rem] overflow-hidden bg-gray-100 dark:bg-gray-800">
                     <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                   </div>
                </div>
              )}

              {/* Content & Caption */}
              <div className="p-5">
                {post.content && (
                   <p className="text-sm leading-relaxed mb-5 px-1 truncate-3">
                     <span className="font-black mr-2 uppercase text-xs text-primary-500">{post.users?.name}</span>
                     <span className="opacity-80 font-medium">{post.content}</span>
                   </p>
                )}

                {/* Actions & Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => likePost(post.id)} 
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white transition group"
                    >
                      <Heart size={18} fill={(post.likes > 0) ? "currentColor" : "none"} />
                      <span className="text-xs font-black">{post.likes || 0}</span>
                    </button>
                    <button 
                      onClick={() => setActiveCommentsPost(post)}
                      className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}
                    >
                      <MessageCircle size={18} />
                      <span className="text-xs font-black">{post.comment_count || 0}</span>
                    </button>
                  </div>
                  <button className={`p-3 rounded-2xl ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                    <Send size={18} className="-rotate-12" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 🎬 STORY VIEWER MODAL */}
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
                     transition={{ duration: 5 }} 
                     onAnimationComplete={() => setActiveStory(null)}
                     className="h-full bg-white" 
                   />
                </div>
             </div>

             {/* Story Header */}
             <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-white/50">
                      <img src={activeStory.users?.avatar_url || activeStory.image_url} className="w-full h-full object-cover" alt="" />
                   </div>
                   <div>
                      <p className="font-black text-sm uppercase tracking-tighter">{activeStory.user_name}</p>
                      <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">Story • {new Date(activeStory.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
                <button onClick={() => setActiveStory(null)} className="p-2">
                   <X size={24} />
                </button>
             </div>

             {/* Image */}
             <div className="flex-1 flex items-center justify-center p-2">
                <img src={activeStory.image_url} className="w-full h-auto max-h-[80vh] rounded-[3rem] object-contain shadow-2xl" alt="" />
             </div>

             {/* Story Footer / Interaction */}
             <div className="p-8 flex items-center gap-4 bg-gradient-to-t from-black via-black/50 to-transparent">
                <div className="flex-1 px-5 py-4 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md">
                   <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Send a reaction</p>
                </div>
                <div className="flex gap-2">
                   {['❤️', '🔥', '😂', '🙌'].map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => { reactToStory(activeStory.id, session?.user.id || '', emoji); setActiveStory(null); }}
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

      {/* 💬 COMMENT MODAL */}
      <AnimatePresence>
        {activeCommentsPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={e => e.target === e.currentTarget && setActiveCommentsPost(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className={`w-full max-h-[85vh] rounded-t-[3rem] flex flex-col p-6 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tighter">Comments</h2>
                <button onClick={() => setActiveCommentsPost(null)} className={`p-3 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <X size={20} />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2">
                {commentsLoading ? (
                  <div className="flex flex-col items-center py-10 opacity-40">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Loading Conversation...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-10 opacity-30">
                    <MessageCircle size={40} className="mx-auto mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest">No comments yet. Start the buzz!</p>
                  </div>
                ) : (
                  comments.map((c, idx) => (
                    <motion.div 
                      key={c.id} 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: idx * 0.05 }}
                      className="flex gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-primary-100">
                        {c.users?.avatar_url ? <img src={c.users.avatar_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black text-primary-600">{c.users?.name?.[0]}</div>}
                      </div>
                      <div className="flex-1">
                        <div className={`p-4 rounded-2xl rounded-tl-none ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50 border border-gray-100'}`}>
                           <p className="font-black text-xs text-primary-500 mb-1 uppercase">{c.users?.name}</p>
                           <p className="text-sm font-medium opacity-80 leading-relaxed">{c.content}</p>
                        </div>
                        <p className="text-[9px] font-bold opacity-30 mt-2 uppercase tracking-widest">{new Date(c.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="relative">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className={`w-full pl-6 pr-16 py-5 rounded-3xl text-sm font-medium outline-none border focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'}`}
                />
                <button 
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="absolute right-3 top-2 bottom-2 w-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ➕ CREATE POST MODAL */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end"
            onClick={e => e.target === e.currentTarget && setShowCreatePost(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className={`w-full rounded-t-[3rem] p-8 space-y-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">New Post</h2>
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1">Share with the Poly Community</p>
                </div>
                <button onClick={() => setShowCreatePost(false)} className={`p-3 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <X size={20} />
                </button>
              </div>

              {/* Image Preview */}
              {postImagePreview && (
                <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden shadow-2xl">
                  <img src={postImagePreview} className="w-full h-full object-cover" alt="Preview" />
                  <button
                    onClick={() => { setPostImage(null); setPostImagePreview(''); }}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-md"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              <textarea
                value={postCaption}
                onChange={e => setPostCaption(e.target.value)}
                placeholder="What's happening on campus? 📢"
                rows={3}
                className={`w-full px-6 py-5 rounded-3xl text-sm font-medium resize-none outline-none border focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              />

              <div className="flex gap-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-3xl border font-black text-[11px] uppercase tracking-widest transition ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                >
                  <Image size={20} /> Add Photo
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={uploading || (!postCaption.trim() && !postImage)}
                  className="flex-1 py-5 bg-primary-500 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-primary-500/30 transition-transform active:scale-95"
                >
                  {uploading ? 'Posting...' : 'Share Post'}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🤫 CONFESSION MODAL */}
      <AnimatePresence>
        {showConfession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end"
            onClick={e => e.target === e.currentTarget && setShowConfession(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className={`w-full rounded-t-[3rem] p-8 space-y-6 ${isDarkMode ? 'bg-gray-900 border-t border-pink-500/20' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-pink-500">Campus Secret</h2>
                  <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1">100% Anonymous confession</p>
                </div>
                <button onClick={() => setShowConfession(false)} className={`p-3 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 bg-pink-500/5 rounded-2xl border border-pink-500/10 flex items-start gap-4">
                 <ShieldAlert size={18} className="text-pink-500 mt-1" />
                 <p className="text-[10px] text-pink-500/80 font-bold leading-relaxed uppercase tracking-tight">Your Identity is shielded. No User ID is stored with this post. Stay safe and respectful.</p>
              </div>
              <textarea
                value={confessionText}
                onChange={e => setConfessionText(e.target.value)}
                placeholder="Share your campus secret, crush, or funny story..."
                rows={4}
                className={`w-full px-6 py-5 rounded-3xl text-sm font-medium resize-none outline-none border focus:ring-2 ring-pink-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              />
              <button
                onClick={() => { if(confessionText.trim()) { submitConfession(confessionText, []); setConfessionText(''); setShowConfession(false); } }}
                className="w-full py-5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-pink-500/30 transition-transform active:scale-95"
              >
                Post Anonymously
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
