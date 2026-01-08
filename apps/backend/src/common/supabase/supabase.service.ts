// ===========================================
// Supabase Service
// ===========================================

import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private readonly supabase: SupabaseClient;
    private readonly supabaseAdmin: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables');
        }

        // Client with anon key (respects RLS)
        this.supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Admin client (bypasses RLS)
        this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    /**
     * Get Supabase client (respects RLS)
     */
    getClient(): SupabaseClient {
        return this.supabase;
    }

    /**
     * Get Admin client (bypasses RLS) - use with caution
     */
    getAdminClient(): SupabaseClient {
        return this.supabaseAdmin;
    }

    /**
     * Get authenticated client for a specific user
     */
    getClientForUser(accessToken: string): SupabaseClient {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        return createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        });
    }
}
