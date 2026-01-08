// ===========================================
// Bills API Routes - Verify Bill (Guards)
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { BillsService } from '@/lib/services/bills.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// POST /api/v1/bills/[id]/verify - Mark bill as verified
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await authenticateRequest(request, ['guard']);
    if (error) return error;

    try {
        const { id } = await params;
        const result = await BillsService.verifyBill(id, user!.id);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify bill';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
