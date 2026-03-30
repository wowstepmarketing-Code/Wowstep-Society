
import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured, supabaseConfigStatus, checkSupabaseHealth, finalUrl, finalKey } from '../lib/supabaseClient';
import { UserRole, Profile, User } from '../types';

type AuthContextValue = {
  user: User | null;
  session: any | null;
  profile: Profile | null;
  onboardingComplete: boolean;
  loading: boolean;
  profileError: boolean;
  isConfigured: boolean;
  configStatus: typeof supabaseConfigStatus;

  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string; type?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ ok: boolean; error?: string; type?: string }>;
  signOut: () => Promise<void>;

  updateProfile: (updates: Partial<Profile>) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
  networkError: boolean;
  projectPaused: boolean;

  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMyProfile(userId: string, email?: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,status,onboarding_complete')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code === 'PGRST116' && email) {
      const { data: newData, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, email: email, role: 'CLIENT' })
        .select()
        .single();
      if (!insertError) return newData as Profile;
      console.error("Failed to auto-create profile:", insertError);
      return null;
    }

    if (error) {
      console.error("Profile fetch error:", error);
      return null;
    }
    return data as Profile;
  } catch (err) {
    console.error("Profile fetch failed:", err);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [projectPaused, setProjectPaused] = useState(false);
  const profileFetchedRef = useRef(false);

  // Fix: Derive onboarding status from profile
  const onboardingComplete = useMemo(() => !!profile?.onboarding_complete, [profile]);

  const refreshProfile = async () => {
    if (!user?.id) return;
    setProfileError(false);
    const p = await fetchMyProfile(user.id, user.email);
    setProfile(p);
    if (!p) setProfileError(true);
  };

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        // Run session check
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (error.message.includes('fetch')) setNetworkError(true);
        }

        if (!isMounted) return;
        
        // Force refresh the session token before fetching profile
        if (initialSession) {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            setSession(refreshData.session);
          } else {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
        } else {
          setSession(initialSession);
        }

        if (initialSession?.user && !profileFetchedRef.current) {
          setProfileError(false);
          
          // Pre-check: Don't fetch if we already know Supabase is down
          if (projectPaused || networkError) {
            setProfileError(true);
            setLoading(false);
            return;
          }

          const p = await fetchMyProfile(initialSession.user.id, initialSession.user.email);
          profileFetchedRef.current = true;
          
          if (!isMounted) return;
          
          if (!p) {
            setProfileError(true);
          }

          if (p?.status === 'pending' || p?.status === 'rejected') {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }

          setProfile(p);
          setUser({
            id: initialSession.user.id,
            email: initialSession.user.email || '',
            name: p?.full_name || '',
            role: p?.role || UserRole.CLIENT
          });
        }
      } catch (err) {
        console.error("Auth Boot: Critical initialization failure", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      
      if (profileFetchedRef.current && event === 'SIGNED_IN') return;

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(newSession);

        if (newSession?.user) {
          setProfileError(false);
          
          // Pre-check: Don't fetch if we already know Supabase is down
          if (projectPaused || networkError) {
            setProfileError(true);
            setLoading(false);
            return;
          }

          const p = await fetchMyProfile(newSession.user.id, newSession.user.email);
          if (!isMounted) return;
          
          if (!p) {
            setProfileError(true);
          }

          if (p?.status === 'pending' || p?.status === 'rejected') {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }

          setProfile(p);
          profileFetchedRef.current = true;
          setUser({
            id: newSession.user.id,
            email: newSession.user.email || '',
            name: p?.full_name || '',
            role: p?.role || UserRole.CLIENT
          });
        } else {
          setProfile(null);
          setProfileError(false);
          profileFetchedRef.current = false;
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { ok: false, error: 'Supabase configuration is incomplete.', type: 'config' };
    }
    
    try {
      const { data: { session: newSession }, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("Login Failure:", error);
        if (error.message.includes('fetch')) {
          setNetworkError(true);
          return { ok: false, error: 'Network connection failed. Check your internet or Supabase status.', type: 'network' };
        }
        if (error.status === 400 && error.message.includes('invalid_credentials')) {
          return { ok: false, error: 'Invalid credentials. Please verify your email and password. If you just signed up, you MUST check your email for a verification link before you can log in.', type: 'auth' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { ok: false, error: 'Email not confirmed. Please check your inbox for the verification link we sent you.', type: 'auth' };
        }
        if (error.status === 401 && error.message.includes('apiKey')) {
          return { ok: false, error: 'Invalid API Key. Check your Supabase configuration.', type: 'config' };
        }
        return { ok: false, error: error.message };
      }

      // Check profile status immediately
      if (newSession?.user) {
        const p = await fetchMyProfile(newSession.user.id, newSession.user.email);
        if (p?.status === 'pending') {
          await supabase.auth.signOut();
          return { ok: false, error: "Your company request is still pending approval. You'll be notified once an admin reviews it.", type: 'auth' };
        }
        if (p?.status === 'rejected') {
          await supabase.auth.signOut();
          return { ok: false, error: "Your company request was rejected. Please contact support for more information.", type: 'auth' };
        }
      }

      setNetworkError(false);
      setProjectPaused(false);
      return { ok: true };
    } catch (err: any) {
      console.error("Login Exception:", err);
      return { ok: false, error: 'An unexpected error occurred during tactical entry.', type: 'exception' };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (!isSupabaseConfigured) {
      return { ok: false, error: 'Supabase configuration is incomplete.', type: 'config' };
    }
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName ?? '' } },
      });
      if (error) {
        console.error("Registration Failure:", error);
        if (error.message.includes('fetch')) {
          setNetworkError(true);
          return { ok: false, error: 'Network connection failed.', type: 'network' };
        }
        if (error.message.includes('User already registered')) {
          return { ok: false, error: 'This email is already registered. Please try logging in instead.', type: 'auth' };
        }
        if (error.message.includes('at least 6 characters')) {
          return { ok: false, error: 'Security requirement: Password must be at least 6 characters long.', type: 'auth' };
        }
        return { ok: false, error: error.message };
      }
      setNetworkError(false);
      setProjectPaused(false);
      return { ok: true };
    } catch (err: any) {
      console.error("Registration Exception:", err);
      return { ok: false, error: 'An unexpected error occurred.', type: 'exception' };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { ok: false, error: 'No user session' };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (error) return { ok: false, error: error.message };
    await refreshProfile();
    return { ok: true };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      onboardingComplete,
      loading,
      profileError,
      isConfigured: isSupabaseConfigured,
      configStatus: supabaseConfigStatus,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updatePassword,
      networkError,
      projectPaused,
      refreshProfile,
    }),
    [user, session, profile, onboardingComplete, loading, profileError, networkError, projectPaused],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
