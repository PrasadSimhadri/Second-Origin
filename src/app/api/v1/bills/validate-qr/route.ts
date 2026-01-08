// ===========================================
// Bills API Routes - QR Validation (Guards)
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { BillsService } from '@/lib/services/bills.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// POST /api/v1/bills/validate-qr - Validate QR code
export async function POST(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['guard', 'admin']);
    if (error) return error;

    try {
        const body = await request.json();
        if (!body.qrData) {
            return NextResponse.json({ error: 'qrData is required' }, { status: 400 });
        }

        const result = await BillsService.validateQR(body.qrData);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Validation failed';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
