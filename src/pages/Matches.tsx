import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

export default function Matches() {
  const [matches, setMatches] = useState<any[]>([]);
  const { session } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    if (!session) return;
    
    // Fetch matches where user is user1 or user2
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        id,
        user1:users!user1_id(id, name, avatar_url),
        user2:users!user2_id(id, name, avatar_url)
      `)
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);
      
    if (matchesData) {
      const formattedMatches = matchesData.map((m: any) => {
        const u1 = m.user1 as any;
        const u2 = m.user2 as any;
        const isUser1 = u1.id === session.user.id;
        const matchedUser = isUser1 ? u2 : u1;
        return {
          id: m.id,
          matchedUser
        };
      });
      setMatches(formattedMatches);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-4 pb-24 px-4 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Your Matches</h1>
      
      {matches.length === 0 ? (
        <div className="text-center mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500">No matches yet. Keep discovering to find new people!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {matches.map((match) => (
            <div 
              key={match.id}
              onClick={() => navigate(`/chat/${match.id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition group"
            >
              {match.matchedUser.avatar_url ? (
                <img 
                  src={match.matchedUser.avatar_url} 
                  alt={match.matchedUser.name}
                  className="w-full h-40 object-cover group-hover:scale-105 transition duration-300"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 font-bold text-2xl">
                  {match.matchedUser.name.charAt(0)}
                </div>
              )}
              <div className="p-3 text-center bg-white relative z-10">
                <h3 className="font-semibold text-gray-900 truncate">{match.matchedUser.name}</h3>
                <button className="mt-2 text-primary-600 text-sm font-medium hover:underline">Message</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
