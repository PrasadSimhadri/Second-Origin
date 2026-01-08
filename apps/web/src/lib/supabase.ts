// ===========================================
// Supabase Client - Shared for API routes
// ===========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized clients for build compatibility
let supabaseClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    return url;
}

function getSupabaseAnonKey(): string {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    return key;
}

function getSupabaseServiceKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    return key;
}

// Client-side Supabase client (lazy initialization)
export const supabase = {
    auth: {
        getUser: async (token: string) => {
            if (!supabaseClient) {
                supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey());
            }
            return supabaseClient.auth.getUser(token);
        },
        signUp: async (credentials: { email: string; password: string }) => {
            if (!supabaseClient) {
                supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey());
            }
            return supabaseClient.auth.signUp(credentials);
        },
        signInWithPassword: async (credentials: { email: string; password: string }) => {
            if (!supabaseClient) {
                supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey());
            }
            return supabaseClient.auth.signInWithPassword(credentials);
        },
        refreshSession: async (params: { refresh_token: string }) => {
            if (!supabaseClient) {
                supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey());
            }
            return supabaseClient.auth.refreshSession(params);
        },
    },
};

// Admin client for server-side operations (lazy initialization)
export function getAdminClient(): SupabaseClient {
    if (!adminClient) {
        adminClient = createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return adminClient;
}

// Create client for specific user token
export function getClientForUser(accessToken: string): SupabaseClient {
    return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
}
