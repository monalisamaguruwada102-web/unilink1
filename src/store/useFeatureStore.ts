import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface Story {
  id: string;
  user_id: string;
  user_name: string;
  image_url: string;
  is_viewed: boolean;
  expires_at: string;
  poll_question?: string;
  poll_options?: string[];
  poll_results?: number[];
  is_verified?: boolean;
}

interface PollOption {
  label: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  creator_id?: string;
}

interface CourseGroup {
  id: string;
  name: string;
  course: string;
  description: string;
  created_by: string;
  created_at: string;
  member_count?: number;
  users?: { name: string; avatar_url: string };
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string;
  likes: number;
  created_at: string;
  users?: { name: string; avatar_url: string; course: string; is_verified?: boolean };
  comment_count?: number;
  is_liked?: boolean;
}

interface PostLike {
  post_id: string;
  user_id: string;
}

interface Confession {
  id: string;
  content: string;
  tags: string[];
  likes: number;
  comment_count: number;
  created_at: string;
}

interface StoryPollResponse {
  story_id: string;
  user_id: string;
  option_index: number;
}

interface FeatureState {
  isDarkMode: boolean;
  isIncognito: boolean;
  isLurkMode: boolean;
  isStudyMode: boolean;
  isBoosted: boolean;
  boostEndTime: number | null;
  isSoundEnabled: boolean;
  
  stories: Story[];
  posts: Post[];
  currentPoll: Poll | null;
  courseGroups: CourseGroup[];
  confessions: Confession[];
  notifications: any[];
  postLikes: PostLike[];
  crushList: string[];
  storyPollResponses: StoryPollResponse[];
  onlineCount: number;

  toggleDarkMode: () => void;
  setIncognito: (val: boolean) => void;
  setLurkMode: (val: boolean) => void;
  setStudyMode: (val: boolean) => void;
  setSoundEnabled: (val: boolean) => void;
  triggerBoost: () => void;
  
  // Actions
  voteInPoll: (optionIndex: number) => Promise<void>;
  submitConfession: (content: string, tags: string[]) => Promise<void>;
  reactToConfession: (confessionId: string, userId: string) => Promise<void>;
  fetchConfessionComments: (confessionId: string) => Promise<any[]>;
  addConfessionComment: (confessionId: string, userId: string, content: string) => Promise<void>;
  addStory: (userId: string, userName: string, imageUrl: string) => Promise<void>;
  viewStory: (storyId: string, userId: string) => Promise<void>;
  reactToStory: (storyId: string, ownerId: string, userId: string, emoji: string) => Promise<void>;
  
  addPost: (post: any) => void;
  likePost: (postId: string, postOwnerId: string, likerId: string) => Promise<void>;
  unlikePost: (postId: string, likerId: string) => Promise<void>;
  fetchComments: (postId: string) => Promise<any[]>;
  addComment: (postId: string, userId: string, postOwnerId: string, content: string) => Promise<void>;
  
  createGroup: (name: string, course: string, description: string) => Promise<CourseGroup | null>;

  fetchFeatures: () => Promise<void>;
  updateUserProfile: (userId: string, updates: any) => Promise<void>;
  markNotificationsRead: (userId: string) => Promise<void>;
  clearNotifications: (userId: string) => Promise<void>;
  joinGroup: (groupId: string, userId: string) => Promise<void>;

