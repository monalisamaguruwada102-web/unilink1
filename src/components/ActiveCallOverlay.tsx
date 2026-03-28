import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import { useCallStore } from '../store/useCallStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureStore } from '../store/useFeatureStore';
import { useEffect, useRef } from 'react';
import { playLoop, stopLoop } from '../lib/audioManager';

export default function ActiveCallOverlay() {
  const { callStatus, otherUser, callDuration, endCall, acceptCall, remoteStream } = useCallStore();
  const { session } = useAuthStore();
  const { isDarkMode } = useFeatureStore();
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (callStatus === 'ringing' || callStatus === 'calling') {
      playLoop(callStatus === 'ringing' ? 'ringtone' : 'dialing');
    } else {
      stopLoop();
    }
  }, [callStatus]);

  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callStatus === 'idle') return null;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        className={`fixed inset-0 z-[75] flex flex-col items-center justify-center ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}
      >
        <div className="relative mb-12">
          <div className="w-32 h-32 rounded-full overflow-hidden z-10 relative border-4 border-primary-500 shadow-2xl">
            {otherUser?.avatar_url ? (
              <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full bg-primary-500 flex items-center justify-center text-white font-black text-6xl">
                {otherUser?.name.charAt(0)}
              </div>
            )}
          </div>
          {(callStatus === 'calling' || callStatus === 'ringing') && (
            <span className="absolute inset-0 rounded-full border-[6px] border-primary-500 animate-ping opacity-30" />
          )}
        </div>
        
        <h2 className="text-3xl font-black mb-2 tracking-tight">{otherUser?.name || 'Student'}</h2>
        <p className="opacity-50 font-black uppercase tracking-widest text-sm mb-16 flex items-center gap-2">
          {callStatus === 'calling' ? (
            <>Calling... <span className="w-2 h-2 rounded-full animate-bounce bg-current" /></>
          ) : callStatus === 'ringing' ? (
            <>Incoming Voice Call <span className="w-2 h-2 rounded-full animate-pulse bg-current" /></>
          ) : callStatus === 'declined' ? (
            <span className="text-red-500 font-black animate-pulse uppercase">Call Declined</span>
          ) : (
            <div className="flex flex-col items-center gap-2">
               <div className="flex items-center gap-2 text-green-500">
                 <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-xl tabular-nums font-black">{formatTime(callDuration)}</span>
               </div>
               <span className="text-[10px] opacity-70">CONNECTED</span>
            </div>
          )}
        </p>

        <div className="flex items-center gap-8">
          {callStatus === 'ringing' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => session?.user.id && acceptCall(session.user.id)}
              className="w-16 h-16 rounded-[2rem] bg-green-500 text-white flex justify-center items-center shadow-2xl shadow-green-500/30 font-black"
            >
              <Phone size={24} className="animate-pulse shadow-xl" />
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => session?.user.id && endCall(true, session.user.id)}
            className="w-16 h-16 rounded-[2rem] bg-red-500 text-white flex justify-center items-center shadow-2xl shadow-red-500/30"
          >
            <PhoneOff size={24} />
          </motion.button>
        </div>
        
        <audio ref={remoteAudioRef} autoPlay />
      </motion.div>
    </AnimatePresence>
  );
}
