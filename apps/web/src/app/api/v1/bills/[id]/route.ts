// ===========================================
// Bills API Routes - By ID
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { BillsService } from '@/lib/services/bills.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/v1/bills/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;

    try {
        const { id } = await params;
        const bill = await BillsService.findById(id, user!.id, user!.role);
        return NextResponse.json(bill);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Bill not found';
        return NextResponse.json({ error: message }, { status: 404 });
    }
}
