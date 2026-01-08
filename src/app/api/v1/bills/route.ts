// ===========================================
// Bills API Routes - Main routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { BillsService } from '@/lib/services/bills.service';
import { authenticateRequest } from '@/lib/middleware/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';

// GET /api/v1/bills - Get current user's bills
export async function GET(request: NextRequest) {
    const { success, response } = rateLimit(request, RATE_LIMITS.standard);
    if (!success) return response;
    const { user, error } = await authenticateRequest(request, ['customer']);
    if (error) return error;

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || undefined;
        const bills = await BillsService.findByUser(user!.id, status);
        return NextResponse.json(bills);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch bills';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

// POST /api/v1/bills - Create a new bill
export async function POST(request: NextRequest) {
    const { success, response } = rateLimit(request, RATE_LIMITS.standard);
    if (!success) return response;

    const { user, error } = await authenticateRequest(request, ['customer']);
    if (error) return error;

    try {
        const body = await request.json();
        if (!body.storeId) {
            return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
        }
        const bill = await BillsService.create(user!.id, body);
        return NextResponse.json(bill, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create bill';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
