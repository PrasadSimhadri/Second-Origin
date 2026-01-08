// ===========================================
// Auth API Routes - Register, Login
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

// POST /api/v1/auth/register
export async function POST(request: NextRequest) {
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
        const message = error instanceof Error ? error.message : 'Registration failed';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
