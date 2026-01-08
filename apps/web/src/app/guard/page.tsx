'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GuardHome() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to guard dashboard
        router.push('/guard/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="animate-pulse">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                    Guard Portal
                </div>
                <p className="text-slate-400 text-center mt-2">Loading...</p>
            </div>
        </div>
    );
}
