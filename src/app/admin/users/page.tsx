'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase-client';
import { api, type User } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        loadUsers();
    }, [roleFilter]);

    const loadUsers = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/admin/login');
            return;
        }
        api.setToken(session.access_token);
        try {
            const role = roleFilter === 'all' ? undefined : roleFilter;
            const data = await api.getUsers(role);
            setUsers(data);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (userId: string, currentStatus: string) => {
        const newAction = currentStatus === 'blocked' ? 'unblock' : 'block';
        if (!confirm(`Are you sure you want to ${newAction} this user?`)) return;

        try {
            await api.updateUserStatus(userId, newAction);
            loadUsers();
        } catch {
            alert('Failed to update user status');
        }
    };

    return (
        <div className="flex w-full">
            <Sidebar />
            <main className="ml-64 flex-1 p-8 bg-slate-900 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-white">User Management</h1>

                <div className="flex gap-2 mb-6">
                    {['all', 'customer', 'guard', 'admin'].map((role) => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${roleFilter === role
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-900/50">
                            <tr>
                                <th className="text-left p-4 text-slate-400 font-medium">Name</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Email</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Role</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                                    <td className="p-4 font-medium text-white">{user.full_name}</td>
                                    <td className="p-4 text-slate-400">{user.email}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                            user.role === 'guard' ? 'bg-green-500/20 text-green-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.status === 'blocked' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                            }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {user.role !== 'admin' && (
                                            <button
                                                onClick={() => handleStatusChange(user.id, user.status)}
                                                className={`text-sm font-medium ${user.status === 'blocked'
                                                    ? 'text-green-400 hover:text-green-300'
                                                    : 'text-red-400 hover:text-red-300'
                                                    }`}
                                            >
                                                {user.status === 'blocked' ? 'Unblock' : 'Block'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-500">
                                        {loading ? 'Loading...' : 'No users found'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
