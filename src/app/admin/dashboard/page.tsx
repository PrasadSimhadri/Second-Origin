'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase-client';
import { api, type Analytics } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

export default function Dashboard() {
    const router = useRouter();
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            const analytics = await api.getAnalytics();
            setData(analytics);
        } catch (err) {
            console.error('Failed to load analytics', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="ml-64 p-8 text-slate-300 bg-slate-900 min-h-screen">Loading...</div>;
    if (error) return <div className="ml-64 p-8 text-red-400 bg-slate-900 min-h-screen">Error: {error}</div>;
    if (!data) return <div className="ml-64 p-8 text-slate-300 bg-slate-900 min-h-screen">No data available</div>;

    return (
        <div className="flex w-full">
            <Sidebar />
            <main className="ml-64 flex-1 p-8 bg-slate-900 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-white">Dashboard</h1>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                        title="Total Revenue"
                        value={`₹${data.totalRevenue.toLocaleString()}`}
                        color="indigo"
                    />
                    <MetricCard
                        title="Total Bills"
                        value={data.totalBills.toString()}
                        color="blue"
                    />
                    <MetricCard
                        title="Shrinkage Rate"
                        value={`${data.shrinkageRate}%`}
                        color="red"
                    />
                    <MetricCard
                        title="False Positives"
                        value={`${data.falsePositiveRate}%`}
                        color="orange"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h3 className="font-semibold mb-4 text-slate-200">Flag Reasons Distribution</h3>
                        <div className="h-64 flex items-center justify-center">
                            {Object.keys(data.flagsByReason).length > 0 ? (
                                <Doughnut
                                    data={{
                                        labels: Object.keys(data.flagsByReason),
                                        datasets: [{
                                            data: Object.values(data.flagsByReason),
                                            backgroundColor: [
                                                '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1',
                                            ]
                                        }]
                                    }}
                                    options={{
                                        maintainAspectRatio: false,
                                        plugins: { legend: { labels: { color: '#94a3b8' } } }
                                    }}
                                />
                            ) : (
                                <p className="text-slate-500">No flags recorded yet</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                        <h3 className="font-semibold mb-4 text-slate-200">Flags by Guard</h3>
                        <div className="h-64">
                            {data.flagsByGuard.length > 0 ? (
                                <Bar
                                    data={{
                                        labels: data.flagsByGuard.map(g => g.guardName),
                                        datasets: [{
                                            label: 'Flags Raised',
                                            data: data.flagsByGuard.map(g => g.count),
                                            backgroundColor: '#6366f1',
                                        }]
                                    }}
                                    options={{
                                        maintainAspectRatio: false,
                                        plugins: { legend: { labels: { color: '#94a3b8' } } },
                                        scales: {
                                            x: { ticks: { color: '#94a3b8' } },
                                            y: { ticks: { color: '#94a3b8' } }
                                        }
                                    }}
                                />
                            ) : (
                                <p className="text-slate-500 flex items-center justify-center h-full">No guard activity yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function MetricCard({ title, value, color }: { title: string; value: string; color: string }) {
    const colorMap: Record<string, string> = {
        indigo: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30',
        blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
        red: 'from-red-500/20 to-red-600/20 border-red-500/30',
        orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    };

    return (
        <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-5`}>
            <div className="text-slate-400 text-sm font-medium mb-2">{title}</div>
            <div className="text-3xl font-bold text-white">{value}</div>
        </div>
    );
}

