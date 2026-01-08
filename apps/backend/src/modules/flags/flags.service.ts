// ===========================================
// Flags Service
// ===========================================

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

export type FlagReason = 'item_mismatch' | 'quantity_mismatch' | 'suspected_theft' | 'invalid_qr' | 'other';

export class CreateFlagDto {
    billId: string;
    reason: FlagReason;
    description?: string;
}

@Injectable()
export class FlagsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Create a flag
     */
    async create(guardId: string, dto: CreateFlagDto) {
        const client = this.supabaseService.getAdminClient();

        // Verify bill exists
        const { data: bill, error: billError } = await client
            .from('bills')
            .select('*')
            .eq('id', dto.billId)
            .single();

        if (billError || !bill) {
            throw new NotFoundException('Bill not found');
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
            throw new BadRequestException('Failed to create flag');
        }

        // Update bill status
        await client
            .from('bills')
            .update({ status: 'flagged' })
            .eq('id', dto.billId);

        return flag;
    }

    /**
     * Upload evidence for a flag
     */
    async uploadEvidence(guardId: string, flagId: string, file: Express.Multer.File) {
        const client = this.supabaseService.getAdminClient();

        // Verify flag exists and belongs to guard
        const { data: flag, error: flagError } = await client
            .from('flags')
            .select('*')
            .eq('id', flagId)
            .eq('guard_id', guardId)
            .single();

        if (flagError || !flag) {
            throw new NotFoundException('Flag not found');
        }

        // Upload to Supabase Storage
        const fileName = `${flagId}/${Date.now()}_${file.originalname}`;
        const { data: uploadData, error: uploadError } = await client.storage
            .from('evidence')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
            });

        if (uploadError) {
            throw new BadRequestException('Failed to upload evidence');
        }

        // Get public URL
        const { data: urlData } = client.storage
            .from('evidence')
            .getPublicUrl(fileName);

        // Update flag with evidence URL
        const evidenceUrls = [...(flag.evidence_urls || []), urlData.publicUrl];

        const { data: updatedFlag, error: updateError } = await client
            .from('flags')
            .update({ evidence_urls: evidenceUrls })
            .eq('id', flagId)
            .select()
            .single();

        if (updateError) {
            throw new BadRequestException('Failed to update flag');
        }

        return { flag: updatedFlag, uploadedUrl: urlData.publicUrl };
    }

    /**
     * Add evidence URL directly (for base64 encoded images)
     */
    async addEvidenceUrl(guardId: string, flagId: string, imageData: string) {
        const client = this.supabaseService.getAdminClient();

        // Verify flag
        const { data: flag, error: flagError } = await client
            .from('flags')
            .select('*')
            .eq('id', flagId)
            .eq('guard_id', guardId)
            .single();

        if (flagError || !flag) {
            throw new NotFoundException('Flag not found');
        }

        // Decode base64 and upload
        const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches) {
            throw new BadRequestException('Invalid image data');
        }

        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = contentType.split('/')[1] || 'jpg';
        const fileName = `${flagId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await client.storage
            .from('evidence')
            .upload(fileName, buffer, { contentType });

        if (uploadError) {
            throw new BadRequestException('Failed to upload evidence');
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

    /**
     * Get guard's flags
     */
    async getByGuard(guardId: string) {
        const client = this.supabaseService.getAdminClient();

        const { data, error } = await client
            .from('flags')
            .select(`
        *,
        bill:bills(*, customer:users(id, full_name, email))
      `)
            .eq('guard_id', guardId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new BadRequestException('Failed to fetch flags');
        }

        return data;
    }

    /**
     * Get flag by ID
     */
    async findById(flagId: string) {
        const client = this.supabaseService.getAdminClient();

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
            throw new NotFoundException('Flag not found');
        }

        return data;
    }

    /**
     * Get all pending flags (admin)
     */
    async getAllPending() {
        const client = this.supabaseService.getAdminClient();

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
            throw new BadRequestException('Failed to fetch flags');
        }

        return data;
    }
}
