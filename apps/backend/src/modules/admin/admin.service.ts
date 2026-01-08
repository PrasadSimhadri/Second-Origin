// ===========================================
// Admin Service
// ===========================================

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';

export class UpdateThresholdsDto {
    storeId: string;
    priceThreshold?: number;
    quantityThreshold?: number;
}

export class ResolveFlagDto {
    action: 'confirm' | 'reject';
    notes?: string;
}

export class ResolveContradictionDto {
    action: 'accept' | 'reject';
    notes?: string;
}

export class UserActionDto {
    action: 'block' | 'unblock';
    reason?: string;
}

@Injectable()
export class AdminService {
    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Get all stores with thresholds
     */
    async getStores() {
        const client = this.supabaseService.getAdminClient();

        const { data, error } = await client
            .from('stores')
            .select('*')
            .order('name');

        if (error) {
            throw new BadRequestException('Failed to fetch stores');
        }

        return data;
    }

    /**
     * Update store thresholds
     */
    async updateThresholds(adminId: string, dto: UpdateThresholdsDto) {
        const client = this.supabaseService.getAdminClient();

        const updates: Record<string, number> = {};
        if (dto.priceThreshold !== undefined) updates.price_threshold = dto.priceThreshold;
        if (dto.quantityThreshold !== undefined) updates.quantity_threshold = dto.quantityThreshold;

        const { data: store, error } = await client
            .from('stores')
            .update(updates)
            .eq('id', dto.storeId)
            .select()
            .single();

        if (error) {
            throw new BadRequestException('Failed to update thresholds');
        }

        // Log admin action
        await client.from('admin_actions').insert({
            admin_id: adminId,
            action_type: 'threshold_updated',
            target_type: 'store',
            target_id: dto.storeId,
            details: updates,
        });

        return store;
    }

    /**
     * Resolve a flag
     */
    async resolveFlag(adminId: string, flagId: string, dto: ResolveFlagDto) {
        const client = this.supabaseService.getAdminClient();

        const status = dto.action === 'confirm' ? 'confirmed' : 'rejected';

        const { data: flag, error } = await client
            .from('flags')
            .update({
                status,
                resolved_by: adminId,
                resolved_at: new Date().toISOString(),
                resolution_notes: dto.notes,
            })
            .eq('id', flagId)
            .select(`*, bill:bills(*)`)
            .single();

        if (error || !flag) {
            throw new NotFoundException('Flag not found');
        }

        // If confirmed, increment customer's flag count and check for block
        if (dto.action === 'confirm') {
            const { data: customer } = await client
                .from('users')
                .select('*')
                .eq('id', flag.bill.customer_id)
                .single();

            if (customer) {
                const newCount = (customer.confirmed_flags_count || 0) + 1;
                const newStatus = newCount >= 3 ? 'blocked' : customer.status;

                await client
                    .from('users')
                    .update({
                        confirmed_flags_count: newCount,
                        status: newStatus,
                    })
                    .eq('id', customer.id);

                if (newStatus === 'blocked') {
                    await client.from('admin_actions').insert({
                        admin_id: adminId,
                        action_type: 'user_blocked',
                        target_type: 'user',
                        target_id: customer.id,
                        details: { reason: 'Auto-blocked after 3 confirmed flags' },
                    });
                }
            }
        }

        // Update bill status
        await client
            .from('bills')
            .update({ status: dto.action === 'confirm' ? 'flagged' : 'verified' })
            .eq('id', flag.bill_id);

        // Log admin action
        await client.from('admin_actions').insert({
            admin_id: adminId,
            action_type: dto.action === 'confirm' ? 'flag_confirmed' : 'flag_rejected',
            target_type: 'flag',
            target_id: flagId,
            details: { notes: dto.notes },
        });

        return flag;
    }

    /**
     * Resolve a contradiction
     */
    async resolveContradiction(adminId: string, contradictionId: string, dto: ResolveContradictionDto) {
        const client = this.supabaseService.getAdminClient();

        const status = dto.action === 'accept' ? 'accepted' : 'rejected';

        const { data: contradiction, error } = await client
            .from('contradictions')
            .update({
                status,
                resolved_by: adminId,
                resolved_at: new Date().toISOString(),
                resolution_notes: dto.notes,
            })
            .eq('id', contradictionId)
            .select(`*, flag:flags(*)`)
            .single();

        if (error || !contradiction) {
            throw new NotFoundException('Contradiction not found');
        }

        // If accepted, reject the related flag
        if (dto.action === 'accept') {
            await client
                .from('flags')
                .update({
                    status: 'rejected',
                    resolved_by: adminId,
                    resolved_at: new Date().toISOString(),
                    resolution_notes: 'Rejected due to accepted customer contradiction',
                })
                .eq('id', contradiction.flag_id);

            // Update bill status back to verified
            await client
                .from('bills')
                .update({ status: 'verified' })
                .eq('id', contradiction.flag.bill_id);
        } else {
            // Rejection means flag is confirmed
            await this.resolveFlag(adminId, contradiction.flag_id, {
                action: 'confirm',
                notes: 'Confirmed after customer contradiction was rejected',
            });
        }

        // Log admin action
        await client.from('admin_actions').insert({
            admin_id: adminId,
            action_type: dto.action === 'accept' ? 'contradiction_accepted' : 'contradiction_rejected',
            target_type: 'contradiction',
            target_id: contradictionId,
            details: { notes: dto.notes },
        });

        return contradiction;
    }

