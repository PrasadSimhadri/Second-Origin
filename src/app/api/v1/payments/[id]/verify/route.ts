// ===========================================
// Payments API Routes - Verify
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { PaymentsService } from '@/lib/services/payments.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// POST /api/v1/payments/[id]/verify - Verify/Complete payment
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await authenticateRequest(request, ['customer']);
    if (error) return error;

    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const result = await PaymentsService.verifyPayment(user!.id, id, body.razorpayPaymentId);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to verify payment';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
