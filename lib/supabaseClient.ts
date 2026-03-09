import { createClient } from '@supabase/supabase-js';

/**
 * Safe environment variable extraction for the WowSociety ecosystem.
 * Prioritizes NEXT_PUBLIC prefixes used in diverse deployment environments.
 */
const getEnvVar = (name: string): string => {
  const baseName = name.replace('VITE_', '').replace('NEXT_PUBLIC_', '');
  const nextName = `NEXT_PUBLIC_${baseName}`;
  const viteName = `VITE_${baseName}`;
  
  // Specific check for the user's unique key name
  const publishableName = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY';

  // Check process.env (Node/System)
  if (typeof process !== 'undefined' && (process as any).env) {
    const env = (process as any).env;
    if (env[nextName]) return env[nextName];
    if (env[publishableName]) return env[publishableName];
    if (env[viteName]) return env[viteName];
    if (env[name]) return env[name];
  }

  // Check import.meta.env (Vite/ESM)
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      if (env[nextName]) return env[nextName];
      if (env[publishableName]) return env[publishableName];
      if (env[viteName]) return env[viteName];
      if (env[name]) return env[name];
    }
  } catch (e) {
    // Silent catch for environments without import.meta
  }

  return '';
};

/**
 * Validates if a string is a properly formatted absolute URL.
 * Critical to prevent SDK initialization crashes.
 */
const isValidUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

/**
 * Hardcoded WowSociety project credentials.
 * These ensure the application is functional "out of the box".
 */
const FALLBACK_URL = 'https://qpdtmuichqimcpjgnbig.supabase.co';
const FALLBACK_KEY = 'sb_publishable_SVXiTloJosX3Y-_DfXhyDQ_42k0hnS1';

// Extraction
const rawUrl = getEnvVar('VITE_SUPABASE_URL');
const rawKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Selection Logic: Use env var if valid, otherwise fallback.
const finalUrl = isValidUrl(rawUrl) ? rawUrl : FALLBACK_URL;
const finalKey = rawKey ? rawKey : FALLBACK_KEY;

/**
 * Export configuration status. 
 * Since we have valid fallbacks, the app is considered configured.
 */
export const isSupabaseConfigured = isValidUrl(finalUrl) && !!finalKey;

/**
 * Initialize the Supabase client for the WowSociety ecosystem.
 */
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
