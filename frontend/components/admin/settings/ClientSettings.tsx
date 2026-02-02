'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';
import { SystemSettings } from '@/lib/types/admin';
import { LoadingSpinner, CardSkeleton } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import {
    LuSettings,
    LuSave,
    LuSchool,
    LuCalendar,
    LuClock,
    LuShield,
    LuUserPlus,
    LuBell,
    LuCheck,

} from 'react-icons/lu';

export default function ClientSettings() {
    const { showToast } = useToast();
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
            showToast('Settings saved successfully', 'success');
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

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 glass-effect">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-gray-600 text-white p-2 rounded-lg">
                                    <LuSettings className="w-5 h-5" />
                                </span>
                                System Configuration
                            </h1>
                            <p className="text-gray-500 text-sm mt-1 ml-11">Manage global system settings and preferences</p>
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-gray-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <LoadingSpinner size="small" color="white" /> : <LuSave className="w-5 h-5" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="space-y-6">
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {error && <ErrorMessage error={error} />}

                        {successMessage && (
                            <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 flex items-center gap-3 animate-fade-in-up">
                                <div className="bg-green-100 p-2 rounded-full">
                                    <LuCheck className="w-5 h-5" />
                                </div>
                                <div className="font-medium">{successMessage}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* General Settings Card */}
                            <div className="bg-white rounded-[2rem] shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <LuSchool className="text-purple-500" /> General Information
                                    </h2>
                                    <p className="text-gray-500 text-sm mt-1">Basic details about the institution</p>
                                </div>
                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">School Name</label>
                                        <input
                                            type="text"
                                            name="school_name"
                                            value={settings.school_name || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                            placeholder="e.g. Springfield High School"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Academic Year</label>
                                        <div className="relative">
                                            <LuCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                name="academic_year"
                                                value={settings.academic_year || ''}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                                placeholder="e.g. 2025-2026"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Current Term</label>
                                        <div className="relative">
                                            <LuClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <select
                                                name="current_term"
                                                value={settings.current_term || ''}
                                                onChange={handleInputChange}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="Term 1">Term 1</option>
                                                <option value="Term 2">Term 2</option>
                                                <option value="Term 3">Term 3</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* System Controls Card */}
                            <div className="bg-white rounded-[2rem] shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
                                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <LuSettings className="text-blue-500" /> System Controls
                                    </h2>
                                    <p className="text-gray-500 text-sm mt-1">Access control and notifications</p>
                                </div>
                                <div className="p-8 space-y-6">
                                    {/* Maintenance Mode */}
                                    <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer group">
                                        <div className="mt-1">
                                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.maintenance_mode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${settings.maintenance_mode ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                name="maintenance_mode"
                                                checked={settings.maintenance_mode}
                                                onChange={handleInputChange}
                                                className="hidden"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                                <LuShield className={settings.maintenance_mode ? 'text-blue-600' : 'text-gray-400'} />
                                                Maintenance Mode
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                When enabled, only administrators can access the system. Used for system updates.
                                            </p>
                                        </div>
                                    </label>

                                    {/* Allow Registration */}
                                    <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50/30 transition-colors cursor-pointer group">
                                        <div className="mt-1">
                                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.allow_registration ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${settings.allow_registration ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                name="allow_registration"
                                                checked={settings.allow_registration}
                                                onChange={handleInputChange}
                                                className="hidden"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                                <LuUserPlus className={settings.allow_registration ? 'text-green-500' : 'text-gray-400'} />
                                                Allow Registration
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Allow new users to sign up for accounts. Disable to close registration.
                                            </p>
                                        </div>
                                    </label>

                                    {/* Email Notifications */}
                                    <label className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 transition-colors cursor-pointer group">
                                        <div className="mt-1">
                                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.email_notifications ? 'bg-orange-500' : 'bg-gray-300'}`}>
                                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${settings.email_notifications ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                            <input
                                                type="checkbox"
                                                name="email_notifications"
                                                checked={settings.email_notifications}
                                                onChange={handleInputChange}
                                                className="hidden"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                                <LuBell className={settings.email_notifications ? 'text-orange-500' : 'text-gray-400'} />
                                                Email Notifications
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Send system alerts and important updates via email.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
