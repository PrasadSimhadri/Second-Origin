// ===========================================
// Supabase Client for Frontend Auth - Lazy Loaded
// ===========================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase URL and Anon Key are required');
        }

        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    }
    return supabaseInstance;
}

// Proxy object that lazily accesses the Supabase client
export const supabase = {
    auth: {
        getSession: async () => getSupabaseClient().auth.getSession(),
        getUser: async () => getSupabaseClient().auth.getUser(),
        signUp: async (credentials: { email: string; password: string }) =>
            getSupabaseClient().auth.signUp(credentials),
        signInWithPassword: async (credentials: { email: string; password: string }) =>
            getSupabaseClient().auth.signInWithPassword(credentials),
        signOut: async () => getSupabaseClient().auth.signOut(),
    },
};

// Auth helpers
export const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) throw error;

    // Create user profile via API
    if (data.user) {
        const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName, phone }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Registration failed');
        }
    }

    return data;
};

export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

export const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};
