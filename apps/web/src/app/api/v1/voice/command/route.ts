// ===========================================
// Voice API Routes - Command Processing
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { VoiceService, ConversationState } from '@/lib/services/voice.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// POST /api/v1/voice/command - Process voice command
export async function POST(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['guard']);
    if (error) return error;

    try {
        const body = await request.json();
        const { text, billId, state: clientState } = body;

        if (!text) {
            return NextResponse.json({ error: 'text is required' }, { status: 400 });
        }

        // Parse command from text
        const command = VoiceService.parseCommand(text);

        // Use state from client or create empty state
        const state: ConversationState = clientState || {};

        // Process command
        const result = await VoiceService.processCommand(user!.id, command, state, billId);

        return NextResponse.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process command';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
