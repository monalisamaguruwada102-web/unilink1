import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, User, Lock, Sparkles } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState(''); // Added more "data" for the email/profile
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmSent, setShowConfirmSent] = useState(false);

  useEffect(() => {
    // Check for confirmation success flag in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === 'true') {
      alert('✅ Account confirmed! You can now sign in.');
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
      } else {
        // Sign up with extra metadata and dynamic redirect (NOT localhost in production)
        const redirectUrl = `${window.location.origin}/auth/callback`;
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // These metadata fields can be used in your Supabase email templates 
            // via {{ .Data.name }} or {{ .Data.campus }}
            data: { 
              name, 
              department,
              campus: 'Kwekwe Polytechnic',
              welcome_note: 'Welcome to the official student network of Poly Link!' 
            },
            redirectTo: redirectUrl,
          },
        });
        
        if (signUpError) throw signUpError;
        
        if (data.user) {
          setShowConfirmSent(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email to resend link');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
           redirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      if (error) throw error;
      alert('Verification link resent!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950 font-sans">
      <div className="w-full max-w-sm space-y-8">
        <header className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl shadow-primary-500/20 mb-6 rotate-3">
               <Sparkles size={32} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600">Poly Link</h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-40 mt-1">Official Student Social</p>
        </header>

        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400"
                    placeholder="Student Name"
                  />
                </div>
                <div className="relative group">
                  <input
                    type="text" required value={department} onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400"
                    placeholder="Department (e.g. IT)"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group text-black">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400 text-black dark:text-white"
              placeholder="Email Address"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400"
              placeholder="Password"
            />
          </div>

          {error && <p className="text-red-500 text-[10px] font-black uppercase text-center tracking-widest">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full py-5 bg-primary-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl shadow-primary-500/40 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>}
            <ArrowRight size={18} />
          </button>
        </form>

        <footer className="text-center pt-4">
           <button onClick={() => setIsLogin(!isLogin)} className="text-xs font-black uppercase tracking-widest text-primary-600 hover:scale-105 active:scale-95 transition-all">
             {isLogin ? "No account? Sign Up" : "Already have? Login"}
           </button>
        </footer>
      </div>

      {/* 📧 CONFIRM EMAIL MODAL */}
      <AnimatePresence>
        {showConfirmSent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 text-center">
             <div className="bg-gray-900 border border-primary-500/20 w-full max-w-sm rounded-[3rem] p-10">
                <div className="w-20 h-20 bg-primary-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-primary-500 ring-4 ring-primary-500/5 anim-bounce">
                  <Mail size={40} />
                </div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter mb-4">Check Email!</h2>
                <p className="text-xs text-white/50 font-medium mb-10 leading-relaxed uppercase tracking-widest px-4">
                  We've sent a high-priority confirmation link to <span className="text-white font-black italic">{email}</span>. Confirm to unlock campus.
                </p>
                <div className="flex flex-col gap-3">
                   <button onClick={() => { setShowConfirmSent(false); setIsLogin(true); }} className="w-full py-5 rounded-2xl bg-primary-500 text-white font-black text-[10px] uppercase shadow-lg shadow-primary-500/30">Back to Login</button>
                   <button onClick={handleResend} disabled={loading} className="w-full py-5 rounded-2xl bg-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest disabled:opacity-50">Resend Link</button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
