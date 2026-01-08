// ===========================================
// Flags Service - Migrated from NestJS
// ===========================================

import { getAdminClient } from '@/lib/supabase';

export type FlagReason = 'item_mismatch' | 'quantity_mismatch' | 'suspected_theft' | 'invalid_qr' | 'other';

export interface CreateFlagDto {
    billId: string;
    reason: FlagReason;
    description?: string;
}

export class FlagsService {
    static async create(guardId: string, dto: CreateFlagDto) {
        const client = getAdminClient();

        // Verify bill exists
        const { data: bill, error: billError } = await client
            .from('bills')
            .select('*')
            .eq('id', dto.billId)
            .single();

        if (billError || !bill) {
            throw new Error('Bill not found');
        }

        // Create flag
        const { data: flag, error } = await client
            .from('flags')
            .insert({
                bill_id: dto.billId,
                guard_id: guardId,
                reason: dto.reason,
                description: dto.description,
                status: 'pending',
            })
            .select()
            .single();

        if (error) {
            throw new Error('Failed to create flag');
        }

        // Update bill status
        await client
            .from('bills')
            .update({ status: 'flagged' })
            .eq('id', dto.billId);

        return flag;
    }

    static async addEvidence(guardId: string, flagId: string, imageData: string) {
        const client = getAdminClient();

        // Verify flag
        const { data: flag, error: flagError } = await client
            .from('flags')
            .select('*')
            .eq('id', flagId)
            .eq('guard_id', guardId)
            .single();

        if (flagError || !flag) {
            throw new Error('Flag not found');
        }

        // Decode base64 and upload
        const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid image data');
        }

        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = contentType.split('/')[1] || 'jpg';
        const fileName = `${flagId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await client.storage
            .from('evidence')
            .upload(fileName, buffer, { contentType });

        if (uploadError) {
            throw new Error('Failed to upload evidence');
        }

        const { data: urlData } = client.storage
            .from('evidence')
            .getPublicUrl(fileName);

        const evidenceUrls = [...(flag.evidence_urls || []), urlData.publicUrl];

        await client
            .from('flags')
            .update({ evidence_urls: evidenceUrls })
            .eq('id', flagId);

        return { success: true, url: urlData.publicUrl };
    }

    static async getByGuard(guardId: string) {
        const client = getAdminClient();

        const { data, error } = await client
            .from('flags')
            .select(`
                *,
                bill:bills(*, customer:users(id, full_name, email))
            `)
            .eq('guard_id', guardId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error('Failed to fetch flags');
        }

        return data;
    }

    static async findById(flagId: string) {
        const client = getAdminClient();

        const { data, error } = await client
            .from('flags')
            .select(`
                *,
                bill:bills(*, customer:users(id, full_name, email), store:stores(*)),
                guard:users(id, full_name)
            `)
            .eq('id', flagId)
            .single();

        if (error || !data) {
            throw new Error('Flag not found');
        }

        return data;
    }

    static async getAllPending() {
        const client = getAdminClient();

        const { data, error } = await client
            .from('flags')
            .select(`
                *,
                bill:bills(*, customer:users(id, full_name, email)),
                guard:users(id, full_name)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error('Failed to fetch flags');
        }

        return data;
    }
}
