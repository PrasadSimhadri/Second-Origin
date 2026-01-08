// ===========================================
// Rate Limiting Middleware
// ===========================================

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store (for production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
    windowMs: number;    // Time window in milliseconds
    maxRequests: number; // Max requests per window
}

// Default configs for different route types
export const RATE_LIMITS = {
    // Auth routes - stricter to prevent brute force
    auth: { windowMs: 60000, maxRequests: 10 },
    // Voice commands - moderate
    voice: { windowMs: 60000, maxRequests: 30 },
    // Admin routes - relaxed for legitimate admin use
    admin: { windowMs: 60000, maxRequests: 100 },
    // Standard API routes
    standard: { windowMs: 60000, maxRequests: 60 },
    // Public routes (products lookup)
    public: { windowMs: 60000, maxRequests: 120 },
} as const;

export function getClientIdentifier(request: NextRequest): string {
    // Try to get real IP from various headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');

    // Use the first available identifier
    const ip = cfConnectingIp || realIp || forwardedFor?.split(',')[0]?.trim() || 'unknown';

    // Also include authorization header hash for user-based limiting
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
        // Simple hash of token for user identification
        const tokenPart = authHeader.substring(0, 50);
        return `${ip}:${tokenPart}`;
    }

    return ip;
}

export function rateLimit(
    request: NextRequest,
    config: RateLimitConfig = RATE_LIMITS.standard
): { success: boolean; response?: NextResponse } {
    const clientId = getClientIdentifier(request);
    const now = Date.now();
    const key = `${request.nextUrl.pathname}:${clientId}`;

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
        // Create new window
        entry = {
            count: 1,
            resetTime: now + config.windowMs,
        };
        rateLimitStore.set(key, entry);
    } else {
        entry.count++;
    }

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetInSeconds = Math.ceil((entry.resetTime - now) / 1000);

    if (entry.count > config.maxRequests) {
        const response = NextResponse.json(
            {
                error: 'Too many requests',
                message: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
                retryAfter: resetInSeconds,
            },
            { status: 429 }
        );

        // Add rate limit headers
        response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set('X-RateLimit-Reset', entry.resetTime.toString());
        response.headers.set('Retry-After', resetInSeconds.toString());

        return { success: false, response };
    }

    return { success: true };
}

// Helper to add rate limit headers to successful responses
export function addRateLimitHeaders(
    response: NextResponse,
    request: NextRequest,
    config: RateLimitConfig = RATE_LIMITS.standard
): NextResponse {
    const clientId = getClientIdentifier(request);
    const key = `${request.nextUrl.pathname}:${clientId}`;
    const entry = rateLimitStore.get(key);

    if (entry) {
        const remaining = Math.max(0, config.maxRequests - entry.count);
        response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', entry.resetTime.toString());
    }

    return response;
}
