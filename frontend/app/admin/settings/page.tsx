'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { SystemSettings } from '@/lib/types/admin';

export default function SettingsPage() {
    const [settings, setSettings] = useState<SystemSettings>({
        school_name: '',
        academic_year: '',
        current_term: '',
        maintenance_mode: false,
        allow_registration: false,
        email_notifications: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getSettings();
            setSettings(data);
            setLoading(false);
        } catch (err: any) {
            setError(err.message || 'Failed to load settings');
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const updated = await apiClient.updateSettings(settings);
            setSettings(updated);
            setSuccessMessage('Settings saved successfully');
        } catch (err: any) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        setSettings(prev => ({
            ...prev,
            [name]: val
        }));
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">System Configuration</h1>

            <div className="bg-white rounded-xl shadow p-6">
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                            <input
                                type="text"
                                name="school_name"
                                value={settings.school_name || ''}
                                onChange={handleInputChange}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                            <input
                                type="text"
                                name="academic_year"
                                value={settings.academic_year || ''}
                                onChange={handleInputChange}
                                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Term</label>
                        <select
                            name="current_term"
                            value={settings.current_term || ''}
                            onChange={handleInputChange}
                            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="Term 1">Term 1</option>
                            <option value="Term 2">Term 2</option>
                            <option value="Term 3">Term 3</option>
                        </select>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-md font-medium text-gray-800 mb-4">System Controls</h3>
                        <div className="space-y-4">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="maintenance_mode"
                                    checked={settings.maintenance_mode}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div>
                                    <div className="font-medium text-gray-700">Maintenance Mode</div>
                                    <div className="text-sm text-gray-500">Only admins can access the system</div>
                                </div>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="allow_registration"
                                    checked={settings.allow_registration}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div>
                                    <div className="font-medium text-gray-700">Allow Registration</div>
                                    <div className="text-sm text-gray-500">Allow new users to register</div>
                                </div>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="email_notifications"
                                    checked={settings.email_notifications}
                                    onChange={handleInputChange}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div>
                                    <div className="font-medium text-gray-700">Enable Email Notifications</div>
                                    <div className="text-sm text-gray-500">Send alerts for important events</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
