// ===========================================
// Bills API Routes - Item by ID (update/delete)
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { BillsService } from '@/lib/services/bills.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// PUT /api/v1/bills/[id]/items/[itemId] - Update item quantity
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    const { user, error } = await authenticateRequest(request, ['customer']);
    if (error) return error;

    try {
        const { id, itemId } = await params;
        const body = await request.json();

        if (body.quantity === undefined) {
            return NextResponse.json({ error: 'quantity is required' }, { status: 400 });
        }

        const result = await BillsService.updateItem(id, itemId, user!.id, body);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update item';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

// DELETE /api/v1/bills/[id]/items/[itemId] - Remove item
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    const { user, error } = await authenticateRequest(request, ['customer']);
    if (error) return error;

    try {
        const { id, itemId } = await params;
        const result = await BillsService.removeItem(id, itemId, user!.id);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove item';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
