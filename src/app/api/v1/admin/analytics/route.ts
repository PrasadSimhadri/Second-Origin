// ===========================================
// Admin API Routes
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { authenticateRequest } from '@/lib/middleware/auth';

// GET /api/v1/admin/analytics
export async function GET(request: NextRequest) {
    const { user, error } = await authenticateRequest(request, ['admin']);
    if (error) return error;

    const client = getAdminClient();

    try {
        // Get total bills and revenue
        const { data: bills } = await client
            .from('bills')
            .select('id, total_amount, status');

        const totalBills = bills?.length || 0;
        const totalRevenue = bills?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

        // Get flags data
        const { data: flags } = await client
            .from('flags')
            .select(`
                id, reason, status,
                guard:users!flags_guard_id_fkey(id, full_name)
            `);

        const totalFlags = flags?.length || 0;
        const confirmedFlags = flags?.filter(f => f.status === 'confirmed').length || 0;
        const rejectedFlags = flags?.filter(f => f.status === 'rejected').length || 0;

        // Calculate rates
        const shrinkageRate = totalBills > 0 ? ((confirmedFlags / totalBills) * 100).toFixed(1) : 0;
        const falsePositiveRate = totalFlags > 0 ? ((rejectedFlags / totalFlags) * 100).toFixed(1) : 0;

        // Group flags by reason
        const flagsByReason: Record<string, number> = {};
        flags?.forEach(f => {
            flagsByReason[f.reason] = (flagsByReason[f.reason] || 0) + 1;
        });

        // Group flags by guard
        const guardMap = new Map<string, { guardId: string; guardName: string; count: number }>();
        flags?.forEach(f => {
            const guard = f.guard as unknown as { id: string; full_name: string } | null;
            if (guard) {
                const existing = guardMap.get(guard.id);
                if (existing) {
                    existing.count++;
                } else {
                    guardMap.set(guard.id, {
                        guardId: guard.id,
                        guardName: guard.full_name || 'Unknown',
                        count: 1
                    });
                }
            }
        });

        return NextResponse.json({
            totalBills,
            totalRevenue,
            flaggedBillsCount: totalFlags,
            confirmedFlags,
            rejectedFlags,
            shrinkageRate: Number(shrinkageRate),
            falsePositiveRate: Number(falsePositiveRate),
            flagsByReason,
            flagsByGuard: Array.from(guardMap.values())
        });
    } catch (err) {
        console.error('Analytics error:', err);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
