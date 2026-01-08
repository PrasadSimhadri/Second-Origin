// ===========================================
// Admin Bills API Routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/v1/admin/bills - Get all bills (admin only)
export async function GET(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['admin']);
    if (error) return error;

    const client = getAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    try {
        let query = client
            .from('bills')
            .select(`
                *,
                customer:users!bills_customer_id_fkey(id, email, full_name),
                store:stores(id, name, code)
            `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: bills, error: billsError } = await query.limit(100);

        if (billsError) throw billsError;

        return NextResponse.json(bills || []);
    } catch (err) {
        console.error('Admin bills error:', err);
        return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
    }
}
