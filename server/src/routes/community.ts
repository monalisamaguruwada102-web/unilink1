import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// Feed: Confessions
// POST /api/community/confessions
router.post('/confessions', requireAuth, async (req: Request, res: Response) => {
  const { content, tags } = req.body;
  
  if (!content) return res.status(400).json({ error: 'Content is required.' });

  try {
    const { data, error } = await supabaseAdmin
      .from('confessions')
      .insert({ content, tags: tags || [] })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Confessions API:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Feed: Polls Vote
// POST /api/community/polls/:id/vote
router.post('/polls/:id/vote', requireAuth, async (req: Request, res: Response) => {
  const pollId = req.params.id;
  const { optionIndex } = req.body; 

  try {
    // Note: To be fully secure against duplicate voting, we'd add a "poll_votes" tracking table.
    // For MVP server, incrementing the integer server-side using RPC or picking option is enough.
    
    // We will just fetch the option and increment it to avoid having to run RPCs.
    // This assumes `id` passed in body is actually the `poll_options` row ID, otherwise we 
    // fetch all options for pollId, find the one matching the index, and update.
    
    // Fetch options ordered by creation/ID
    const { data: options, error: optErr } = await supabaseAdmin
      .from('poll_options')
      .select('id, votes')
      .eq('poll_id', pollId)
      .order('id', { ascending: true });

    if (optErr || !options || options.length <= optionIndex) {
      return res.status(400).json({ error: 'Invalid poll option' });
    }

    const targetOption = options[optionIndex];

    const { data, error } = await supabaseAdmin
      .from('poll_options')
      .update({ votes: targetOption.votes + 1 })
      .eq('id', targetOption.id)
      .select()
      .single();

    if (error) throw error;
    
    res.json({ success: true, option: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal error voting on poll' });
  }
});

export default router;
