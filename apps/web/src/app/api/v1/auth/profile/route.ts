// ===========================================
// Auth API Routes - Profile
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/v1/auth/profile - Get current user profile
export async function GET(request: NextRequest) {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;

    try {
        const profile = await AuthService.getProfile(user!.id);
        return NextResponse.json(profile);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get profile';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

// PUT /api/v1/auth/profile - Update profile
export async function PUT(request: NextRequest) {
    const { user, error } = await authenticateRequest(request);
    if (error) return error;

    try {
        const body = await request.json();
        const profile = await AuthService.updateProfile(user!.id, body);
        return NextResponse.json(profile);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