  addToCrushList: (userId: string, crushId: string) => Promise<boolean>; 
  voteInStoryPoll: (storyId: string, userId: string, optionIndex: number) => Promise<void>;
  submitStoryWithPoll: (userId: string, userName: string, imageUrl: string, question: string, options: string[]) => Promise<void>;
  createPoll: (question: string, options: any[], creatorId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  createPost: (userId: string, content: string, imageUrl?: string) => Promise<void>;
  updatePresence: (userId: string) => Promise<void>;
}

export const useFeatureStore = create<FeatureState>()(
  persist(
    (set, get) => ({
  isDarkMode: true,
  isIncognito: false,
  isLurkMode: false,
  isStudyMode: false,
  isBoosted: false,
  boostEndTime: null,
  isSoundEnabled: true,
  
  stories: [],
  posts: [],
  currentPoll: null,
  courseGroups: [],
  confessions: [],
  notifications: [],
  postLikes: [],
  crushList: [],
  storyPollResponses: [],
  onlineCount: 0,

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setIncognito: (val) => set({ isIncognito: val }),
  setLurkMode: (val) => set({ isLurkMode: val }),
  setStudyMode: (val) => set({ isStudyMode: val }),
  setSoundEnabled: (val) => set({ isSoundEnabled: val }),
  
  triggerBoost: () => {
    const endTime = Date.now() + 60 * 60 * 1000;
    set({ isBoosted: true, boostEndTime: endTime });
    setTimeout(() => set({ isBoosted: false, boostEndTime: null }), 60 * 60 * 1000);
  },

  // ── POLL VOTING (PERSISTED TO DB + NOTIFICATIONS) ───────────────────
  voteInPoll: async (optionIndex) => {
    const poll = get().currentPoll;
    if (!poll) return;
    const updatedOptions = [...poll.options];
    updatedOptions[optionIndex].votes += 1;
    set({ currentPoll: { ...poll, options: updatedOptions } });

    // Persist to database
    await supabase.from('campus_polls')
      .update({ options: updatedOptions })
      .eq('id', poll.id);

    // Notify poll creator
    const myId = (await supabase.auth.getSession()).data.session?.user.id;
    if (poll.creator_id && poll.creator_id !== myId && myId) {
      await supabase.from('notifications').insert({
        user_id: poll.creator_id,
        sender_id: myId,
        type: 'poll_vote',
        content: `voted on your poll: "${poll.question}"`
      });
    }
  },

  // ── CONFESSIONS ─────────────────────────────────────────────────────
  submitConfession: async (content, tags) => {
    const { data } = await supabase.from('confessions').insert({ content, tags }).select().single();
    if (data) set((state) => ({ confessions: [{ ...data, likes: 0, comment_count: 0 }, ...state.confessions] }));
  },

  reactToConfession: async (confessionId, userId) => {
    // Toggle reaction (upsert, or delete if already exists)
    const { data: existing } = await supabase
      .from('confession_reactions')
      .select('id')
      .eq('confession_id', confessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('confession_reactions').delete().eq('id', existing.id);
      // Update local count optimistically
      const newLikes = Math.max(0, (get().confessions.find(c => c.id === confessionId)?.likes || 1) - 1);
      set(state => ({
        confessions: state.confessions.map(c =>
          c.id === confessionId ? { ...c, likes: newLikes } : c
        )
      }));
      // Count update is now handled by DB trigger tr_sync_confession_likes
    } else {
      await supabase.from('confession_reactions').insert({ confession_id: confessionId, user_id: userId, emoji: '❤️' });
      const newLikes = (get().confessions.find(c => c.id === confessionId)?.likes || 0) + 1;
      set(state => ({
        confessions: state.confessions.map(c =>
          c.id === confessionId ? { ...c, likes: newLikes } : c
        )
      }));
      // Count update is now handled by DB trigger tr_sync_confession_likes
    }
  },

  fetchConfessionComments: async (confessionId) => {
    const { data } = await supabase
      .from('confession_comments')
      .select('*, users(name, avatar_url)')
      .eq('confession_id', confessionId)
      .order('created_at', { ascending: true });
    return data || [];
  },

  addConfessionComment: async (confessionId, userId, content) => {
    await supabase.from('confession_comments').insert({ confession_id: confessionId, user_id: userId, content });
    const newCount = (get().confessions.find(c => c.id === confessionId)?.comment_count || 0) + 1;
    set(state => ({
      confessions: state.confessions.map(c =>
        c.id === confessionId ? { ...c, comment_count: newCount } : c
      )
    }));
    // Persist count to confessions table
    await supabase.from('confessions').update({ comment_count: newCount }).eq('id', confessionId);
  },

  // ── STORIES ─────────────────────────────────────────────────────────
  addStory: async (userId, userName, imageUrl) => {
    const { data } = await supabase.from('stories').insert({ user_id: userId, image_url: imageUrl }).select().single();
    if (data) {
      set((state) => ({
        stories: [{ ...data, user_name: userName, is_viewed: false }, ...state.stories]
      }));
    }
  },

  viewStory: async (storyId, userId) => {
    await supabase.from('story_views').upsert({ story_id: storyId, user_id: userId });
    set(state => ({
      stories: state.stories.map(s => s.id === storyId ? { ...s, is_viewed: true } : s)
    }));
  },

  deletePost: async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    set(state => ({ posts: state.posts.filter(p => p.id !== postId) }));
  },

  createPost: async (userId, content, imageUrl) => {
    const insertData: any = { user_id: userId, content };
    if (imageUrl) insertData.image_url = imageUrl;
    
    const { data, error } = await supabase.from('posts').insert(insertData).select('*, users(name, avatar_url, course)').single();
    if (error) throw error;
    if (data) set(state => ({ posts: [{ ...data, comment_count: 0, is_liked: false }, ...state.posts] }));
  },

  reactToStory: async (storyId, ownerId, userId, emoji) => {
    await supabase.from('story_reactions').insert({ story_id: storyId, user_id: userId, emoji });
    if (ownerId !== userId) {
      await supabase.from('notifications').insert({
        user_id: ownerId,
        sender_id: userId,
        type: 'reaction',
        content: `reacted to your story with ${emoji}`
      });
    }
  },

  joinGroup: async (groupId, userId) => {
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId });
    if (!error) {
       set(state => ({
         courseGroups: state.courseGroups.map(g => g.id === groupId ? { ...g, member_count: (g.member_count || 0) + 1 } : g)
       }));
    }
  },

  addToCrushList: async (userId, crushId) => {
    try {
      await supabase.from('crush_list').upsert({ user_id: userId, crush_id: crushId });
      set(state => ({ crushList: [...state.crushList, crushId] }));
      const { data: mutual } = await supabase.from('crush_list').select('id').eq('user_id', crushId).eq('crush_id', userId).maybeSingle();
      if (mutual) {
        await supabase.from('notifications').insert([
          { user_id: crushId, sender_id: userId, type: 'match', content: 'SECRET CRUSH REVEALED! ❤️' },
          { user_id: userId, sender_id: crushId, type: 'match', content: 'SECRET CRUSH REVEALED! ❤️' }
        ]);
        await supabase.from('matches').insert({ user1_id: userId, user2_id: crushId });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Crush list error:', err);
      return false;
    }
  },

  voteInStoryPoll: async (storyId, userId, optionIndex) => {
    try {
      await supabase.from('story_poll_responses').upsert({ story_id: storyId, user_id: userId, option_index: optionIndex });
      set(state => ({ storyPollResponses: [...state.storyPollResponses, { story_id: storyId, user_id: userId, option_index: optionIndex }] }));
    } catch (err) {
      console.error('Poll vote error:', err);
    }
  },

  createPoll: async (question, options, creatorId) => {
    const { data } = await supabase.from('campus_polls').insert({ creator_id: creatorId, question, options }).select().single();
    if (data) {
       set({ currentPoll: data });
    }
  },

  submitStoryWithPoll: async (userId: string, userName: string, imageUrl: string, question: string, options: string[]) => {
     const { data } = await supabase.from('stories').insert({ user_id: userId, image_url: imageUrl, poll_question: question, poll_options: options }).select().single();
     if (data) set((state) => ({ stories: [{ ...data, user_name: userName, is_viewed: false }, ...state.stories] }));
  },

  clearNotifications: async (userId: string) => {
    await supabase.from('notifications').delete().eq('user_id', userId);
    set({ notifications: [] });
  },

  markNotificationsRead: async (userId: string) => {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true }))
      }));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  },

  addPost: (post) => set(state => ({ posts: [post, ...state.posts] })),

  // ── LIKE / UNLIKE (WITH DB PERSIST + RPC FALLBACK) ──────────────────
  likePost: async (postId, postOwnerId, likerId) => {
    const alreadyLiked = get().postLikes.some(pl => pl.post_id === postId && pl.user_id === likerId);
    if (alreadyLiked) return;

    // Optimistic update
    set(state => ({
      postLikes: [...state.postLikes, { post_id: postId, user_id: likerId }],
      posts: state.posts.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1, is_liked: true } : p)
    }));

    try {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: likerId });
      if (error) throw error;

      if (postOwnerId !== likerId) {
         await supabase.from('notifications').insert({
           user_id: postOwnerId,
           sender_id: likerId,
           type: 'like',
           post_id: postId
         });
      }
    } catch (err) {
      // Rollback
      set(state => ({
        postLikes: state.postLikes.filter(pl => !(pl.post_id === postId && pl.user_id === likerId)),
        posts: state.posts.map(p => p.id === postId ? { ...p, likes: Math.max(0, (p.likes || 1) - 1), is_liked: false } : p)
      }));
      console.error('Like failed:', err);
    }
  },

  unlikePost: async (postId, likerId) => {
    set(state => ({
      postLikes: state.postLikes.filter(pl => !(pl.post_id === postId && pl.user_id === likerId)),
      posts: state.posts.map(p => p.id === postId ? { ...p, likes: Math.max(0, (p.likes || 1) - 1), is_liked: false } : p)
    }));

    try {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', likerId);
      if (error) throw error;
    } catch (err) {
      console.error('Unlike failed:', err);
    }
  },

  fetchComments: async (postId) => {
    const { data } = await supabase.from('post_comments').select('*, users(name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true });
    return data || [];
  },

  addComment: async (postId, userId, postOwnerId, content) => {
    await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, content });
    
    if (postOwnerId !== userId) {
       await supabase.from('notifications').insert({
         user_id: postOwnerId,
         sender_id: userId,
         type: 'comment',
         post_id: postId,
         content
       });
    }
  },

  createGroup: async (name, course, description) => {
    const myId = (await supabase.auth.getSession()).data.session?.user.id;
    if (!myId) return null;
    const { data } = await supabase.from('course_groups').insert({ name, course, description, creator_id: myId }).select().single();
    if (data) set(state => ({ courseGroups: [{ ...data, member_count: 1 }, ...state.courseGroups] }));
    return data || null;
  },

  // ── MAIN DATA FETCH ─────────────────────────────────────────────────
  fetchFeatures: async () => {
    const [
      groupsRes,
      confessionsRes,
      storiesRes,
      postsRes,
      likesRes,
      notificationsRes,
      crushRes,
      pollsRes,
      activeUsersRes,
      latestPollRes
    ] = await Promise.all([
      supabase.from('course_groups').select('*, users(name, avatar_url), group_members(count)').order('created_at', { ascending: false }).limit(100),
      supabase.from('confessions').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('stories')
        .select('*, users(id, name, avatar_url)')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('posts').select('*, users(name, avatar_url, course), post_comments(count)').order('created_at', { ascending: false }).limit(25),
      supabase.from('post_likes').select('post_id, user_id'),
      supabase.from('notifications').select('*, users:users!notifications_sender_id_fkey(name, avatar_url)').order('created_at', { ascending: false }).limit(20),
      supabase.from('crush_list').select('crush_id'),
      supabase.from('story_poll_responses').select('*'),
      supabase.from('users').select('*', { count: 'exact', head: true }).gt('location_updated_at', new Date(Date.now() - 60 * 60000).toISOString()),
      supabase.from('campus_polls').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
    ]);
    const myId = (await supabase.auth.getSession()).data.session?.user.id;

    if (groupsRes.data) set({ courseGroups: groupsRes.data.map((g: any) => ({ ...g, member_count: g.group_members?.[0]?.count || 0 })) });
    if (confessionsRes.data) set({ confessions: confessionsRes.data.map((c: any) => ({ ...c, likes: c.likes || 0, comment_count: c.comment_count || 0 })) });
    if (likesRes.data) set({ postLikes: likesRes.data });
    if (notificationsRes.data) set({ notifications: notificationsRes.data });
    if (crushRes.data) set({ crushList: crushRes.data.map((c: any) => c.crush_id) });
    if (pollsRes.data) set({ storyPollResponses: pollsRes.data });
    
    const activeUsersCount = activeUsersRes?.count || 0;
    set({ onlineCount: activeUsersCount });

    const latestPoll = latestPollRes?.data;
    if (latestPoll) {
       set({ currentPoll: latestPoll });
    } else {
       set({ currentPoll: null });
    }
    
    if (postsRes.error) {
      console.error('Failed to fetch posts:', postsRes.error);
    }
    
    if (postsRes.data) {
      set({ posts: postsRes.data.map((p: any) => ({
        ...p,
        comment_count: p.post_comments?.[0]?.count || 0,
        is_liked: likesRes.data?.some(pl => pl.post_id === p.id && pl.user_id === myId)
      }))});
    }

    if (storiesRes.data && storiesRes.data.length > 0) {
       set({ stories: storiesRes.data.map((s: any) => ({
          ...s,
          user_name: s.users?.name || 'Poly Student',
          is_viewed: false
       }))});
    } else {
       set({ stories: [] });
    }

    // ==========================================
    // REACTIVE REALTIME ENGINE SUBSCRIPTIONS
    // ==========================================
    const channel = supabase.channel('poly_social_network')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data: userData } = await supabase.from('users').select('name, avatar_url, course').eq('id', payload.new.user_id).single();
          set((state) => ({ 
            posts: state.posts.some(p => p.id === payload.new.id) 
              ? state.posts 
              : [{ ...payload.new, users: userData } as Post, ...state.posts] 
          }));
        } else if (payload.eventType === 'UPDATE') {
          set((state) => ({
            posts: state.posts.map(p => p.id === payload.new.id ? { ...p, ...payload.new, is_liked: p.is_liked } : p)
          }));
        } else if (payload.eventType === 'DELETE') {
          set((state) => ({ posts: state.posts.filter(p => p.id !== payload.old.id) }));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, async (payload) => {
        set(state => ({
          posts: state.posts.map(p => p.id === payload.new.post_id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p)
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, async (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const { data: userData } = await supabase.from('users').select('name').eq('id', payload.new.user_id).single();
          set((state) => ({ 
            stories: state.stories.some(s => s.id === payload.new.id)
              ? state.stories
              : [{ ...payload.new, user_name: userData?.name || 'New Student', is_viewed: false }, ...state.stories] 
          }));
        } else if (payload.eventType === 'DELETE') {
          set((state) => ({ stories: state.stories.filter(s => s.id !== payload.old.id) }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'confessions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          set((state) => ({ 
            confessions: state.confessions.some(c => c.id === payload.new.id) 
              ? state.confessions 
              : [{ ...(payload.new as Confession), likes: payload.new.likes || 0, comment_count: payload.new.comment_count || 0 }, ...state.confessions] 
          }));
        } else if (payload.eventType === 'UPDATE') {
          // Use nullish coalescing (??) because 0 is a valid count and would be ignored by ||
          set((state) => ({
            confessions: state.confessions.map(c => 
              c.id === payload.new.id ? { ...c, likes: payload.new.likes ?? c.likes, comment_count: payload.new.comment_count ?? c.comment_count } : c
            )
          }));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'course_groups' }, (payload: any) => {
        set((state) => ({ 
          courseGroups: state.courseGroups.some(i => i.id === payload.new.id)
            ? state.courseGroups
            : [{ ...payload.new, member_count: 1, users: { name: 'New Student', avatar_url: '' } } as CourseGroup, ...state.courseGroups] 
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          set((state) => ({
            courseGroups: state.courseGroups.map(g => g.id === payload.new.group_id ? { ...g, member_count: (g.member_count || 0) + 1 } : g)
          }));
        } else if (payload.eventType === 'DELETE') {
          set((state) => ({
            courseGroups: state.courseGroups.map(g => g.id === payload.old.group_id ? { ...g, member_count: Math.max(0, (g.member_count || 1) - 1) } : g)
          }));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        set((state) => ({ 
           notifications: [payload.new, ...state.notifications]
        }));
        
        // Audio Triggers
        import('../lib/audioManager').then(({ playSound }) => {
           if (payload.new.type === 'match') playSound('match');
           else playSound('notify');
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, async (payload: any) => {
        const myId = (await supabase.auth.getSession()).data.session?.user.id;
        if (payload.eventType === 'INSERT') {
          const isMe = payload.new.user_id === myId;
          set(state => ({
            postLikes: state.postLikes.some(pl => pl.post_id === payload.new.post_id && pl.user_id === payload.new.user_id) 
              ? state.postLikes 
              : [...state.postLikes, payload.new as PostLike],
            posts: state.posts.map(p => p.id === payload.new.post_id 
              ? { 
                  ...p, 
                  likes: state.postLikes.some(pl => pl.post_id === payload.new.post_id && pl.user_id === payload.new.user_id) ? p.likes : (p.likes || 0) + 1,
                  is_liked: isMe ? true : p.is_liked 
                } 
              : p
            )
          }));
        } else if (payload.eventType === 'DELETE') {
          const isMe = payload.old.user_id === myId;
          set(state => ({
            postLikes: state.postLikes.filter(pl => pl.post_id !== payload.old.post_id || pl.user_id !== payload.old.user_id),
            posts: state.posts.map(p => p.id === payload.old.post_id 
              ? { 
                  ...p, 
                  likes: Math.max(0, (p.likes || 1) - 1), 
                  is_liked: isMe ? false : p.is_liked 
                } 
              : p
            )
          }));
        }
      });
      
    channel.subscribe();
  },

  updateUserProfile: async (userId, updates) => {
     await supabase.from('users').update(updates).eq('id', userId);
  },

  updatePresence: async (userId) => {
    try {
      await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', userId);
    } catch (err) {
      console.error('Presence sync failed:', err);
    }
  }
    }),
    {
      name: 'campus-feature-store',
      partialize: (state) => ({
        courseGroups: state.courseGroups,
        isDarkMode: state.isDarkMode,
        isSoundEnabled: state.isSoundEnabled,
      }),
    }
  )
);
