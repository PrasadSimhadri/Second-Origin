'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/bills', label: 'Transactions', icon: '💳' },
    { href: '/flags', label: 'Flag Resolution', icon: '🚩' },
    { href: '/users', label: 'User Management', icon: '👥' },
    { href: '/thresholds', label: 'Store Config', icon: '⚙️' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        api.clearToken();
        router.push('/login');
    };

    return (
        <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-50">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center">SK</span>
                    Admin
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <span>{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-colors"
                >
                    <span>🚪</span>
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
}
