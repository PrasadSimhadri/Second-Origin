'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHome() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to admin dashboard
        router.push('/admin/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="animate-pulse">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Admin Portal
                </div>
                <p className="text-slate-400 text-center mt-2">Loading...</p>
            </div>
        </div>
    );
}
