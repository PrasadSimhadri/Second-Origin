'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerHome() {
    const router = useRouter();

    useEffect(() => {
        router.push('/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="animate-pulse">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    ScanKart
                </div>
                <p className="text-slate-400 text-center mt-2">Loading...</p>
            </div>
        </div>
    );
}
