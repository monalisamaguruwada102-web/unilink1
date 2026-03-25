import { create } from 'zustand';
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

interface Event {
  id: string;
  title: string;
  location: string;
  date: string;
  attendees: number;
  category: string;
}

interface PollOption {
  label: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
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
  referralPoints: number;
  badges: string[];
  mood: { emoji: string; text: string } | null;
  vibeLabels: string[];
  
  stories: Story[];
  posts: Post[];
  events: Event[];
  currentPoll: Poll | null;
  courseGroups: CourseGroup[];
  confessions: Confession[];
  notifications: any[];
  postLikes: PostLike[];
  crushList: string[]; // List of crush IDs
  storyPollResponses: StoryPollResponse[];

  toggleDarkMode: () => void;
  setIncognito: (val: boolean) => void;
  setLurkMode: (val: boolean) => void;
  setStudyMode: (val: boolean) => void;
  triggerBoost: () => void;
  setMood: (mood: { emoji: string; text: string }) => void;
  addVibeLabel: (label: string) => void;
  
  // Actions
  voteInPoll: (optionIndex: number) => Promise<void>;
  submitConfession: (content: string, tags: string[]) => Promise<void>;
  joinEvent: (eventId: string) => Promise<void>;
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
  deletePost: (postId: string) => Promise<void>;
  createPost: (userId: string, content: string, imageUrl?: string) => Promise<void>;
}

