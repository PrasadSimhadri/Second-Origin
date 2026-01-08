// ===========================================
// Contradictions Service
// ===========================================

import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

export class CreateContradictionDto {
    flagId: string;
    reason: string;
    description?: string;
}

@Injectable()
export class ContradictionsService {
    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Create a contradiction (customer disputing a flag)
     */
    async create(customerId: string, dto: CreateContradictionDto) {
        const client = this.supabaseService.getAdminClient();

        // Get flag and verify customer owns the bill
        const { data: flag, error: flagError } = await client
            .from('flags')
            .select(`*, bill:bills(*)`)
            .eq('id', dto.flagId)
            .single();

        if (flagError || !flag) {
            throw new NotFoundException('Flag not found');
        }

        if (flag.bill.customer_id !== customerId) {
            throw new ForbiddenException('You can only dispute flags on your own bills');
        }

        if (flag.status !== 'pending' && flag.status !== 'confirmed') {
            throw new BadRequestException('This flag cannot be disputed');
        }

        // Check if contradiction already exists
        const { data: existing } = await client
            .from('contradictions')
            .select('*')
            .eq('flag_id', dto.flagId)
            .eq('customer_id', customerId)
            .single();

        if (existing) {
            throw new BadRequestException('You have already disputed this flag');
        }

        // Create contradiction
        const { data: contradiction, error } = await client
            .from('contradictions')
            .insert({
                flag_id: dto.flagId,
                customer_id: customerId,
                reason: dto.reason,
                description: dto.description,
                status: 'pending',
            })
            .select()
            .single();

        if (error) {
            throw new BadRequestException('Failed to create contradiction');
        }

        // Update flag status to under_review
        await client
            .from('flags')
            .update({ status: 'under_review' })
            .eq('id', dto.flagId);

        // Update bill status to disputed
        await client
            .from('bills')
            .update({ status: 'disputed' })
            .eq('id', flag.bill_id);

        return contradiction;
    }

    /**
     * Get customer's contradictions
     */
    async getByCustomer(customerId: string) {
        const client = this.supabaseService.getAdminClient();

        const { data, error } = await client
            .from('contradictions')
            .select(`
        *,
        flag:flags(*, bill:bills(*), guard:users(id, full_name))
      `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new BadRequestException('Failed to fetch contradictions');
        }

        return data;
    }

    /**
     * Get contradiction by ID
     */
    async findById(contradictionId: string) {
        const client = this.supabaseService.getAdminClient();

        const { data, error } = await client
            .from('contradictions')
            .select(`
        *,
        flag:flags(*, bill:bills(*, store:stores(*)), guard:users(id, full_name)),
        customer:users(id, full_name, email)
      `)
            .eq('id', contradictionId)
            .single();

        if (error || !data) {
            throw new NotFoundException('Contradiction not found');
        }

        return data;
    }

    /**
     * Get all pending contradictions (admin)
     */
    async getAllPending() {
        const client = this.supabaseService.getAdminClient();

        const { data, error } = await client
            .from('contradictions')
            .select(`
        *,
        flag:flags(*, bill:bills(*), guard:users(id, full_name)),
        customer:users(id, full_name, email)
      `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            throw new BadRequestException('Failed to fetch contradictions');
        }

        return data;
    }
}
