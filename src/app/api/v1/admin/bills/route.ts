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
        // First get all bills
        let query = client
            .from('bills')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (status) {
            query = query.eq('status', status);
        }

        const { data: bills, error: billsError } = await query;

        if (billsError) {
            console.error('Bills query error:', billsError);
            throw billsError;
        }

        // Enrich with customer info
        const enrichedBills = await Promise.all(
            (bills || []).map(async (bill) => {
                // Get customer
                const { data: customer } = await client
                    .from('users')
                    .select('id, email, full_name')
                    .eq('id', bill.customer_id)
                    .single();

                // Get store
                const { data: store } = await client
                    .from('stores')
                    .select('id, name, code')
                    .eq('id', bill.store_id)
                    .single();

                return { ...bill, customer, store };
            })
        );

        // Cache for 30 seconds
        const headers = {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10'
        };

        return NextResponse.json(enrichedBills, { headers });
    } catch (err) {
        console.error('Admin bills error:', err);
        return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
    }
}

