import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, X, Zap, Heart, ShieldAlert } from 'lucide-react';
import type { UserProfile } from '../lib/supabase';
import { useFeatureStore } from '../store/useFeatureStore';

interface ProfileCardProps {
  profile: UserProfile;
  onLike: (id: string) => void;
  onPass: (id: string) => void;
  onCrush: (id: string) => void;
  showActions?: boolean;
}

export default function ProfileCard({ profile, onLike, onPass, onCrush, showActions = true }: ProfileCardProps) {
  const { isDarkMode } = useFeatureStore();
  
  return (
    <motion.div 
      className={`relative w-full max-w-[340px] h-[500px] rounded-[3.5rem] overflow-hidden shadow-2xl border transition-all duration-500 group ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'}`}
    >
      <div className="relative h-full">
        <img 
          src={profile.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&h=800&fit=crop'} 
          alt={profile.name} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
        />
        
        {/* Aesthetic Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent opacity-60" />
        
        {/* Icebreaker Feature */}
        <div className="absolute top-6 left-6 right-6">
           <motion.div 
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-4 border border-white/20 shadow-2xl"
           >
              <div className="flex items-center gap-2 mb-1">
                 <SparklesIcon />
                 <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-300">Icebreaker</p>
              </div>
              <p className="text-[11px] text-white font-bold leading-relaxed">"What's your go-to study spot on campus?"</p>
           </motion.div>
        </div>

        {/* Profile Info */}
        <div className="absolute bottom-32 left-8 right-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-3xl font-black tracking-tighter">{profile.name}, {profile.age}</h3>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
          </div>
          
          <div className="flex flex-wrap gap-2 opacity-90">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black tracking-widest uppercase">
                <GraduationCap size={14} /> {profile.college || 'Campus'}
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black tracking-widest uppercase">
                <BookOpen size={14} /> {profile.course || 'Student'}
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="absolute bottom-8 left-0 right-0 px-8 flex justify-between items-center">
             <button 
               onClick={() => onPass(profile.id)}
               className="w-16 h-16 rounded-[2rem] bg-white/10 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all hover:bg-red-500 hover:border-red-400 hover:scale-110 active:scale-95 group/btn"
             >
                <X size={28} strokeWidth={3} className="transition-transform group-hover/btn:rotate-90" />
             </button>

             <button 
               onClick={() => onCrush(profile.id)}
               className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/40 hover:scale-110 active:scale-90 transition-all group/crush"
             >
                <Zap size={32} fill="currentColor" className="group-hover/crush:animate-bounce" />
             </button>

             <button 
               onClick={() => onLike(profile.id)}
               className="w-16 h-16 rounded-[2rem] bg-primary-500 text-white flex items-center justify-center shadow-2xl shadow-primary-500/40 hover:scale-110 active:scale-95 transition-all group/like"
             >
                <Heart size={28} fill="currentColor" className="group-hover/like:scale-110 transition-transform" />
             </button>
          </div>
        )}

        {/* Reporting Button */}
        <button className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 transition-colors">
           <ShieldAlert size={20} />
        </button>
      </div>
    </motion.div>
  );
}

function SparklesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-300">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}
