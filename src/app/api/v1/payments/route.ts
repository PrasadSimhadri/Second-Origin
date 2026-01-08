// ===========================================
// Payments API Routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { PaymentsService } from '@/lib/services/payments.service';
import { authenticateRequest } from '@/lib/middleware/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';

// POST /api/v1/payments - Initiate payment
export async function POST(request: NextRequest) {
    // Rate limit: 60 requests per minute
    const { success, response } = rateLimit(request, RATE_LIMITS.standard);
    if (!success) return response;

    const { user, error } = await authenticateRequest(request, ['customer']);
    if (error) return error;

    try {
        const body = await request.json();
        if (!body.billId) {
            return NextResponse.json({ error: 'billId is required' }, { status: 400 });
        }
        const result = await PaymentsService.initiatePayment(user!.id, body);
        return NextResponse.json(result, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initiate payment';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

