// ===========================================
// Bills API Routes - QR Code Generation
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { BillsService } from '@/lib/services/bills.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// POST /api/v1/bills/[id]/qr - Generate QR code for bill
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await authenticateRequest(request, ['customer']);
    if (error) return error;

    try {
        const { id } = await params;
        const result = await BillsService.generateQR(id, user!.id);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate QR';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
