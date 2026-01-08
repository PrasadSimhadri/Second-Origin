'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';

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
            const analytics = await api.getAnalytics();
            setData(analytics);
        } catch (error) {
            console.error('Failed to load analytics', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="ml-64 p-8">Loading...</div>;
    if (!data) return <div className="ml-64 p-8">Failed to load data</div>;

    return (
        <div className="flex w-full">
            <Sidebar />
            <main className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-slate-900">Dashboard</h1>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                        title="Total Revenue"
                        value={`₹${data.totalRevenue.toLocaleString()}`}
                        trend="+12%"
                        color="indigo"
                    />
                    <MetricCard
                        title="Total Bills"
                        value={data.totalBills.toString()}
                        trend="+5%"
                        color="blue"
                    />
                    <MetricCard
                        title="Shrinkage Rate"
                        value={`${data.shrinkageRate}%`}
                        trend="-2%"
                        color="red"
                        inverse
                    />
                    <MetricCard
                        title="False Positives"
                        value={`${data.falsePositiveRate}%`}
                        trend="-1%"
                        color="orange"
                        inverse
                    />
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="card h-96">
                        <h3 className="font-semibold mb-4 text-slate-700">Flag Reasons Distribution</h3>
                        <div className="h-80 flex items-center justify-center">
                            <Doughnut
                                data={{
                                    labels: Object.keys(data.flagsByReason),
                                    datasets: [{
                                        data: Object.values(data.flagsByReason),
                                        backgroundColor: [
                                            '#ef4444', // Red
                                            '#f59e0b', // Orange
                                            '#3b82f6', // Blue
                                            '#10b981', // Emerald
                                            '#6366f1', // Indigo
                                        ]
                                    }]
                                }}
                                options={{ maintainAspectRatio: false }}
                            />
                        </div>
                    </div>

                    <div className="card h-96">
                        <h3 className="font-semibold mb-4 text-slate-700">Flags by Guard</h3>
                        <div className="h-80">
                            <Bar
                                data={{
                                    labels: data.flagsByGuard.map(g => g.guardName),
                                    datasets: [{
                                        label: 'Flags Raised',
                                        data: data.flagsByGuard.map(g => g.count),
                                        backgroundColor: '#6366f1',
                                    }]
                                }}
                                options={{ maintainAspectRatio: false }}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function MetricCard({ title, value, trend, color, inverse = false }: any) {
    const isPositive = trend.startsWith('+');
    const isGood = inverse ? !isPositive : isPositive;

    return (
        <div className="card">
            <div className="text-slate-500 text-sm font-medium mb-2">{title}</div>
            <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-slate-900">{value}</div>
                <div className={`text-sm font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                    {trend}
                </div>
            </div>
        </div>
    );
}
