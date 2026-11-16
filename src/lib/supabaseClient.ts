import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let cachedMode: 'supabase' | 'local_preview' = 'local_preview';
let cachedAuthMode: 'supabase' | 'local_preview' = 'local_preview';

export interface PublicRuntimeConfig {
  mode: 'supabase' | 'local_preview';
  authMode?: 'supabase' | 'local_preview';
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
}

export async function initRuntimeConfig(): Promise<PublicRuntimeConfig> {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) {
      return {
        mode: 'local_preview',
        authMode: 'local_preview',
        supabaseUrl: null,
        supabasePublishableKey: null,
      };
    }
    const cfg = (await res.json()) as PublicRuntimeConfig;
    cachedMode = cfg.mode;
    cachedAuthMode = cfg.authMode ?? cfg.mode;
    if (
      (cachedAuthMode === 'supabase' || cachedMode === 'supabase') &&
      cfg.supabaseUrl &&
      cfg.supabasePublishableKey &&
      !cachedClient
    ) {
      cachedClient = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
    }
    return cfg;
  } catch {
    return {
      mode: 'local_preview',
      authMode: 'local_preview',
      supabaseUrl: null,
      supabasePublishableKey: null,
    };
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  return cachedClient;
}

export function getBackendMode(): 'supabase' | 'local_preview' {
  return cachedMode;
}

export function getAuthMode(): 'supabase' | 'local_preview' {
  return cachedAuthMode;
}
