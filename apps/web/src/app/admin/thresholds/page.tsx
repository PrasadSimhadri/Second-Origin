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
            router.push('/login');
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

    if (loading) return <div className="ml-64 p-8">Loading...</div>;

    return (
        <div className="flex w-full">
            <Sidebar />
            <main className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-slate-900">Store Configuration & Thresholds</h1>

                <div className="card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Store Name</th>
                                    <th>Store Code</th>
                                    <th>Price Threshold (₹)</th>
                                    <th>Quantity Threshold</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stores.map((store) => (
                                    <tr key={store.id}>
                                        <td className="font-medium text-slate-900">{store.name}</td>
                                        <td className="font-mono text-slate-500">{store.code}</td>
                                        <td>
                                            {editingId === store.id ? (
                                                <input
                                                    type="number"
                                                    value={editForm.price}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                                    className="input w-32"
                                                />
                                            ) : (
                                                `₹${store.price_threshold}`
                                            )}
                                        </td>
                                        <td>
                                            {editingId === store.id ? (
                                                <input
                                                    type="number"
                                                    value={editForm.quantity}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                                    className="input w-32"
                                                />
                                            ) : (
                                                store.quantity_threshold
                                            )}
                                        </td>
                                        <td>
                                            {editingId === store.id ? (
                                                <div className="flex gap-2">
                                                    <button onClick={saveEdit} className="text-green-600 hover:text-green-700 font-medium">Save</button>
                                                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-700">Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => startEdit(store)} className="text-indigo-600 hover:text-indigo-700 font-medium">Edit</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-blue-800 font-semibold mb-2">About Thresholds</h3>
                    <p className="text-blue-600 text-sm">
                        Bills exceeding these thresholds will be blocked from Scan-and-Pay and directed to manual counters.
                        Price threshold is the maximum total bill amount allowed. Quantity threshold is the maximum number of items allowed.
                    </p>
                </div>
            </main>
        </div>
    );
}
