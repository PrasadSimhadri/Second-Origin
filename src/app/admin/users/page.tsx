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
            router.push('/login');
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
            <main className="ml-64 flex-1 p-8 bg-slate-50 min-h-screen">
                <h1 className="text-2xl font-bold mb-8 text-slate-900">User Management</h1>

                <div className="flex gap-2 mb-6">
                    {['all', 'customer', 'guard', 'admin'].map((role) => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${roleFilter === role
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                <div className="card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Flags (Confirmed)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="font-medium text-slate-900">{user.full_name}</td>
                                        <td className="text-slate-500">{user.email}</td>
                                        <td>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'guard' ? 'bg-green-100 text-green-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td>{user.confirmed_flags_count || 0}</td>
                                        <td>
                                            {user.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleStatusChange(user.id, user.status)}
                                                    className={`text-sm font-medium ${user.status === 'blocked'
                                                            ? 'text-green-600 hover:text-green-800'
                                                            : 'text-red-600 hover:text-red-800'
                                                        }`}
                                                >
                                                    {user.status === 'blocked' ? 'Unblock' : 'Block'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
