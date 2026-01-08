'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { api, type Flag, type Contradiction } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function FlagsPage() {
    const router = useRouter();
    const [flags, setFlags] = useState<Flag[]>([]);
    const [contradictions, setContradictions] = useState<Contradiction[]>([]);
    const [activeTab, setActiveTab] = useState<'flags' | 'contradictions'>('flags');
    const [loading, setLoading] = useState(true);
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        api.setToken(session.access_token);
        try {
            const [f, c] = await Promise.all([
                api.getPendingFlags(),
                api.getPendingContradictions()
            ]);
            setFlags(f);
            setContradictions(c);
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

    const handleResolveContradiction = async (id: string, action: 'accept' | 'reject') => {
        setResolvingId(id);
        try {
            await api.resolveContradiction(id, action);
            await loadData();
        } catch {
            alert('Failed to resolve contradiction');
        } finally {
            setResolvingId(null);
        }
    };

    if (loading) return <div className="ml-64 p-8">Loading...</div>;

    return (
        <div className="flex w-full">
            <Sidebar />
            <main className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-slate-900">Incident Resolution</h1>

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('flags')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'flags' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                    >
                        Pending Flags ({flags.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('contradictions')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'contradictions' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                    >
                        Pending Contradictions ({contradictions.length})
                    </button>
                </div>

                {activeTab === 'flags' ? (
                    <div className="space-y-4">
                        {flags.length === 0 && <p className="text-slate-500">No pending flags.</p>}
                        {flags.map((flag) => (
                            <div key={flag.id} className="card">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-lg text-slate-900">Bill #{flag.bill.bill_number}</span>
                                            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-medium">{flag.reason.toUpperCase().replace('_', ' ')}</span>
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            Flagged by <strong>{flag.guard.full_name}</strong> on {new Date(flag.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-slate-500">Customer</div>
                                        <div className="font-medium">{flag.bill.customer.full_name}</div>
                                    </div>
                                </div>

                                {flag.description && (
                                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 mb-4 border border-slate-200">
                                        "{flag.description}"
                                    </div>
                                )}

                                {flag.evidence_urls && flag.evidence_urls.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto py-2 mb-4">
                                        {flag.evidence_urls.map((url, i) => (
                                            <img key={i} src={url} alt="Evidence" className="h-32 rounded border border-slate-200" />
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-3 justify-end border-t pt-4">
                                    <button
                                        onClick={() => handleResolveFlag(flag.id, 'reject')}
                                        disabled={resolvingId === flag.id}
                                        className="btn btn-secondary text-slate-600"
                                    >
                                        Reject Flag (False Alarm)
                                    </button>
                                    <button
                                        onClick={() => handleResolveFlag(flag.id, 'confirm')}
                                        disabled={resolvingId === flag.id}
                                        className="btn btn-destructive"
                                    >
                                        Confirm Flag (Theft Attempt)
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {contradictions.length === 0 && <p className="text-slate-500">No pending disputes.</p>}
                        {contradictions.map((con) => (
                            <div key={con.id} className="card bg-purple-50/50 border-purple-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-purple-900 mb-1">Dispute for Flag on Bill #{con.flag?.bill?.bill_number}</h3>
                                        <p className="text-sm text-purple-700">
                                            Raised by <strong>{con.customer.full_name}</strong> on {new Date(con.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                        {con.reason.replace('_', ' ')}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Guard's Flag Reason</div>
                                        <div className="p-3 bg-white rounded border border-slate-200 text-sm">
                                            {con.flag.reason}: {con.flag.description}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Customer's Defense</div>
                                        <div className="p-3 bg-white rounded border border-slate-200 text-sm italic">
                                            "{con.description}"
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end border-t border-purple-200 pt-4">
                                    <button
                                        onClick={() => handleResolveContradiction(con.id, 'reject')}
                                        disabled={resolvingId === con.id}
                                        className="btn bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                                    >
                                        Reject Dispute (Uphold Flag)
                                    </button>
                                    <button
                                        onClick={() => handleResolveContradiction(con.id, 'accept')}
                                        disabled={resolvingId === con.id}
                                        className="btn btn-primary bg-purple-600 hover:bg-purple-700"
                                    >
                                        Accept Dispute (Dismiss Flag)
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
