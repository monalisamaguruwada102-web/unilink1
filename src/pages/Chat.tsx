import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const [matchDetails, setMatchDetails] = useState<any>(null);
  const { session } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatchDetails();
  }, [matchId]);

  const fetchMatchDetails = async () => {
    if (!matchId || !session) return;
    const { data: m } = await supabase
      .from('matches')
      .select(`
        id,
        user1:users!user1_id(id, name, avatar_url),
        user2:users!user2_id(id, name, avatar_url)
      `)
      .eq('id', matchId)
      .single();

    if (m) {
      const u1 = m.user1 as any;
      const u2 = m.user2 as any;
      const isUser1 = u1.id === session.user.id;
      const otherUser = isUser1 ? u2 : u1;
      setMatchDetails({ id: m.id, otherUser });
    }
  };

  if (!matchDetails) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <ChatWindow
      matchId={matchId!}
      otherUser={matchDetails.otherUser}
      onBack={() => navigate('/matches')}
    />
  );
}
