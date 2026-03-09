
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserRole, Profile, User } from '../types';

type AuthContextValue = {
  user: User | null;
  session: any | null;
  profile: Profile | null;
  // Fix: Added onboardingComplete to context value to satisfy consumers like ClientContext
  onboardingComplete: boolean;
  loading: boolean;
  isConfigured: boolean;
  networkError: boolean;

  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMyProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,onboarding_complete')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  // Fix: Derive onboarding status from profile
  const onboardingComplete = useMemo(() => !!profile?.onboarding_complete, [profile]);

  const refreshProfile = async () => {
    if (!user?.id) return;
    const p = await fetchMyProfile(user.id);
    setProfile(p);
  };

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!isMounted) return;

        const currentSession = data.session ?? null;
        setSession(currentSession);
        
        if (currentSession?.user) {
          const p = await fetchMyProfile(currentSession.user.id);
          if (!isMounted) return;
          setProfile(p);
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            name: p?.full_name || '',
            role: p?.role || UserRole.CLIENT
          });
        }
      } catch (err: any) {
        console.error("Auth initialization failed:", err);
        // If it's a fetch error, it's likely the project is paused or blocked
        if (err.message?.includes('fetch') || err.name === 'TypeError' || err.message?.includes('NetworkError')) {
          setNetworkError(true);
          console.warn("Supabase project might be paused or unreachable.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      
      if (newSession?.user?.id) {
        setLoading(true);
        const p = await fetchMyProfile(newSession.user.id);
        setProfile(p);
        setUser({
          id: newSession.user.id,
          email: newSession.user.email || '',
          name: p?.full_name || '',
          role: p?.role || UserRole.CLIENT
        });
        setLoading(false);
      } else {
        setProfile(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { ok: false, error: 'Supabase is not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!isSupabaseConfigured) return { ok: false, error: 'Supabase is not configured' };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? '' } },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      onboardingComplete,
      loading,
      isConfigured: isSupabaseConfigured,
      networkError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [user, session, profile, onboardingComplete, loading, networkError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
