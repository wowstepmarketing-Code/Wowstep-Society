import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Login: React.FC = () => {
  const { signIn, signUp, user, profile, loading, profileError, isConfigured, configStatus, networkError, projectPaused, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect only after auth state is fully ready
  React.useEffect(() => {
    if (!loading && user && profile) {
      navigate('/dashboard');
    }
  }, [loading, user, profile, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!isConfigured) {
      if (!configStatus.hasUrl || !configStatus.hasKey) {
        setError('Configuration Missing: Supabase URL or Anon Key is not defined.');
      } else if (!configStatus.isValidUrl) {
        setError('Configuration Error: The provided Supabase URL is invalid.');
      } else {
        setError('Configuration Error: Supabase setup is incomplete.');
      }
      return;
    }

    if (networkError) {
      setError('Network Failure: Unable to reach Supabase. Check your connection or project status.');
      return;
    }

    if (projectPaused) {
      setError('Project Unavailable: The Supabase project may be paused or undergoing maintenance.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Security requirement: Password must be at least 6 characters long.');
      return;
    }

    setBusy(true);

    try {
      const res =
        mode === 'signin'
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, fullName.trim());

      if (res.ok) {
        // Navigation is handled by the useEffect above to ensure profile is loaded
      } else {
        setError(res.error ?? 'Authentication roadblock encountered. Verify credentials.');
        setBusy(false);
      }
    } catch (err) {
      setError('Neural network timeout. Please re-attempt strategic entry.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-[2rem] p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-green/10 blur-[80px] rounded-full" />
        
        <div className="mb-10 text-center relative z-10">
          <div className="text-3xl font-heading font-bold tracking-tighter text-white flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-brand-green rounded-2xl flex items-center justify-center text-sm shadow-lg shadow-brand-green/20">WS</div>
            WOWSOCIETY
          </div>
          <div className="text-[10px] text-brand-green font-bold tracking-[0.4em] mt-3 uppercase">Command & Intelligence</div>
        </div>

        <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
              mode === 'signin' ? 'bg-brand-green text-white shadow-md' : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setMode('signin')}
            type="button"
          >
            Entry
          </button>
          <button
            className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
              mode === 'signup' ? 'bg-brand-green text-white shadow-md' : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setMode('signup')}
            type="button"
          >
            Access Request
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 relative z-10">
          {mode === 'signup' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Full Executive Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white outline-none focus:border-brand-green/50 transition-all placeholder:text-gray-700"
                placeholder="e.g. Juliano Wowstep"
                autoComplete="name"
                required={mode === 'signup'}
              />
            </div>
          )}

          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Email Address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white outline-none focus:border-brand-green/50 transition-all placeholder:text-gray-700"
              placeholder="name@executive.com"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500 ml-1">Security Vault Code</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm text-white outline-none focus:border-brand-green/50 transition-all placeholder:text-gray-700"
              placeholder="••••••••"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {profileError && (
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center animate-in shake-1">
              Profile Sync Error: The system is having trouble retrieving your profile data.
              <div className="mt-2 pt-2 border-t border-amber-500/20">
                <button 
                  type="button"
                  onClick={() => refreshProfile()}
                  className="text-brand-green hover:underline"
                >
                  Retry Profile Sync
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center animate-in shake-1">
              {error}
              {mode === 'signin' && error.includes('Invalid credentials') && (
                <div className="mt-2 pt-2 border-t border-red-500/20">
                  <button 
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-brand-green hover:underline"
                  >
                    Don't have an account? Request access here.
                  </button>
                </div>
              )}
              {mode === 'signup' && error.includes('already registered') && (
                <div className="mt-2 pt-2 border-t border-red-500/20">
                  <button 
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-brand-green hover:underline"
                  >
                    Already have an account? Log in here.
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            disabled={busy}
            className="w-full py-4 rounded-xl bg-brand-green text-white text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-brand-darkGreen transition-all shadow-xl shadow-brand-green/20 disabled:opacity-50 active:scale-[0.98] mt-4"
          >
            {busy ? 'Authenticating...' : mode === 'signin' ? 'Enter Society' : 'Initialize Account'}
          </button>

          <p className="text-[10px] text-center text-gray-600 leading-relaxed font-medium mt-6">
            Elite Access only. Tiers managed by Wowstep Leadership.
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;