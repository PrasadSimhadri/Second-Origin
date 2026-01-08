// ===========================================
// Flag Resolve API Route
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/middleware/auth';

// POST /api/v1/flags/[id]/resolve - Resolve a flag
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await authenticateRequest(request, ['admin']);
    if (error) return error;

    const { id: flagId } = await params;
    const client = getAdminClient();

    try {
        const body = await request.json();
        const { action, notes } = body;

        if (!action || !['confirm', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'action must be "confirm" or "reject"' },
                { status: 400 }
            );
        }

        const newStatus = action === 'confirm' ? 'confirmed' : 'rejected';

        const { data: flag, error: updateError } = await client
            .from('flags')
            .update({
                status: newStatus,
                resolved_by: user!.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: notes || null
            })
            .eq('id', flagId)
            .select()
            .single();

        if (updateError) throw updateError;

        // If confirmed, update customer's confirmed_flags_count
        if (action === 'confirm' && flag) {
            const { data: originalFlag } = await client
                .from('flags')
                .select('bill:bills(customer_id)')
                .eq('id', flagId)
                .single();

            if (originalFlag?.bill) {
                const customerId = (originalFlag.bill as { customer_id: string }).customer_id;
                await client.rpc('increment_confirmed_flags', { user_id: customerId });
            }
        }

        return NextResponse.json(flag);
    } catch (err) {
        console.error('Resolve flag error:', err);
        return NextResponse.json({ error: 'Failed to resolve flag' }, { status: 500 });
    }
}
