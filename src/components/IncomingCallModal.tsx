import { useAuthStore } from '../store/useAuthStore';
import { Phone, PhoneOff, User } from 'lucide-react';
import { useCallStore } from '../store/useCallStore';

export default function IncomingCallModal() {
  const { session } = useAuthStore();
  const { callStatus, otherUser, incomingOffer, acceptCall, endCall } = useCallStore();

  // This modal only shows if we are explicitly in 'ringing' status
  // and NOT currently in an active connected call (handled by ActiveCallOverlay)
  if (callStatus !== 'ringing' || !incomingOffer || !otherUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 shadow-2xl backdrop-blur-xl transition-all p-6">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 w-full max-w-sm flex flex-col items-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-300">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary-500 rounded-full animate-ping opacity-40"></div>
          {otherUser?.avatar_url ? (
             <img src={otherUser.avatar_url} className="w-24 h-24 rounded-full ring-4 ring-white shadow-2xl object-cover relative z-10" />
          ) : (
             <div className="w-24 h-24 rounded-full ring-4 ring-white shadow-2xl bg-gray-200 flex items-center justify-center relative z-10">
               <User className="w-10 h-10 text-gray-400" />
             </div>
          )}
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1"><span className="animate-pulse">📞</span> Incoming Call</h2>
        <p className="text-sm font-semibold text-gray-500 mb-10 text-center">{otherUser?.name || 'A Student'} is calling you</p>
        
        <div className="flex items-center gap-6 w-full justify-center">
          <button 
            onClick={() => session?.user.id && endCall(true, session.user.id)}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-xl flex items-center justify-center text-white transition-all active:scale-90 border-4 border-red-400/30"
          >
            <PhoneOff size={28} />
          </button>

          <button 
            onClick={() => session?.user.id && acceptCall(session.user.id)}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-xl flex items-center justify-center text-white transition-all active:scale-90 border-4 border-green-400/30 animate-bounce"
          >
            <Phone size={28} className="fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
