import { Heart, Home, User, Sparkles, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useFeatureStore } from '../store/useFeatureStore';

export default function BottomNav() {
  const location = useLocation();
  const { isDarkMode } = useFeatureStore();
  
  const navItems = [
    { to: '/', icon: Home, label: 'Feed' },
    { to: '/discover', icon: Sparkles, label: 'Discover' },
    { to: '/community', icon: Users, label: 'Community' },
    { to: '/matches', icon: Heart, label: 'Matches' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md backdrop-blur-xl border pb-safe rounded-[3rem] z-50 transition-all duration-500",
      isDarkMode 
        ? "bg-gray-900/80 border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" 
        : "bg-white/80 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
    )}>
      <nav className="flex justify-around items-center h-20 px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center w-full h-full transition-all group"
            >
              <div className={cn(
                "p-3 rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-primary-500 text-white scale-110 shadow-lg shadow-primary-500/20" 
                  : cn("text-gray-400 group-hover:bg-gray-100", isDarkMode && "group-hover:bg-gray-800")
              )}>
                <item.icon size={24} strokeWidth={isActive ? 3 : 2} />
              </div>
              
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute -bottom-1 w-1 h-1 bg-primary-600 rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

