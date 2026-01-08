// ===========================================
// Auth Middleware for API Routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAdminClient } from '@/lib/supabase';

export interface AuthUser {
    id: string;
    email: string;
    role: 'customer' | 'guard' | 'admin';
    status: string;
    full_name?: string;
}

export async function authenticateRequest(
    request: NextRequest,
    allowedRoles?: ('customer' | 'guard' | 'admin')[]
): Promise<{ user: AuthUser | null; error: NextResponse | null }> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            user: null,
            error: NextResponse.json(
                { error: 'Missing or invalid authorization header' },
                { status: 401 }
            ),
        };
    }

    const token = authHeader.substring(7);

    try {
        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return {
                user: null,
                error: NextResponse.json(
                    { error: 'Invalid or expired token' },
                    { status: 401 }
                ),
            };
        }

        // Get user profile
        const adminClient = getAdminClient();
        const { data: profile, error: profileError } = await adminClient
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return {
                user: null,
                error: NextResponse.json(
                    { error: 'User profile not found' },
                    { status: 401 }
                ),
            };
        }

        // Check if user is blocked
        if (profile.status === 'blocked') {
            return {
                user: null,
                error: NextResponse.json(
                    { error: 'Your account has been blocked' },
                    { status: 403 }
                ),
            };
        }

        // Check role if specified
        if (allowedRoles && !allowedRoles.includes(profile.role)) {
            return {
                user: null,
                error: NextResponse.json(
                    { error: `Access denied. Required role: ${allowedRoles.join(' or ')}` },
                    { status: 403 }
                ),
            };
        }

        return { user: profile as AuthUser, error: null };
    } catch {
        return {
            user: null,
            error: NextResponse.json(
                { error: 'Authentication failed' },
                { status: 401 }
            ),
        };
    }
}
