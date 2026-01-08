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
            router.push('/login');
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
            <main className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-slate-900">Transactions</h1>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['all', 'pending', 'paid', 'verified', 'flagged', 'disputed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${statusFilter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Bill #</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bills.map((bill) => (
                                    <tr key={bill.id} className="hover:bg-slate-50">
                                        <td className="font-mono text-slate-600">{bill.bill_number}</td>
                                        <td>{new Date(bill.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="font-medium text-slate-900">{bill.customer?.full_name || 'N/A'}</div>
                                            <div className="text-xs text-slate-500">{bill.customer?.email || ''}</div>
                                        </td>
                                        <td>{bill.total_items}</td>
                                        <td className="font-medium">₹{bill.total_amount.toFixed(2)}</td>
                                        <td>
                                            <StatusBadge status={bill.status} />
                                        </td>
                                    </tr>
                                ))}
                                {bills.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-slate-500">
                                            No transactions found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        paid: 'bg-blue-100 text-blue-800',
        verified: 'bg-green-100 text-green-800',
        flagged: 'bg-red-100 text-red-800',
        disputed: 'bg-purple-100 text-purple-800',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${styles[status] || 'bg-slate-100 text-slate-800'}`}>
            {status}
        </span>
    );
}
