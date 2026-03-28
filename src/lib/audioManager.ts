import { useFeatureStore } from '../store/useFeatureStore';

const sounds = {
  message: new Audio('/sounds/message.mp3'),
  match: new Audio('/sounds/match.mp3'),
  notify: new Audio('/sounds/notification.mp3'),
  ringtone: new Audio('/sounds/ringtone.mp3'),
  dialing: new Audio('/sounds/dialing.mp3')
};

// Configure WebRTC calling loops
sounds.ringtone.loop = true;
sounds.dialing.loop = true;

let currentLoop: keyof typeof sounds | null = null;

// Pre-load sounds passively
Object.values(sounds).forEach(audio => {
  audio.load();
});

export const playSound = (type: keyof typeof sounds, forceUnmuted = false) => {
  try {
    const isSoundEnabled = useFeatureStore.getState().isSoundEnabled;
    if (!forceUnmuted && !isSoundEnabled) return;

    const audio = sounds[type];
    if (!audio) return;
    
    audio.currentTime = 0; // Reset for overlapping triggers
    const promise = audio.play();
    
    // Catch browser blocks natively so it doesn't crash the UI
    if (promise !== undefined) {
      promise.catch((err) => {
        console.warn('Browser strictly blocked auto-played notification audio:', err.message);
      });
    }
  } catch (err) {
    console.error('Audio play failure:', err);
  }
};

export const playLoop = (type: keyof typeof sounds) => {
  stopLoop();
  currentLoop = type;
  playSound(type, true); // Voice Call dialing/ringing ignores notification silencers
};

export const stopLoop = () => {
  if (currentLoop && sounds[currentLoop]) {
    try {
      sounds[currentLoop].pause();
      sounds[currentLoop].currentTime = 0;
    } catch(e) {}
  }
  currentLoop = null;
};
