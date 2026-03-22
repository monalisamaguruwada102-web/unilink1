import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// POST /api/matches/like
router.post('/like', requireAuth, async (req: Request, res: Response) => {
  const likerId = req.userId!;
  const { likedId } = req.body;

  if (!likedId) {
    return res.status(400).json({ error: 'likedId is required' });
  }

  try {
    // 1. Insert the like into the database
    // Ignore conflict if they already liked them
    const { error: likeError } = await supabaseAdmin
      .from('likes')
      .upsert({ liker_id: likerId, liked_id: likedId })
      .select();

    if (likeError) {
      console.error(likeError);
      return res.status(500).json({ error: 'Failed to record like' });
    }

    // 2. Check if there is a mutual match (did they already like the current user back?)
    const { data: mutualLike } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('liker_id', likedId)
      .eq('liked_id', likerId)
      .single();

    if (mutualLike) {
      // It's a match! Create a match record holding both IDs
      const { data: newMatch, error: matchError } = await supabaseAdmin
        .from('matches')
        .insert({
          user1_id: likerId,
          user2_id: likedId
        })
        .select()
        .single();
        
      if (matchError && matchError.code !== '23505') { // Ignore unique constraint if existing match
        console.error(matchError);
        return res.status(500).json({ error: 'Failed to create mutual match' });
      }

      // Instead of relying purely on frontend, returning { match: true } lets the UI trigger celebration
      return res.json({ match: true, message: "It's a Match!", matchDetails: newMatch });
    }

    res.json({ match: false, message: 'Like recorded successfully.' });
  } catch (err: any) {
    console.error('Like API Error:', err.message);
    res.status(500).json({ error: 'Internal server error while processing swipe' });
  }
});

export default router;
