import { useState } from 'react';
import { useFeatureStore } from '../../store/useFeatureStore';
import { ShieldAlert, Moon, Sun, MapPin, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SOSButton = () => {
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const startSOS = () => {
    setIsActive(true);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('🚨 CAMPUS EMERGENCY ALERT SENT!\nLocation: Main Library, Zone B\nHelp is on the way.');
          setIsActive(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <>
      <button
        onClick={startSOS}
        className="fixed bottom-24 right-6 bg-red-600 text-white p-4 rounded-full shadow-2xl z-[100] active:scale-95 transition-transform"
      >
        <ShieldAlert size={24} />
      </button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-red-600/90 z-[200] flex flex-col items-center justify-center p-8 text-white text-center"
          >
            <MapPin size={64} className="mb-6 animate-bounce" />
            <h2 className="text-3xl font-bold mb-4">SOS ACTIVE</h2>
            <p className="text-xl mb-8">Notifying Campus Security and trusted contacts in...</p>
            <div className="text-8xl font-black mb-12">{countdown}</div>
            <button
              onClick={() => { setIsActive(false); setCountdown(5); }}
              className="bg-white text-red-600 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest"
            >
              Cancel Alert
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const ThemeToggle = () => {
  const { isDarkMode, toggleDarkMode } = useFeatureStore();
  
  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 transition-colors"
    >
      {isDarkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-indigo-600" />}
    </button>
  );
};

export const AudioToggle = () => {
  const { isSoundEnabled, setSoundEnabled } = useFeatureStore();
  
  return (
    <button
      onClick={() => setSoundEnabled(!isSoundEnabled)}
      className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 transition-colors"
      title="Toggle Notification Sounds"
    >
      {isSoundEnabled ? <Volume2 className="text-green-500" /> : <VolumeX className="text-gray-400" />}
    </button>
  );
};
