import { Heart, Home, User, Sparkles, Users } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useFeatureStore } from '../store/useFeatureStore';

export default function BottomNav() {
  const location = useLocation();
  const { isDarkMode, globalUnreadMessages, notifications } = useFeatureStore();
  
  const unreadNotifs = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { to: '/', icon: Home, label: 'Feed' },
    { to: '/discover', icon: Sparkles, label: 'Discover' },
    { to: '/community', icon: Users, label: 'Community' },
    { to: '/matches', icon: Heart, label: 'Matches' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md backdrop-blur-xl border rounded-[2.5rem] z-40 transition-all duration-500",
      isDarkMode 
        ? "bg-gray-900/90 border-gray-800 shadow-[0_20px_60px_rgba(0,0,0,0.6)]" 
        : "bg-white/90 border-gray-200/60 shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
    )}>
      <nav className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center gap-1 w-full h-full transition-all group"
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-bg"
                  className="absolute inset-x-1 inset-y-1 bg-primary-500/10 rounded-2xl"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <item.icon 
                  size={22} 
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={cn(
                    "relative z-10 transition-colors duration-200",
                    isActive ? "text-primary-500" : "text-gray-400"
                  )}
                />
                {item.label === 'Matches' && globalUnreadMessages > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full font-black border-2 border-white dark:border-gray-900 px-1 z-20">
                    {globalUnreadMessages > 99 ? '99+' : globalUnreadMessages}
                  </span>
                )}
                {item.label === 'Feed' && unreadNotifs > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full font-black border-2 border-white dark:border-gray-900 px-1 z-20">
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-wider relative z-10 transition-colors duration-200",
                isActive ? "text-primary-500" : "text-gray-400"
              )}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

