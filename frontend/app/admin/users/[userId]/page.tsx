'use client';

import { useState, useEffect } from 'react'; // Added React import
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { AdminUser, UpdateUserInput } from '@/lib/types/admin';
import { use } from 'react'; // Import use for unwrapping params

export default function EditUserPage({ params }: { params: Promise<{ userId: string }> }) {
    const router = useRouter();
    // Unwrap params using `use` as per Next.js 15+ patterns for async params
    const { userId } = use(params);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<AdminUser | null>(null);

    const [formData, setFormData] = useState<UpdateUserInput>({
        full_name: '',
        role: '',
        class_grade: '',
        roll_number: '',
        subject: '',
        is_active: true
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                setLoading(true);
                const fetchedUser = await apiClient.getUser(Number(userId));
                setUser(fetchedUser);
                setFormData({
                    full_name: fetchedUser.full_name,
                    role: fetchedUser.role,
                    class_grade: fetchedUser.class_grade || '',
                    roll_number: fetchedUser.roll_number || '',
                    subject: fetchedUser.subject || '',
                    is_active: fetchedUser.is_active
                });
                setLoading(false);
            } catch (err: any) {
                setError(err.message || 'Failed to load user');
                setLoading(false);
            }
        };

        if (userId) {
            fetchUser();
        }
    }, [userId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await apiClient.updateUser(Number(userId), formData);
            router.push('/admin/users');
        } catch (err: any) {
            setError(err.message || 'Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading user...</div>;
    if (!user) return <div className="p-8 text-center text-red-500">User not found</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Edit User: {user.username}</h1>

            <div className="bg-white p-6 rounded-xl shadow">
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Common Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            required
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-gray-700">Account Active</span>
                        </label>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-gray-500 mb-2">Change Password (Optional)</h3>
                        <input
                            type="password"
                            name="password"
                            onChange={handleChange}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Enter new password to change"
                        />
                    </div>

                    {/* Conditional Fields based on Role */}
                    {formData.role === 'student' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Class Grade</label>
                                <select
                                    name="class_grade"
                                    value={formData.class_grade}
                                    onChange={handleChange}
                                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="">Select Grade</option>
                                    {[...Array(13)].map((_, i) => (
                                        <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                                <input
                                    type="text"
                                    name="roll_number"
                                    value={formData.roll_number}
                                    onChange={handleChange}
                                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {formData.role === 'teacher' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <select
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
                    )}

                    <div className="pt-4 flex justify-end gap-3 w-full">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
