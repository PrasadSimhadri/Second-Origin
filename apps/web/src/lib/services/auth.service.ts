// ===========================================
// Auth Service - Migrated from NestJS
// ===========================================

import { supabase, getAdminClient, getClientForUser } from '@/lib/supabase';

export interface RegisterDto {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: 'customer' | 'guard' | 'admin';
}

export interface LoginDto {
    email: string;
    password: string;
    deviceFingerprint?: string;
}

export interface UpdateProfileDto {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
}

export class AuthService {
    static async register(dto: RegisterDto) {
        const adminClient = getAdminClient();

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: dto.email,
            password: dto.password,
        });

        if (authError) {
            throw new Error(authError.message);
        }

        if (!authData.user) {
            throw new Error('Failed to create user');
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
            throw new Error('Failed to create user profile');
        }

        return {
            user: authData.user,
            session: authData.session,
            message: 'Registration successful',
        };
    }

    static async login(dto: LoginDto) {
        const adminClient = getAdminClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: dto.email,
            password: dto.password,
        });

        if (error) {
            throw new Error('Invalid credentials');
        }

        // Get user profile
        const { data: profile, error: profileError } = await adminClient
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile) {
            throw new Error('User profile not found');
        }

        // Check if user is blocked
        if (profile.status === 'blocked') {
            throw new Error('Your account has been blocked');
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

    static async refreshToken(refreshToken: string) {
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
        });

        if (error) {
            throw new Error('Invalid refresh token');
        }

        return {
            session: data.session,
            user: data.user,
        };
    }

    static async logout(accessToken: string) {
        const client = getClientForUser(accessToken);
        await client.auth.signOut();
        return { message: 'Logged out successfully' };
    }

    static async getProfile(userId: string) {
        const adminClient = getAdminClient();

        const { data, error } = await adminClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            throw new Error('Profile not found');
        }

        return data;
    }

    static async updateProfile(userId: string, dto: UpdateProfileDto) {
        const adminClient = getAdminClient();

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
            throw new Error('Failed to update profile');
        }

        return data;
    }
}
