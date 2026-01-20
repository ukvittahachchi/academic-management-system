'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { CreateUserInput } from '@/lib/types/admin';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
    LuUserPlus,
    LuUser,
    LuLock,
    LuGraduationCap,
    LuHash,
    LuBookOpen,
    LuSave,
    LuX
} from 'react-icons/lu';

export default function CreateUserPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateUserInput>({
        username: '',
        full_name: '',
        plain_password: '',
        role: 'student',
        class_grade: '',
        roll_number: '',
        subject: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Basic validation
        if (!formData.username || !formData.full_name || !formData.plain_password) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        try {
            await apiClient.createUser(formData);
            router.push('/admin/users');
        } catch (err: any) {
            setError(err.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 glass-effect">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-gray-900 text-white p-2 rounded-lg">
                                    <LuUserPlus className="w-5 h-5" />
                                </span>
                                Create New User
                            </h1>
                            <p className="text-gray-500 text-sm mt-1 ml-11">Add a new student, teacher, or administrator to the system</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-5 py-2.5 text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-medium transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <LuX className="w-4 h-4" />
                                    Cancel
                                </div>
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-gray-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <LoadingSpinner className="w-5 h-5 text-white" /> : <LuSave className="w-5 h-5" />}
                                {loading ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3 animate-fade-in-up">
                            <div className="font-medium">{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* User Details Card */}
                        <div className="bg-white rounded-[2rem] shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <LuUser className="text-blue-500" /> Account Information
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">Basic login and profile details</p>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
                                    <div className="relative">
                                        <LuUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition-all"
                                        >
                                            <option value="student">Student</option>
                                            <option value="teacher">Teacher</option>
                                            <option value="admin">Administrator</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                    <div className="relative">
                                        <LuUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
                                    <div className="relative">
                                        <LuHash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="e.g. john.doe"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                                    <div className="relative">
                                        <LuLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="password"
                                            name="plain_password"
                                            value={formData.plain_password}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Min. 6 characters"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Role Specific Fields */}
                        {formData.role === 'student' && (
                            <div className="bg-white rounded-[2rem] shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden animate-fade-in-up">
                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <LuGraduationCap className="text-purple-500" /> Student Details
                                    </h2>
                                    <p className="text-gray-500 text-sm mt-1">Class and enrollment information</p>
                                </div>
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Class Grade</label>
                                        <div className="relative">
                                            <LuGraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <select
                                                name="class_grade"
                                                value={formData.class_grade}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer transition-all"
                                            >
                                                <option value="">Select Grade</option>
                                                {[...Array(13)].map((_, i) => (
                                                    <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Roll Number</label>
                                        <div className="relative">
                                            <LuHash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                name="roll_number"
                                                value={formData.roll_number}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                                placeholder="e.g. 101"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {formData.role === 'teacher' && (
                            <div className="bg-white rounded-[2rem] shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden animate-fade-in-up">
                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <LuBookOpen className="text-orange-500" /> Teacher Details
                                    </h2>
                                    <p className="text-gray-500 text-sm mt-1">Teaching subject assignments</p>
                                </div>
                                <div className="p-8">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                        <div className="relative">
                                            <LuBookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <select
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer transition-all"
                                            >
                                                <option value="">Select Subject</option>
                                                <option value="Mathematics">Mathematics</option>
                                                <option value="Science">Science</option>
                                                <option value="English">English</option>
                                                <option value="History">History</option>
                                                <option value="Geography">Geography</option>
                                                <option value="ICT">ICT</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
