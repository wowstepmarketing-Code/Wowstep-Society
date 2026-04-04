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

// Extraction
const rawUrl = getEnvVar('VITE_SUPABASE_URL');
const rawKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Selection Logic: Prioritize environment variables, fallback to hardcoded defaults.
export const finalUrl = rawUrl && isValidUrl(rawUrl) ? rawUrl : 'https://qpdtmuichqimcpjgnbig.supabase.co';
export const finalKey = rawKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZHRtdWljaHFpbWNwamduYmlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzE0NzYsImV4cCI6MjA4Njk0NzQ3Nn0.gTbfpmL9JO4BwyOMSnuwCl_JAH5CBKND53JKJFzlZYw';

/**
 * Detailed configuration status for diagnostics.
 */
export const supabaseConfigStatus = {
  hasUrl: !!rawUrl,
  hasKey: !!rawKey,
  isValidUrl: isValidUrl(rawUrl),
  isConfigured: isValidUrl(finalUrl) && !!finalKey,
  url: finalUrl ? `${finalUrl.substring(0, 15)}...` : 'NONE'
};

/**
 * Export configuration status (legacy support).
 */
export const isSupabaseConfigured = supabaseConfigStatus.isConfigured;

/**
 * Initialize the Supabase client for the WowSociety ecosystem.
 */
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: null,
  }
});
