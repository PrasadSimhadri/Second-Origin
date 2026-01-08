// ===========================================
// Supabase Client for Customer App
// ===========================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) throw error;

    // Create user profile
    if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
            id: data.user.id,
            email,
            full_name: fullName,
            phone: phone || null,
            role: 'customer',
            status: 'active',
        });

        if (profileError) throw profileError;
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
