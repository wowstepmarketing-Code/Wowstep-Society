
import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { supabase, isSupabaseConfigured, supabaseConfigStatus, checkSupabaseHealth, finalUrl, finalKey } from '../lib/supabaseClient';
import { UserRole, Profile, User } from '../types';

console.log("SUPABASE CONFIG:", {
  url: supabaseConfigStatus,
  configured: isSupabaseConfigured
});

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

async function fetchMyProfile(userId: string, email?: string, retryCount = 0): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  console.log(`fetchMyProfile called for: ${userId} (attempt ${retryCount + 1}) at ${new Date().toISOString()}`);
  
  try {
    // Increase timeouts: 15s for first attempt, 30s for retry
    const currentTimeout = retryCount === 0 ? 15000 : 30000;
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('PROFILE_FETCH_TIMEOUT')), currentTimeout)
    );
    
    // Attempt to fetch profile via Supabase client
    const queryPromise = supabase
      .from('profiles')
      .select('id,email,full_name,role,onboarding_complete')
      .eq('id', userId)
      .maybeSingle();

    const result = await Promise.race([queryPromise, timeoutPromise]) as any;
    const { data, error } = result;
    
    console.log(`fetchMyProfile response received for ${userId}:`, { data, error });

    if (error) {
      console.error("Profile fetch error:", error);
      throw error; 
    }

    if (!data && email) {
      console.log("Profile missing, creating default...");
      const { data: newData, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, email: email, role: 'CLIENT' })
        .select()
        .single();
      if (!insertError) return newData as Profile;
      console.error("Failed to auto-create profile:", insertError);
      throw insertError;
    }

    return data as Profile;
  } catch (err: any) {
    console.error(`fetchMyProfile EXCEPTION (Attempt ${retryCount + 1}):`, err.message || 'UNKNOWN_ERROR');
    
    // If we hit a timeout or error, try a direct REST fetch as a last resort before retrying or falling back
    if (err.message === 'PROFILE_FETCH_TIMEOUT' || err.message?.includes('fetch')) {
       console.log("Attempting direct REST fetch fallback...");
       try {
         const restResponse = await fetch(`${finalUrl}/rest/v1/profiles?id=eq.${userId}&select=id,email,full_name,role,onboarding_complete`, {
           headers: {
             'apikey': finalKey,
             'Authorization': `Bearer ${finalKey}`
           }
         });
         if (restResponse.ok) {
           const restData = await restResponse.json();
           if (restData && restData.length > 0) {
             console.log("Direct REST fetch successful!");
             return restData[0] as Profile;
           }
         }
       } catch (restErr) {
         console.error("Direct REST fetch fallback failed:", restErr);
       }
    }

    // Retry logic: up to 1 retry (2 attempts total)
    if (retryCount < 1) {
      const backoff = 2000; 
      console.log(`Retrying profile fetch in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchMyProfile(userId, email, retryCount + 1);
    }
    
    // FINAL FALLBACK: If retries fail or time out, return a fail-safe profile to prevent blocking the app
    console.warn("CRITICAL: Profile fetch failed or timed out. Using fail-safe profile.");
    return {
      id: userId,
      email: email || '',
      full_name: 'User (Offline Mode)',
      role: UserRole.CLIENT,
      onboarding_complete: true // Assume true to bypass onboarding blocks if sync is down
    } as Profile;
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
        console.log("Auth Boot: Initializing session check...");
        
        // Run health check in parallel with session check
        const healthPromise = checkSupabaseHealth();
        const sessionPromise = supabase.auth.getSession();
        
        const [health, { data: { session: initialSession }, error }] = await Promise.all([
          healthPromise,
          sessionPromise
        ]);
        
        console.log("Auth Boot: Health Check Result:", health);
        if (!health.ok) {
          console.warn("Auth Boot: Supabase project might be paused or unreachable.", health);
          if (health.status === 503 || health.status === 504) setProjectPaused(true);
          else setNetworkError(true);
        }

        console.log("Auth Boot: getSession() resolved. Session exists:", !!initialSession);
        
        if (error) {
          console.error("Auth Boot: getSession error", error);
          if (error.message.includes('fetch')) setNetworkError(true);
        }

        if (!isMounted) return;
        
        // Force refresh the session token before fetching profile
        if (initialSession) {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            console.log("Session refreshed successfully");
            setSession(refreshData.session);
          } else {
            console.log("Session refresh failed, signing out");
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
          console.log("Auth Boot: Session found, fetching profile...");
          setProfileError(false);
          
          // Pre-check: Don't fetch if we already know Supabase is down
          if (projectPaused || networkError) {
            console.warn("Auth Boot: Skipping profile fetch due to project status.");
            setProfileError(true);
            setLoading(false);
            return;
          }

          const p = await fetchMyProfile(initialSession.user.id, initialSession.user.email);
          profileFetchedRef.current = true;
          
          if (!isMounted) return;
          
          if (!p) {
            console.error("Auth Boot: Profile fetch failed or timed out.");
            setProfileError(true);
          }

          setProfile(p);
          setUser({
            id: initialSession.user.id,
            email: initialSession.user.email || '',
            name: p?.full_name || '',
            role: p?.role || UserRole.CLIENT
          });
        } else {
          console.log("Auth Boot: No session found.");
        }
      } catch (err) {
        console.error("Auth Boot: Critical initialization failure", err);
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log("AUTH COMPLETE - loading set to false, profile:", profile);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      
      if (profileFetchedRef.current && event === 'SIGNED_IN') return;

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        console.log(`Auth Event: ${event}`);
        setSession(newSession);

        if (newSession?.user) {
          setProfileError(false);
          
          // Pre-check: Don't fetch if we already know Supabase is down
          if (projectPaused || networkError) {
            console.warn("Auth Event: Skipping profile fetch due to project status.");
            setProfileError(true);
            setLoading(false);
            return;
          }

          const p = await fetchMyProfile(newSession.user.id, newSession.user.email);
          console.log("Auth Event: Profile fetched:", p);
          if (!isMounted) return;
          
          if (!p) {
            console.error("Auth Event: Profile fetch failed or timed out.");
            setProfileError(true);
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
        console.log("Auth Event: Loading complete. Onboarding complete:", profile?.onboarding_complete);
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
