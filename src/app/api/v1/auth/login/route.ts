// ===========================================
// Auth API Routes - Login
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

// POST /api/v1/auth/login
export async function POST(request: NextRequest) {
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