export const useFeatureStore = create<FeatureState>((set, get) => ({
  isDarkMode: true,
  isIncognito: false,
  isLurkMode: false,
  isStudyMode: false,
  isBoosted: false,
  boostEndTime: null,
  referralPoints: 120,
  badges: ['Early Adopter', 'Verified Student'],
  mood: { emoji: '📚', text: 'Stressed but blessed' },
  vibeLabels: ['Night Owl', 'Library Resident', 'Coffee Addict'],
  
  stories: [],
  posts: [],
  events: [],
  currentPoll: null,
  courseGroups: [],
  confessions: [],
  notifications: [],
  postLikes: [],
  crushList: [],
  storyPollResponses: [],

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  setIncognito: (val) => set({ isIncognito: val }),
  setLurkMode: (val) => set({ isLurkMode: val }),
  setStudyMode: (val) => set({ isStudyMode: val }),
  
  triggerBoost: () => {
    const endTime = Date.now() + 60 * 60 * 1000;
    set({ isBoosted: true, boostEndTime: endTime });
    setTimeout(() => set({ isBoosted: false, boostEndTime: null }), 60 * 60 * 1000);
  },

  setMood: (mood) => set({ mood }),
  addVibeLabel: (label) => set((state) => ({ vibeLabels: [...state.vibeLabels, label] })),
  
  voteInPoll: async (optionIndex) => {
    const poll = get().currentPoll;
    if (!poll) return;
    const updatedOptions = [...poll.options];
    updatedOptions[optionIndex].votes += 1;
    set({ currentPoll: { ...poll, options: updatedOptions } });
    // Production: update poll_options table
  },

  submitConfession: async (content, tags) => {
    const { data } = await supabase.from('confessions').insert({ content, tags }).select().single();
    if (data) set((state) => ({ confessions: [data, ...state.confessions] }));
  },

  joinEvent: async (eventId) => {
    // Increment attendees
    set((state) => ({
      events: state.events.map(e => e.id === eventId ? { ...e, attendees: e.attendees + 1 } : e)
    }));
  },

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

  likePost: async (postId, postOwnerId, likerId) => {
    // Check if already liked
    const alreadyLiked = get().postLikes.some(pl => pl.post_id === postId && pl.user_id === likerId);
    if (alreadyLiked) return;

    // Optimistically update
    set(state => ({
      postLikes: [...state.postLikes, { post_id: postId, user_id: likerId }],
      posts: state.posts.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + 1, is_liked: true } : p)
    }));

    try {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: likerId });
      if (error) throw error;
      
      // Notify owner
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
    // Optimistically remove
    set(state => ({
      postLikes: state.postLikes.filter(pl => !(pl.post_id === postId && pl.user_id === likerId)),
      posts: state.posts.map(p => p.id === postId ? { ...p, likes: Math.max(0, (p.likes || 1) - 1), is_liked: false } : p)
    }));

    try {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', likerId);
      if (error) throw error;
    } catch (err) {
      // Rollback not trivial here, but the trigger will sync it and periodic fetch will fix it
      console.error('Unlike failed:', err);
    }
  },

  fetchComments: async (postId) => {
    const { data } = await supabase.from('post_comments').select('*, users(name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true });
    return data || [];
  },

  addComment: async (postId, userId, postOwnerId, content) => {
    await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, content });
    
    // Notify owner
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

  fetchFeatures: async () => {
    const [
      groupsRes,
      confessionsRes,
      storiesRes,
      postsRes,
      likesRes,
      notificationsRes,
      crushRes,
      pollsRes
    ] = await Promise.all([
      supabase.from('course_groups').select('*, users(name, avatar_url)').order('created_at', { ascending: false }).limit(20),
      supabase.from('confessions').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('stories')
        .select('*, users(id, name, avatar_url)')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('posts').select('*, users(name, avatar_url, course), post_comments(count)').order('created_at', { ascending: false }).limit(25),
      supabase.from('post_likes').select('post_id, user_id'),
      supabase.from('notifications').select('*, users:users!notifications_sender_id_fkey(name, avatar_url)').order('created_at', { ascending: false }).limit(20),
      supabase.from('crush_list').select('crush_id'),
      supabase.from('story_poll_responses').select('*')
    ]);
    const myId = (await supabase.auth.getSession()).data.session?.user.id;

    if (groupsRes.data) set({ courseGroups: groupsRes.data.map((g: any) => ({ ...g, member_count: g.group_members?.[0]?.count || 0 })) });
    if (confessionsRes.data) set({ confessions: confessionsRes.data });
    if (likesRes.data) set({ postLikes: likesRes.data });
    if (notificationsRes.data) set({ notifications: notificationsRes.data });
    if (crushRes.data) set({ crushList: crushRes.data.map((c: any) => c.crush_id) });
    if (pollsRes.data) set({ storyPollResponses: pollsRes.data });
    
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
       set({ stories: [
         { id: '1', user_id: '1', user_name: 'Nyasha', image_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop', is_viewed: false, expires_at: '' },
         { id: '2', user_id: '2', user_name: 'Tinashe', image_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop', is_viewed: false, expires_at: '' }
       ]});
    }

    set({ currentPoll: {
       id: 'poll-1',
       question: 'Best meal at the canteen?',
       options: [
         { label: 'Sadza & Beef', votes: 120 },
         { label: 'Chips & Chicken', votes: 85 },
         { label: 'Beans & Cabbage', votes: 30 }
       ]
    }});

    // ==========================================
    // 🟠 REACTIVE REALTIME ENGINE SUBSCRIPTIONS
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
            posts: state.posts.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)
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
          set((state) => ({ stories: state.stories.filter(s => s.id === payload.old.id) }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'confessions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          set((state) => ({ 
            confessions: state.confessions.some(c => c.id === payload.new.id) 
              ? state.confessions 
              : [payload.new as Confession, ...state.confessions] 
          }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'course_groups' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          set((state) => ({ 
            courseGroups: state.courseGroups.some(i => i.id === payload.new.id)
              ? state.courseGroups
              : [{ ...payload.new, users: { name: 'Unknown', avatar_url: '' } } as CourseGroup, ...state.courseGroups] 
          }));
        } else if (payload.eventType === 'DELETE') {
          set((state) => ({ courseGroups: state.courseGroups.filter(i => i.id !== payload.old.id) }));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        set((state) => ({ 
           notifications: [payload.new, ...state.notifications]
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, async (payload) => {
        const myId = (await supabase.auth.getSession()).data.session?.user.id;
        if (payload.eventType === 'INSERT') {
          const isMe = payload.new.user_id === myId;
          set(state => ({
            postLikes: [...state.postLikes, payload.new as PostLike],
            posts: state.posts.map(p => p.id === payload.new.post_id 
              ? { ...p, likes: (p.likes || 0) + 1, is_liked: isMe ? true : p.is_liked } 
              : p
            )
          }));
        } else if (payload.eventType === 'DELETE') {
          const isMe = payload.old.user_id === myId;
          set(state => ({
            postLikes: state.postLikes.filter(pl => pl.post_id !== payload.old.post_id || pl.user_id !== payload.old.user_id),
            posts: state.posts.map(p => p.id === payload.old.post_id 
              ? { ...p, likes: Math.max(0, (p.likes || 1) - 1), is_liked: isMe ? false : p.is_liked } 
              : p
            )
          }));
        }
      });
      
    channel.subscribe();
  },

  updateUserProfile: async (userId, updates) => {
     await supabase.from('users').update(updates).eq('id', userId);
  }
}));
