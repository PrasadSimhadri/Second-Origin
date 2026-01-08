// ===========================================
// Auth Service
// ===========================================

import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Register a new user
     */
    async register(dto: RegisterDto) {
        const supabase = this.supabaseService.getClient();
        const adminClient = this.supabaseService.getAdminClient();

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: dto.email,
            password: dto.password,
        });

        if (authError) {
            throw new BadRequestException(authError.message);
        }

        if (!authData.user) {
            throw new BadRequestException('Failed to create user');
        }

        // Create user profile
        const { error: profileError } = await adminClient.from('users').insert({
            id: authData.user.id,
            email: dto.email,
            full_name: dto.fullName,
            phone: dto.phone || null,
            role: dto.role || 'customer',
            status: 'active',
        });

        if (profileError) {
            // Cleanup: delete auth user if profile creation fails
            await adminClient.auth.admin.deleteUser(authData.user.id);
            throw new BadRequestException('Failed to create user profile');
        }

        return {
            user: authData.user,
            session: authData.session,
            message: 'Registration successful',
        };
    }

    /**
     * Login user
     */
    async login(dto: LoginDto) {
        const supabase = this.supabaseService.getClient();
        const adminClient = this.supabaseService.getAdminClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: dto.email,
            password: dto.password,
        });

        if (error) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Get user profile
        const { data: profile, error: profileError } = await adminClient
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile) {
            throw new UnauthorizedException('User profile not found');
        }

        // Check if user is blocked
        if (profile.status === 'blocked') {
            throw new UnauthorizedException('Your account has been blocked');
        }

        // Update device fingerprint if provided
        if (dto.deviceFingerprint) {
            await adminClient
                .from('users')
                .update({ device_fingerprint: dto.deviceFingerprint })
                .eq('id', data.user.id);
        }

        return {
            user: data.user,
            profile,
            session: data.session,
        };
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string) {
        const supabase = this.supabaseService.getClient();

        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });

        if (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        return {
            session: data.session,
            user: data.user,
        };
    }

    /**
     * Logout user
     */
    async logout(accessToken: string) {
        const supabase = this.supabaseService.getClientForUser(accessToken);

        await supabase.auth.signOut();

        return { message: 'Logged out successfully' };
    }

    /**
     * Get current user profile
     */
    async getProfile(userId: string) {
        const adminClient = this.supabaseService.getAdminClient();

        const { data, error } = await adminClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            throw new BadRequestException('Profile not found');
        }

        return data;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const adminClient = this.supabaseService.getAdminClient();

        const updates: Record<string, unknown> = {};
        if (dto.fullName) updates.full_name = dto.fullName;
        if (dto.phone) updates.phone = dto.phone;
        if (dto.avatarUrl) updates.avatar_url = dto.avatarUrl;

        const { data, error } = await adminClient
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw new BadRequestException('Failed to update profile');
        }

        return data;
    }
}
