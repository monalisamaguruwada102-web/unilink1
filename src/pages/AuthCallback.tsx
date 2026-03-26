import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      // The Supabase client automatically handles the code exchange 
      // if it's in the URL, but we can also manually trigger a check 
      // or just redirect after a short delay to ensure the session is picked up.
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        // If we have a session, redirect to home with a success flag
        window.location.href = '/?confirmed=true';
      } else if (error) {
        console.error('Auth callback error:', error.message);
        window.location.href = '/?error=' + encodeURIComponent(error.message);
      } else {
        // No session yet, maybe it's still processing
        // Supabase onAuthStateChange in App.tsx might catch it too
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
      <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-8"></div>
      <h2 className="text-3xl font-black italic tracking-tighter mb-4">Verifying Account...</h2>
      <p className="text-xs text-white/50 font-medium uppercase tracking-widest">Please wait while we secure your campus connection.</p>
    </div>
  );
}
