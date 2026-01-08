// ===========================================
// Bills API Routes - Items
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { BillsService } from '@/lib/services/bills.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// POST /api/v1/bills/[id]/items - Add item to bill
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await authenticateRequest(request, ['customer']);
    if (error) return error;

    try {
        const { id } = await params;
        const body = await request.json();

        if (!body.productId || !body.quantity) {
            return NextResponse.json(
                { error: 'productId and quantity are required' },
                { status: 400 }
            );
        }

        const result = await BillsService.addItem(id, user!.id, body);
        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add item';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
