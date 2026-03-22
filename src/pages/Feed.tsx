import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { Heart, MessageCircle, Image, Send, X, Plus, Lock, MoreHorizontal } from 'lucide-react';

export default function Feed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [confessionText, setConfessionText] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showConfession, setShowConfession] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { session, profile } = useAuthStore();
  const { stories, isDarkMode, confessions, submitConfession, addStory } = useFeatureStore();

  useEffect(() => {
    fetchPosts();
    // Realtime for posts
    const channel = supabase.channel('posts_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.some(p => p.id === payload.new.id) ? prev : [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, users(name, avatar_url, course)')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setPosts(data);
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

    const { data } = await supabase.from('posts').insert({
      user_id: session.user.id,
      content: postCaption,
      image_url: imageUrl || null,
    }).select('*, users(name, avatar_url, course)').single();

    if (data) setPosts(prev => [data, ...prev]);
    setPostCaption('');
    setPostImage(null);
    setPostImagePreview('');
    setShowCreatePost(false);
    setUploading(false);
  };

  const handleLike = async (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
    await supabase.from('posts').update({ likes: posts.find(p => p.id === postId)?.likes + 1 || 1 }).eq('id', postId);
  };

  const handleSubmitConfession = async () => {
    if (!confessionText.trim()) return;
    await submitConfession(confessionText.trim(), []);
    setConfessionText('');
    setShowConfession(false);
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

  const bg = isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';

  return (
    <div className={`flex-1 overflow-y-auto pb-28 transition-colors duration-300 ${bg}`}>
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
          <div className={`w-16 h-16 rounded-2xl border-2 border-dashed flex items-center justify-center ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <Plus size={20} className="text-primary-500" strokeWidth={3} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Your Story</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleAddStory} />
        </label>
        {/* Existing Stories */}
        {stories.map(story => (
          <div key={story.id} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-950 overflow-hidden">
              <img src={story.image_url} alt={story.user_name} className="w-full h-full object-cover" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 max-w-[60px] truncate">{story.user_name}</span>
          </div>
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
            <p className="font-black text-sm text-pink-500">Share a Campus Secret 🤫</p>
            <p className="text-[10px] opacity-50 font-bold">100% anonymous — no traces</p>
          </div>
        </button>
      </div>

      {/* Confessions Horizontal Scroll */}
      {confessions.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 px-1">Campus Confessions</p>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {confessions.slice(0, 6).map((c, i) => (
              <div key={c.id || i} className="flex-shrink-0 w-72 p-5 rounded-2xl bg-gradient-to-br from-pink-950/30 to-purple-950/20 border border-pink-800/20">
                <p className="text-sm italic font-medium opacity-80 leading-relaxed">"{c.content}"</p>
                <p className="text-[9px] font-black opacity-30 mt-3 uppercase tracking-widest">
                  {c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Feed Posts */}
      <div className="space-y-1">
        {posts.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <Image size={48} className="mx-auto mb-4" />
            <p className="font-black text-sm uppercase tracking-widest">No posts yet. Be the first!</p>
          </div>
        )}
        <AnimatePresence>
          {posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}
            >
              {/* Post Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary-500/40">
                    {post.users?.avatar_url
                      ? <img src={post.users.avatar_url} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full bg-primary-100 flex items-center justify-center font-black text-primary-600">{post.users?.name?.[0]}</div>
                    }
                  </div>
                  <div>
                    <p className="font-black text-sm">{post.users?.name || 'Poly Student'}</p>
                    <p className="text-[10px] opacity-40 font-bold">{post.users?.course || 'Kwekwe Poly'}</p>
                  </div>
                </div>
                <button className="p-2 opacity-40"><MoreHorizontal size={20} /></button>
              </div>

              {/* Post Image */}
              {post.image_url && (
                <div className="w-full aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Actions */}
              <div className="px-4 py-3 flex items-center gap-5">
                <button onClick={() => handleLike(post.id)} className="flex items-center gap-1.5 group">
                  <Heart size={24} className="text-gray-400 group-hover:text-red-500 group-hover:scale-125 transition" />
                </button>
                <button className="flex items-center gap-1.5">
                  <MessageCircle size={24} className="text-gray-400" />
                </button>
                <button className="ml-auto">
                  <Send size={22} className="text-gray-400 -rotate-12" />
                </button>
              </div>

              {/* Likes & Caption */}
              <div className="px-4 pb-4">
                {(post.likes > 0) && (
                  <p className="font-black text-sm mb-1">{post.likes} {post.likes === 1 ? 'like' : 'likes'}</p>
                )}
                {post.content && (
                  <p className="text-sm">
                    <span className="font-black mr-2">{post.users?.name}</span>
                    <span className="opacity-80">{post.content}</span>
                  </p>
                )}
                <p className="text-[10px] opacity-30 font-bold mt-2 uppercase tracking-widest">
                  {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={e => e.target === e.currentTarget && setShowCreatePost(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className={`w-full rounded-t-[2rem] p-6 space-y-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">New Post</h2>
                <button onClick={() => setShowCreatePost(false)} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                  <X size={18} />
                </button>
              </div>

              {/* Image Preview */}
              {postImagePreview && (
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
                  <img src={postImagePreview} className="w-full h-full object-cover" alt="Preview" />
                  <button
                    onClick={() => { setPostImage(null); setPostImagePreview(''); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <textarea
                value={postCaption}
                onChange={e => setPostCaption(e.target.value)}
                placeholder="What's happening on campus? 📢"
                rows={3}
                className={`w-full px-4 py-3 rounded-2xl text-sm font-medium resize-none outline-none border focus:ring-2 ring-primary-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}
                >
                  <Image size={18} /> Add Photo
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={uploading || (!postCaption.trim() && !postImage)}
                  className="flex-1 py-4 bg-primary-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-primary-500/30"
                >
                  {uploading ? 'Posting...' : 'Share Post'}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confession Modal */}
      <AnimatePresence>
        {showConfession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={e => e.target === e.currentTarget && setShowConfession(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              className={`w-full rounded-t-[2rem] p-6 space-y-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black">Campus Confession 🤫</h2>
                  <p className="text-[10px] opacity-40 font-bold mt-0.5">Posted anonymously — no one will know it's you</p>
                </div>
                <button onClick={() => setShowConfession(false)} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                  <X size={18} />
                </button>
              </div>
              <textarea
                value={confessionText}
                onChange={e => setConfessionText(e.target.value)}
                placeholder="Share your campus secret, crush, or funny story here..."
                rows={4}
                className={`w-full px-4 py-3 rounded-2xl text-sm font-medium resize-none outline-none border focus:ring-2 ring-pink-500 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
              />
              <button
                onClick={handleSubmitConfession}
                disabled={!confessionText.trim()}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-pink-500/30"
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
