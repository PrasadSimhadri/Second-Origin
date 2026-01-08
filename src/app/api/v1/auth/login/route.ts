// ===========================================
// Auth API Routes - Login
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';

// POST /api/v1/auth/login
export async function POST(request: NextRequest) {
    // Rate limit: 10 requests per minute for auth routes
    const { success, response } = rateLimit(request, RATE_LIMITS.auth);
    if (!success) return response;

    try {
        const body = await request.json();
        const { email, password, deviceFingerprint } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const result = await AuthService.login({
            email,
            password,
            deviceFingerprint,
        });

        return NextResponse.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        return NextResponse.json({ error: message }, { status: 401 });
    }
}

