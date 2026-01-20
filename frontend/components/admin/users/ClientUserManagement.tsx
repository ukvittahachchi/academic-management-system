'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';
import { AdminUser } from '@/lib/types/admin';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import {
    LuSearch,
    LuFilter,
    LuPlus,
    LuTrash2,
    LuPencil,
    LuUser,
    LuShield,
    LuGraduationCap,
    LuBookOpen
} from 'react-icons/lu';

export default function ClientUserManagement() {
    const router = useRouter();
    const { showToast } = useToast();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchUsers();
    }, [page, debouncedSearch, roleFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getUsers(page, 20, {
                search: debouncedSearch || undefined,
                role: roleFilter || undefined
            });
            setUsers(response.users);
            setTotalPages(response.pagination.pages);
            setLoading(false);
        } catch (err: any) {
            setError(err.message || 'Failed to load users');
            setLoading(false);
        }
    };

    const handleStatusToggle = async (user: AdminUser) => {
        try {
            const newStatus = !user.is_active;
            // Optimistically update local state
            setUsers(users.map(u => u.user_id === user.user_id ? { ...u, is_active: newStatus } : u));
            await apiClient.updateUser(user.user_id, { is_active: newStatus });
            showToast('User status updated successfully', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to update user status', 'error');
            fetchUsers(); // Revert on error
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm('Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.')) return;
        try {
            await apiClient.deleteUser(userId);
            fetchUsers(); // Refresh list
            showToast('User deleted successfully', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to delete user', 'error');
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                        <LuShield className="w-3 h-3" /> ADMIN
                    </span>
                );
            case 'teacher':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                        <LuGraduationCap className="w-3 h-3" /> TEACHER
                    </span>
                );
            case 'student':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                        <LuBookOpen className="w-3 h-3" /> STUDENT
                    </span>
                );
            default:
                return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">{role}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 glass-effect">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-blue-600 text-white p-2 rounded-lg">
                                    <LuUser className="w-5 h-5" />
                                </span>
                                User Management
                            </h1>
                            <p className="text-gray-500 text-sm mt-1 ml-11">Manage students, teachers, and administrators</p>
                        </div>
                        <Link
                            href="/admin/users/create"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                            <LuPlus className="w-5 h-5" /> Add New User
                        </Link>
                    </div>

                    {/* Filters Toolbar */}
                    <div className="mt-6 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by name, username or email..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="relative min-w-[200px]">
                            <LuFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <select
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer transition-all"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner />
                    </div>
                ) : error ? (
                    <ErrorMessage error={error} onRetry={fetchUsers} />
                ) : users.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <LuSearch className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">User Profile</th>
                                        <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">Role & Details</th>
                                        <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                                        <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {users.map((user) => (
                                        <tr key={user.user_id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg
                                                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                            user.role === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}
                                                    `}>
                                                        {user.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-base">{user.full_name}</div>
                                                        <div className="text-sm text-gray-500 font-medium">@{user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="space-y-2">
                                                    {getRoleBadge(user.role)}
                                                    {user.role === 'student' && (
                                                        <div className="text-xs text-gray-500 font-medium ml-1">Grade: {user.class_grade}</div>
                                                    )}
                                                    {user.role === 'teacher' && (
                                                        <div className="text-xs text-gray-500 font-medium ml-1">Subject: {user.subject}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <button
                                                    onClick={() => handleStatusToggle(user)}
                                                    className={`group/status relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${user.is_active ? 'bg-green-500' : 'bg-gray-200'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${user.is_active ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                    <span className="absolute left-full ml-3 text-xs font-medium text-gray-500 opacity-0 group-hover/status:opacity-100 transition-opacity whitespace-nowrap">
                                                        {user.is_active ? 'Active Account' : 'Account Disabled'}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <Link
                                                        href={`/admin/users/${user.user_id}`}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit User"
                                                    >
                                                        <LuPencil className="w-5 h-5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(user.user_id)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <LuTrash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <span className="text-sm text-gray-500 font-medium">
                                    Page {page} of {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => p - 1)}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
