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
        let authUser: { id: string } | null = null;

        try {
            // 1. Create auth user
            const { data, error } = await adminClient.auth.admin.createUser({
                email: dto.email,
                password: dto.password,
                email_confirm: true,
                user_metadata: { full_name: dto.fullName }
            });

            if (error) {
                // If user already exists, check if it's a "zombie" (no profile)
                if (error.message.includes('already registered') || error.message.includes('already exists')) {
                    // Check if profile exists
                    const { data: profile } = await adminClient
                        .from('users')
                        .select('id')
                        .eq('email', dto.email)
                        .single();

                    if (profile) {
                        throw new Error('User already exists. Please login.');
                    } else {
                        // Zombie account! Delete and retry.
                        // We can't delete by email directly in API easily without listing.
                        // But we can tell the user "Account exists but setup failed. Please contact support" 
                        // or try to recover?
                        // Recovery: If we knew the ID.
                        // Since we don't, we can't easily auto-fix.
                        // But often 'admin.deleteUser' needs ID.

                        // Workaround: Call listUsers (might be slow) or just fail with better message.
                        // Assuming the user is stuck, let's look for the user via listUsers?
                        // adminClient.auth.admin.listUsers() returns a page.

                        // Actually, create user doesn't return ID if it fails.

                        throw new Error('Account exists but incomplete. Please contact support to reset.');
                    }
                }
                throw error;
            }

            if (!data.user) throw new Error('Failed to create user');
            authUser = data.user;

            // 2. Create profile
            const { error: profileError } = await adminClient.from('users').insert({
                id: data.user.id,
                email: dto.email,
                full_name: dto.fullName,
                phone: dto.phone || null,
                role: dto.role || 'customer',
                status: 'active',
            });

            if (profileError) {
                // If profile creation fails, delete the auth user to prevent zombies
                await adminClient.auth.admin.deleteUser(data.user.id);
                throw new Error('Failed to create profile: ' + profileError.message);
            }

        } catch (err) {
            // Re-throw
            throw err;
        }

        // Now sign in the user to get a session
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: dto.email,
            password: dto.password,
        });

        return {
            user: authUser,
            session: loginError ? null : loginData.session,
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
        // Device fingerprint update removed - column not in schema
        /*
        if (dto.deviceFingerprint) {
            await adminClient
                .from('users')
                .update({ device_fingerprint: dto.deviceFingerprint })
                .eq('id', data.user.id);
        }
        */

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
