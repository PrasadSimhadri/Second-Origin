// ===========================================
// Admin Stores API Routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/v1/admin/stores
export async function GET(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['admin']);
    if (error) return error;

    const client = getAdminClient();

    try {
        const { data: stores, error: storeError } = await client
            .from('stores')
            .select('*')
            .order('name');

        if (storeError) throw storeError;

        return NextResponse.json(stores || []);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }
}

// PUT /api/v1/admin/stores (update thresholds)
export async function PUT(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['admin']);
    if (error) return error;

    const client = getAdminClient();

    try {
        const body = await request.json();
        const { storeId, priceThreshold, quantityThreshold } = body;

        if (!storeId) {
            return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
        }

        const updateData: Record<string, number> = {};
        if (priceThreshold !== undefined) updateData.price_threshold = priceThreshold;
        if (quantityThreshold !== undefined) updateData.quantity_threshold = quantityThreshold;

        const { data: store, error: updateError } = await client
            .from('stores')
            .update(updateData)
            .eq('id', storeId)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json(store);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
    }
}
