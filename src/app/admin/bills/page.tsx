'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase-client';
import { api, type BillWithDetails } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function BillsPage() {
    const router = useRouter();
    const [bills, setBills] = useState<BillWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        loadBills();
    }, [statusFilter]);

    const loadBills = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/admin/login');
            return;
        }
        api.setToken(session.access_token);
        try {
            const status = statusFilter === 'all' ? undefined : statusFilter;
            const data = await api.getAllBills(status);
            setBills(data);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex w-full">
            <Sidebar />
            <main className="ml-64 flex-1 p-8 bg-slate-900 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-white">Transactions</h1>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['all', 'pending', 'paid', 'verified', 'flagged'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${statusFilter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="text-left p-4 text-slate-400 font-medium">Bill #</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Date</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Customer</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Items</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Amount</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.map((bill) => (
                                <tr key={bill.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                                    <td className="p-4 font-mono text-slate-300">{bill.bill_number}</td>
                                    <td className="p-4 text-slate-400">{new Date(bill.created_at).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <div className="font-medium text-white">{bill.customer?.full_name || 'N/A'}</div>
                                        <div className="text-xs text-slate-500">{bill.customer?.email || ''}</div>
                                    </td>
                                    <td className="p-4 text-slate-300">{bill.total_items}</td>
                                    <td className="p-4 font-medium text-white">₹{bill.total_amount.toFixed(2)}</td>
                                    <td className="p-4">
                                        <StatusBadge status={bill.status} />
                                    </td>
                                </tr>
                            ))}
                            {bills.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-slate-500">
                                        {loading ? 'Loading...' : 'No transactions found'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        paid: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        verified: 'bg-green-500/20 text-green-400 border-green-500/30',
        flagged: 'bg-red-500/20 text-red-400 border-red-500/30',
        disputed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase border ${styles[status] || 'bg-slate-700 text-slate-300'}`}>
            {status}
        </span>
    );
}
