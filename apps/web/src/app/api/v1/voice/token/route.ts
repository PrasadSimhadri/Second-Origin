// ===========================================
// Voice API Routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { VoiceService } from '@/lib/services/voice.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/v1/voice/token - Get LiveKit token
export async function GET(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['guard']);
    if (error) return error;

    try {
        const { searchParams } = new URL(request.url);
        const roomName = searchParams.get('room') || `guard-${user!.id}`;
        const result = await VoiceService.generateToken(user!.id, roomName);
        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate token';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
