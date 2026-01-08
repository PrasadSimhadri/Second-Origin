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

        return NextResponse.json(users || []);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
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
