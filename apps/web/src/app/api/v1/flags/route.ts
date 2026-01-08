// ===========================================
// Flags API Routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { FlagsService } from '@/lib/services/flags.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/v1/flags - Get guard's flags
export async function GET(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['guard', 'admin']);
    if (error) return error;

    try {
        if (user!.role === 'admin') {
            const flags = await FlagsService.getAllPending();
            return NextResponse.json(flags);
        }
        const flags = await FlagsService.getByGuard(user!.id);
        return NextResponse.json(flags);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch flags';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

// POST /api/v1/flags - Create a flag
export async function POST(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['guard']);
    if (error) return error;

    try {
        const body = await request.json();
        if (!body.billId || !body.reason) {
            return NextResponse.json(
                { error: 'billId and reason are required' },
                { status: 400 }
            );
        }
        const flag = await FlagsService.create(user!.id, body);
        return NextResponse.json(flag, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create flag';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