    /**
     * Block or unblock a user
     */
    async updateUserStatus(adminId: string, userId: string, dto: UserActionDto) {
        const client = this.supabaseService.getAdminClient();

        const status = dto.action === 'block' ? 'blocked' : 'active';

        const { data: user, error } = await client
            .from('users')
            .update({ status })
            .eq('id', userId)
            .select()
            .single();

        if (error || !user) {
            throw new NotFoundException('User not found');
        }

        // Log admin action
        await client.from('admin_actions').insert({
            admin_id: adminId,
            action_type: dto.action === 'block' ? 'user_blocked' : 'user_unblocked',
            target_type: 'user',
            target_id: userId,
            details: { reason: dto.reason },
        });

        return user;
    }

    /**
     * Get analytics data
     */
    async getAnalytics(storeId?: string) {
        const client = this.supabaseService.getAdminClient();

        // Total bills
        let billsQuery = client.from('bills').select('*', { count: 'exact' });
        if (storeId) billsQuery = billsQuery.eq('store_id', storeId);
        const { count: totalBills } = await billsQuery;

        // Total revenue
        let revenueQuery = client.from('bills').select('total_amount').eq('status', 'verified');
        if (storeId) revenueQuery = revenueQuery.eq('store_id', storeId);
        const { data: revenueData } = await revenueQuery;
        const totalRevenue = revenueData?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

        // Flagged bills
        let flagsQuery = client.from('flags').select('*', { count: 'exact' });
        const { count: flaggedBillsCount } = await flagsQuery;

        // Confirmed flags
        const { count: confirmedFlags } = await client
            .from('flags')
            .select('*', { count: 'exact' })
            .eq('status', 'confirmed');

        // Rejected flags (false positives)
        const { count: rejectedFlags } = await client
            .from('flags')
            .select('*', { count: 'exact' })
            .eq('status', 'rejected');

        // Calculate rates
        const shrinkageRate = totalBills ? ((confirmedFlags || 0) / totalBills) * 100 : 0;
        const falsePositiveRate = flaggedBillsCount
            ? ((rejectedFlags || 0) / flaggedBillsCount) * 100
            : 0;

        // Flags by reason
        const { data: flagsByReasonData } = await client
            .from('flags')
            .select('reason');

        const flagsByReason: Record<string, number> = {};
        flagsByReasonData?.forEach(f => {
            flagsByReason[f.reason] = (flagsByReason[f.reason] || 0) + 1;
        });

        // Flags by guard
        const { data: flagsByGuardData } = await client
            .from('flags')
            .select(`guard_id, guard:users(full_name)`);

        const flagsByGuardMap: Record<string, { name: string; count: number }> = {};
        flagsByGuardData?.forEach((f: any) => {
            if (!flagsByGuardMap[f.guard_id]) {
                flagsByGuardMap[f.guard_id] = { name: f.guard?.full_name || 'Unknown', count: 0 };
            }
            flagsByGuardMap[f.guard_id].count++;
        });

        const flagsByGuard = Object.entries(flagsByGuardMap).map(([guardId, data]) => ({
            guardId,
            guardName: data.name,
            count: data.count,
        }));

        return {
            totalBills: totalBills || 0,
            totalRevenue,
            flaggedBillsCount: flaggedBillsCount || 0,
            confirmedFlags: confirmedFlags || 0,
            rejectedFlags: rejectedFlags || 0,
            shrinkageRate: Math.round(shrinkageRate * 100) / 100,
            falsePositiveRate: Math.round(falsePositiveRate * 100) / 100,
            flagsByReason,
            flagsByGuard,
        };
    }

    /**
     * Get all users
     */
    async getUsers(role?: string) {
        const client = this.supabaseService.getAdminClient();

        let query = client
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (role) {
            query = query.eq('role', role);
        }

        const { data, error } = await query;

        if (error) {
            throw new BadRequestException('Failed to fetch users');
        }

        return data;
    }

    /**
     * Get all bills (admin view)
     */
    async getAllBills(status?: string, storeId?: string) {
        const client = this.supabaseService.getAdminClient();

        let query = client
            .from('bills')
            .select(`
        *,
        customer:users(id, full_name, email),
        store:stores(name, code)
      `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (status) query = query.eq('status', status);
        if (storeId) query = query.eq('store_id', storeId);

        const { data, error } = await query;

        if (error) {
            throw new BadRequestException('Failed to fetch bills');
        }

        return data;
    }

    /**
     * Get audit logs
     */
    async getAuditLogs(limit = 100) {
        const client = this.supabaseService.getAdminClient();

        const { data, error } = await client
            .from('admin_actions')
            .select(`*, admin:users(full_name)`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            throw new BadRequestException('Failed to fetch audit logs');
        }

        return data;
    }
}
