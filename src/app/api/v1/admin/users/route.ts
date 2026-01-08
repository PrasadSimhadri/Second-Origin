// ===========================================
// Admin Users API Routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/v1/admin/users
export async function GET(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['admin']);
    if (error) return error;

    const client = getAdminClient();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // Cache control for faster dashboard loading
    const headers = {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    };

    try {
        let query = client
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (role) {
            query = query.eq('role', role);
        }

        const { data: users, error: usersError } = await query;

        if (usersError) throw usersError;

        return NextResponse.json(users || [], { headers });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

// POST /api/v1/admin/users - Create new user
export async function POST(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['admin']);
    if (error) return error;

    const client = getAdminClient();

    try {
        const body = await request.json();
        const { email, password, fullName, role, phone } = body;

        if (!email || !password || !fullName || !role) {
            return NextResponse.json(
                { error: 'Email, password, fullName, and role are required' },
                { status: 400 }
            );
        }

        // Create auth user with auto-confirm
        const { data: authData, error: authError } = await client.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (authError) throw authError;

        if (!authData.user) throw new Error('Failed to create user');

        // Enhance profile creation
        const { data: profile, error: profileError } = await client
            .from('users')
            .insert({
                id: authData.user.id,
                email,
                full_name: fullName,
                role,
                phone: phone || null,
                status: 'active'
            })
            .select()
            .single();

        if (profileError) {
            // Rollback auth user if profile fails
            await client.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        return NextResponse.json(profile, { status: 201 });
    } catch (err) {
        console.error('Create user error:', err);
        const message = err instanceof Error ? err.message : 'Failed to create user';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

// PUT /api/v1/admin/users (update user status)
export async function PUT(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['admin']);
    if (error) return error;

    const client = getAdminClient();

    try {
        const body = await request.json();
        const { userId, action, reason } = body;

        if (!userId || !action) {
            return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
        }

        const newStatus = action === 'block' ? 'blocked' : 'active';

        const { data: updatedUser, error: updateError } = await client
            .from('users')
            .update({
                status: newStatus,
                block_reason: action === 'block' ? reason : null
            })
            .eq('id', userId)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json(updatedUser);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
