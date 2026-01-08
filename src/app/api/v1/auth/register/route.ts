// ===========================================
// Auth API Routes - Register
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { rateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit';

// POST /api/v1/auth/register
export async function POST(request: NextRequest) {
    // Rate limit: 10 requests per minute for auth routes
    const { success, response } = rateLimit(request, RATE_LIMITS.auth);
    if (!success) return response;

    try {
        const body = await request.json();
        const { email, password, fullName, phone, role } = body;

        if (!email || !password || !fullName) {
            return NextResponse.json(
                { error: 'Email, password, and fullName are required' },
                { status: 400 }
            );
        }

        const result = await AuthService.register({
            email,
            password,
            fullName,
            phone,
            role,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Registration error:', error);
        const message = error instanceof Error ? error.message : 'Registration failed';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

