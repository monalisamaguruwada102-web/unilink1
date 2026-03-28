import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Phone, PhoneOff, User } from 'lucide-react';
import { playLoop, stopLoop } from '../lib/audioManager';
import { useCallStore } from '../store/useCallStore';

export default function IncomingCallModal() {
  const { session } = useAuthStore();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [callerProfile, setCallerProfile] = useState<{name: string, avatar_url: string} | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Listen globally for ANY incoming call offer targeted at this user
    const channelName = `user_channel_${session.user.id}`;
    const channel = supabase.channel(channelName, { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'call_offer' }, async (msg: any) => {
        const { payload } = msg;
        if (payload && payload.to === session.user.id) {
          // Fetch caller details for banner
          const { data } = await supabase.from('users').select('name, avatar_url').eq('id', payload.from).single();
          setCallerProfile(data);
          setIncomingCall(payload);
          playLoop('ringtone');
        }
      })
      .on('broadcast', { event: 'call_end' }, (msg: any) => {
        const { payload } = msg;
        if (payload && (payload.to === session.user.id || payload.from === session.user.id)) {
          setIncomingCall(null);
          setCallerProfile(null);
          stopLoop();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('IncomingCallModal: Subscribed to globall call channel', channelName);
        }
      });

    return () => {
      stopLoop();
      supabase.removeChannel(channel);
    };
  }, [session]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 shadow-2xl backdrop-blur-xl transition-all p-6">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 w-full max-w-sm flex flex-col items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-300">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary-500 rounded-full animate-ping opacity-40"></div>
          {callerProfile?.avatar_url ? (
             <img src={callerProfile.avatar_url} className="w-24 h-24 rounded-full ring-4 ring-white shadow-2xl object-cover relative z-10" />
          ) : (
             <div className="w-24 h-24 rounded-full ring-4 ring-white shadow-2xl bg-gray-200 flex items-center justify-center relative z-10">
               <User className="w-10 h-10 text-gray-400" />
             </div>
          )}
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1"><span className="animate-pulse">📞</span> Incoming Call</h2>
        <p className="text-sm font-semibold text-gray-500 mb-10 text-center">{callerProfile?.name || 'A Student'} is calling you</p>
        
        <div className="flex items-center gap-6 w-full justify-center">
          <button 
            onClick={() => {
              // Send explicit decline broadcast to notify caller
              const globalChan = supabase.channel(`user_channel_${incomingCall.from}`);
              globalChan.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  globalChan.send({ type: 'broadcast', event: 'call_declined', payload: { to: incomingCall.from, from: session?.user.id } });
                  setTimeout(() => supabase.removeChannel(globalChan), 1500);
                }
              });
              setIncomingCall(null);
              stopLoop();
            }}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-xl flex items-center justify-center text-white transition-all active:scale-90 border-4 border-red-400/30"
          >
            <PhoneOff size={28} />
          </button>

          <button 
            onClick={() => {
              const { setIncomingOffer, setOtherUser, setMatchId, acceptCall } = useCallStore.getState();
              setIncomingOffer(incomingCall.offer);
              setOtherUser({ id: incomingCall.from, name: callerProfile?.name || 'Student', avatar_url: callerProfile?.avatar_url || '' });
              setMatchId(incomingCall.matchId || incomingCall.from);
              
              setIncomingCall(null);
              stopLoop();
              if (session?.user.id) acceptCall(session.user.id);
            }}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-xl flex items-center justify-center text-white transition-all active:scale-90 border-4 border-green-400/30 animate-bounce"
          >
            <Phone size={28} className="fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
