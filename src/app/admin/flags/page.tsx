'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase-client';
import { api, type Flag } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function FlagsPage() {
    const router = useRouter();
    const [flags, setFlags] = useState<Flag[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/admin/login');
            return;
        }
        api.setToken(session.access_token);
        try {
            const f = await api.getPendingFlags();
            setFlags(f);
        } finally {
            setLoading(false);
        }
    };

    const handleResolveFlag = async (id: string, action: 'confirm' | 'reject') => {
        setResolvingId(id);
        try {
            await api.resolveFlag(id, action);
            await loadData();
        } catch {
            alert('Failed to resolve flag');
        } finally {
            setResolvingId(null);
        }
    };

    if (loading) return <div className="ml-64 p-8 bg-slate-900 min-h-screen text-slate-300">Loading...</div>;

    return (
        <div className="flex w-full">
            <Sidebar />
            <main className="ml-64 flex-1 p-8 bg-slate-900 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-white">Flag Resolution</h1>

                <div className="space-y-4">
                    {flags.length === 0 && (
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                            <p className="text-slate-400">No pending flags to review.</p>
                        </div>
                    )}
                    {flags.map((flag) => (
                        <div key={flag.id} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg text-white">Bill #{flag.bill?.bill_number || 'N/A'}</span>
                                        <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 font-medium border border-red-500/30">
                                            {flag.reason.toUpperCase().replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400">
                                        Flagged by <strong className="text-slate-300">{flag.guard?.full_name || 'Unknown'}</strong> on {new Date(flag.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-500">Customer</div>
                                    <div className="font-medium text-white">{flag.bill?.customer?.full_name || 'N/A'}</div>
                                </div>
                            </div>

                            {flag.description && (
                                <div className="bg-slate-900/50 p-3 rounded-lg text-sm text-slate-300 mb-4 border border-slate-700">
                                    &quot;{flag.description}&quot;
                                </div>
                            )}

                            {flag.evidence_urls && flag.evidence_urls.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto py-2 mb-4">
                                    {flag.evidence_urls.map((url, i) => (
                                        <img key={i} src={url} alt="Evidence" className="h-32 rounded border border-slate-700" />
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 justify-end border-t border-slate-700 pt-4">
                                <button
                                    onClick={() => handleResolveFlag(flag.id, 'reject')}
                                    disabled={resolvingId === flag.id}
                                    className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50"
                                >
                                    Reject (False Alarm)
                                </button>
                                <button
                                    onClick={() => handleResolveFlag(flag.id, 'confirm')}
                                    disabled={resolvingId === flag.id}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    Confirm (Theft Attempt)
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
