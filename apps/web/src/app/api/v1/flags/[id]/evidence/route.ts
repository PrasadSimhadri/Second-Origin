// ===========================================
// Flags API Routes - Evidence
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { FlagsService } from '@/lib/services/flags.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// POST /api/v1/flags/[id]/evidence - Add evidence to flag
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { user, error } = await authenticateRequest(request, ['guard']);
    if (error) return error;

    try {
        const { id } = await params;
        const body = await request.json();
        if (!body.imageData) {
            return NextResponse.json({ error: 'imageData is required' }, { status: 400 });
        }
        const result = await FlagsService.addEvidence(user!.id, id, body.imageData);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add evidence';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
