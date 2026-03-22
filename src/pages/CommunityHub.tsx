import { useState } from 'react';
import { useFeatureStore } from '../store/useFeatureStore';
import { ShoppingBag, Briefcase, Wrench, Car, AlertTriangle, ChevronRight, Bell, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CommunityHub() {
  const { isDarkMode, marketplaceItems, jobs, campusAlerts } = useFeatureStore();
  const [activeTab, setActiveTab] = useState<'all' | 'market' | 'jobs' | 'services'>('all');

  const tabs = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'market', label: 'Market', icon: ShoppingBag },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'services', label: 'Services', icon: Wrench },
  ];

  return (
    <div className={`flex-1 overflow-y-auto px-4 pt-20 pb-40 transition-colors duration-500 ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50'}`}>
      <header className="mb-10 px-2 mt-4">
        <h1 className="text-4xl font-black tracking-tighter mb-2">Community Hub</h1>
        <div className="h-1 w-12 bg-primary-500 rounded-full mb-3 " />
        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest leading-none">Campus Support & Utility</p>
      </header>

      {/* Feature 7: Utility Alerts */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6 px-2">
           <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-500" />
              ZESA & Utility Alerts
           </h3>
           <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">LIVE</span>
        </div>
        <div className="space-y-4">
          {campusAlerts.map(alert => (
            <motion.div 
               key={alert.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className={`p-6 rounded-[2.5rem] border flex items-center justify-between transition-all group ${isDarkMode ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-100'}`}
            >
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-yellow-500 text-white flex items-center justify-center shadow-lg shadow-yellow-500/30">
                    <AlertTriangle size={24} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-yellow-600">{alert.type} ALERT</p>
                    <p className="text-sm font-black">{alert.status}</p>
                    <p className="text-[10px] font-bold opacity-60 mt-1">{alert.time}</p>
                 </div>
              </div>
              <ChevronRight size={20} className="opacity-20 group-hover:opacity-100 transition translate-x-0 group-hover:translate-x-1" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature 11: Leaderboard Mini */}
      <div className={`p-8 rounded-[3rem] mb-12 border transition-all relative overflow-hidden ${isDarkMode ? 'bg-indigo-900/10 border-indigo-800/30' : 'bg-indigo-50 border-indigo-100'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center">
               <TrendingUp size={20} />
            </div>
            <h3 className="font-black text-[11px] uppercase tracking-[0.2em] opacity-60">Leaderboard</h3>
          </div>
          <button className="text-[10px] font-black uppercase tracking-widest text-indigo-500 underline underline-offset-4">Full Rank</button>
        </div>
        <div className="space-y-6">
          {[
            { rank: 1, name: "Kuda M.", pts: 2450, color: 'bg-yellow-400' },
            { rank: 2, name: "Tariro S.", pts: 2100, color: 'bg-gray-400' },
            { rank: 3, name: "Munashe J.", pts: 1850, color: 'bg-orange-400' },
          ].map(user => (
            <div key={user.rank} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-[10px] font-black text-white shadow-lg`}>{user.rank}</div>
                <span className="text-xs font-bold">{user.name}</span>
              </div>
              <span className="text-sm font-black tracking-tighter text-indigo-600">{user.pts.toLocaleString()} <span className="text-[8px] opacity-40 ml-1">xp</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-3 mb-10 overflow-x-auto hide-scrollbar pb-4 px-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap border shadow-xl ${
              activeTab === tab.id 
                ? 'bg-primary-500 border-primary-400 text-white shadow-primary-500/30 scale-105' 
                : isDarkMode ? 'bg-gray-900 border-gray-800 text-gray-500 shadow-black/40' : 'bg-white border-gray-100 text-gray-400 shadow-gray-200/50'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-10">
         {/* Marketplace */}
         {(activeTab === 'all' || activeTab === 'market') && (
           <div className="space-y-6">
             <div className="flex justify-between items-center px-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Marketplace</h3>
                <ChevronRight size={16} className="opacity-20" />
             </div>
             <div className="grid grid-cols-2 gap-5">
               {marketplaceItems.map(item => (
                 <motion.div 
                   key={item.id}
                   whileHover={{ y: -5 }}
                   className={`p-5 rounded-[2.5rem] border flex flex-col transition-all group ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white shadow-xl shadow-gray-200/40 font-bold'}`}
                 >
                   <div className="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-3xl mb-4 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition" />
                      <ShoppingBag size={40} className="text-primary-500 opacity-20" />
                   </div>
                   <div className="px-1">
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-primary-500 opacity-80">{item.category}</p>
                      <p className="text-[11px] font-black leading-tight line-clamp-1">{item.title}</p>
                      <p className="text-lg font-black mt-3 tracking-tighter text-indigo-600">{item.price}</p>
                   </div>
                 </motion.div>
               ))}
             </div>
           </div>
         )}

         {/* Jobs */}
         {(activeTab === 'all' || activeTab === 'jobs') && (
           <div className="space-y-6">
             <div className="flex justify-between items-center px-4">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Campus Jobs</h3>
                <span className="text-[9px] font-black text-primary-500 underline">Post Job</span>
             </div>
             <div className="space-y-4 px-2">
               {jobs.map((job, i) => (
                 <div key={i} className={`p-6 rounded-[2.5rem] border flex items-center justify-between transition-all group ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white shadow-xl shadow-gray-200/40'}`}>
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <Briefcase size={28} />
                       </div>
                       <div>
                          <p className="text-[13px] font-black mb-0.5">{job.title}</p>
                          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{job.company} • {job.type}</p>
                       </div>
                    </div>
                    <button className="w-10 h-10 bg-primary-50 dark:bg-primary-900/10 text-primary-500 rounded-2xl flex items-center justify-center transition group-hover:bg-primary-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary-500/30">
                       <ChevronRight size={20} />
                    </button>
                 </div>
               ))}
             </div>
           </div>
         )}
      </div>

      {/* Feature 10: Transport Share */}
      <div className="mt-16 p-10 rounded-[4rem] bg-gradient-to-br from-indigo-600 to-primary-600 text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-32 -mt-32 " />
         <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-[50px] -ml-16 -mb-16 " />
         
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-10">
               <div className="w-16 h-16 rounded-[2rem] bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl">
                  <Car size={32} />
               </div>
               <div className="flex flex-col items-end">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-black uppercase tracking-widest mb-2">Transport Match</span>
                  <div className="flex -space-x-3">
                     {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-gray-200" />)}
                  </div>
               </div>
            </div>
            
            <h3 className="text-2xl font-black mb-3 tracking-tighter leading-none">Taxi Share to CBD?</h3>
            <p className="text-xs font-medium opacity-80 mb-8 leading-loose uppercase tracking-widest">Splitting a fare with 4 others. Heading to Belvedere at 16:30 today.</p>
            
            <button className="w-full py-5 bg-white text-indigo-600 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-black/40 hover:scale-105 active:scale-95 transition-all">
               Join Taxi Share
            </button>
         </div>
      </div>
    </div>
  );
}
