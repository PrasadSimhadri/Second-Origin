'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Bill } from '@/lib/api';
import { supabase } from '@/lib/supabase-client';

export default function HistoryPage() {
    const router = useRouter();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            api.setToken(session.access_token);
            loadHistory();
        };
        init();
    }, []);

    const loadHistory = async () => {
        try {
            const data = await api.getMyBills();
            setBills(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-900 text-white p-4 pb-20">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={() => router.push('/scan')} className="text-slate-400">← Back</button>
                <h1 className="text-xl font-bold">Order History</h1>
            </header>

            {loading ? (
                <div className="text-center text-slate-500 py-10">Loading history...</div>
            ) : bills.length === 0 ? (
                <div className="text-center text-slate-500 py-10">No orders found</div>
            ) : (
                <div className="space-y-4">
                    {bills.map(bill => (
                        <div key={bill.id} className="card space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-sm text-slate-400">Bill #{bill.bill_number}</div>
                                    <div className="text-xs text-slate-500">{new Date(bill.created_at).toLocaleDateString()}</div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${bill.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                        bill.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-slate-700 text-slate-300'
                                    }`}>
                                    {bill.status.toUpperCase()}
                                </span>
                            </div>

                            {/* Collapsible items list or always visible summary? 
                                User asked for items list in history. I'll show it. 
                            */}
                            <div className="bg-slate-950/30 rounded p-2 text-sm text-slate-300 space-y-1">
                                {bill.items?.map(item => (
                                    <div key={item.id} className="flex justify-between">
                                        <span>{item.quantity}x {item.product?.name || 'Item'}</span>
                                        <span>₹{item.price_at_time * item.quantity}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between font-bold pt-2 border-t border-slate-800">
                                <span>Total</span>
                                <span>₹{bill.total_amount}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
