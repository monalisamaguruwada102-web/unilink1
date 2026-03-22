import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// GET /api/users/discover
// Fetch potential matches while hiding users we've already interacted with
router.get('/discover', requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    const isStudyMode = req.query.studyMode === 'true';

    // 1. Get IDs of users we've already liked or matched with
    const { data: swipedData } = await supabaseAdmin
      .from('likes')
      .select('liked_id')
      .eq('liker_id', userId);

    const swipedIds = swipedData?.map((d: any) => d.liked_id) || [];
    swipedIds.push(userId); // Don't show ourselves

    // 2. Build secure server-side query
    let query = supabaseAdmin
      .from('users')
      .select('id, name, age, college, course, bio, avatar_url, vibe_labels, mood_emoji, mood_text')
      .limit(30);

    // Filter out swiped users natively if the list isn't empty
    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.join(',')})`);
    }

    if (isStudyMode) {
      query = query.not('course', 'is', null);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    console.error('Discover API Error:', err.message);
    res.status(500).json({ error: 'Failed to load discover feed' });
  }
});

// POST /api/users/profile
// Securely update user profile details validation
router.post('/profile', requireAuth, async (req: Request, res: Response) => {
  const userId = req.userId!;
  try {
    // Only allow specific fields to be updated securely
    const { name, age, college, course, bio, avatar_url } = req.body;
    
    const updates = { 
      name, 
      age, 
      college, 
      course, 
      bio, 
      avatar_url,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
