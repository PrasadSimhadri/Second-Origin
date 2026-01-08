'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api, type Bill } from '@/lib/api';

export default function HistoryPage() {
    const router = useRouter();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        loadBills();
    }, [filter]);

    const loadBills = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        api.setToken(session.access_token);

        try {
            const status = filter === 'all' ? undefined : filter;
            const billsList = await api.getMyBills(status);
            setBills(billsList);
        } catch (error) {
            console.error('Failed to load bills:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'text-green-400 bg-green-400/10';
            case 'paid': return 'text-blue-400 bg-blue-400/10';
            case 'pending': return 'text-yellow-400 bg-yellow-400/10';
            case 'flagged': return 'text-red-400 bg-red-400/10';
            case 'disputed': return 'text-purple-400 bg-purple-400/10';
            default: return 'text-slate-400 bg-slate-400/10';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <main className="min-h-screen flex flex-col p-6">
            {/* Header */}
            <div className="flex items-center mb-6">
                <button
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white mr-4"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold">Bill History</h1>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['all', 'pending', 'paid', 'verified', 'flagged'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${filter === status
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Bills List */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse">Loading...</div>
                </div>
            ) : bills.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-slate-400">No bills found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bills.map((bill) => (
                        <div
                            key={bill.id}
                            onClick={() => {
                                if (bill.status === 'paid') {
                                    router.push(`/checkout/${bill.id}`);
                                }
                            }}
                            className="card cursor-pointer hover:border-slate-600 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-mono text-sm text-slate-400">{bill.bill_number}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                                    {bill.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-semibold text-lg">₹{bill.total_amount.toFixed(2)}</div>
                                    <div className="text-sm text-slate-400">{bill.total_items} items</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-400">{formatDate(bill.created_at)}</div>
                                </div>
                            </div>

                            {bill.status === 'flagged' && (
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/dispute/${bill.id}`);
                                        }}
                                        className="text-sm text-blue-400 hover:underline"
                                    >
                                        Raise Dispute →
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
