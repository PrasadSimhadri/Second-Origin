'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase-client';
import { api, type Store } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function ThresholdsPage() {
    const router = useRouter();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ price: 0, quantity: 0 });

    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/admin/login');
            return;
        }
        api.setToken(session.access_token);
        try {
            const data = await api.getStores();
            setStores(data);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (store: Store) => {
        setEditingId(store.id);
        setEditForm({
            price: store.price_threshold,
            quantity: store.quantity_threshold
        });
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await api.updateThresholds(editingId, editForm.price, editForm.quantity);
            await loadStores();
            setEditingId(null);
        } catch (error) {
            alert('Failed to update');
        }
    };

    if (loading) return <div className="ml-64 p-8 bg-slate-900 min-h-screen text-slate-300">Loading...</div>;

    return (
        <div className="flex w-full">
            <Sidebar />
            <main className="ml-64 flex-1 p-8 bg-slate-900 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-white">Store Configuration</h1>

                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="text-left p-4 text-slate-400 font-medium">Store Name</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Code</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Price Threshold</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Quantity Threshold</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stores.map((store) => (
                                <tr key={store.id} className="border-t border-slate-700">
                                    <td className="p-4 font-medium text-white">{store.name}</td>
                                    <td className="p-4 font-mono text-slate-400">{store.code}</td>
                                    <td className="p-4">
                                        {editingId === store.id ? (
                                            <input
                                                type="number"
                                                value={editForm.price}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                                className="w-32 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-blue-500 outline-none"
                                            />
                                        ) : (
                                            <span className="text-white">₹{store.price_threshold}</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {editingId === store.id ? (
                                            <input
                                                type="number"
                                                value={editForm.quantity}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                                className="w-32 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-blue-500 outline-none"
                                            />
                                        ) : (
                                            <span className="text-white">{store.quantity_threshold}</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {editingId === store.id ? (
                                            <div className="flex gap-2">
                                                <button onClick={saveEdit} className="text-green-400 hover:text-green-300 font-medium">Save</button>
                                                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-300">Cancel</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => startEdit(store)} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {stores.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-500">
                                        No stores configured
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <h3 className="text-blue-400 font-semibold mb-2">About Thresholds</h3>
                    <p className="text-blue-300/70 text-sm">
                        Bills exceeding these thresholds will be blocked from Scan-and-Pay and directed to manual counters.
                    </p>
                </div>
            </main>
        </div>
    );
}
