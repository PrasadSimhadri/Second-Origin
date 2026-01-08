// ===========================================
// JWT Authentication Guard
// ===========================================

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if route is marked as public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Missing or invalid authorization header');
        }

        const token = authHeader.substring(7);

        try {
            // Verify token with Supabase
            const supabase = this.supabaseService.getClient();
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error || !user) {
                throw new UnauthorizedException('Invalid or expired token');
            }

            // Get user profile from our users table
            const adminClient = this.supabaseService.getAdminClient();
            const { data: profile, error: profileError } = await adminClient
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError || !profile) {
                throw new UnauthorizedException('User profile not found');
            }

            // Check if user is blocked
            if (profile.status === 'blocked') {
                throw new UnauthorizedException('Your account has been blocked. Please contact support.');
            }

            // Attach user and profile to request
            request.user = user;
            request.userProfile = profile;
            request.accessToken = token;

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException('Authentication failed');
        }
    }
}
