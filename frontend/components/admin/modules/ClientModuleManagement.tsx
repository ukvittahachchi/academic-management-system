'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api-client';
import { Module, ModuleFilters } from '@/lib/types/module';
import { validateModuleForm, getErrorMessage, formatDate } from '@/lib/validation';

import { CardSkeleton, TableSkeleton, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import {
    LuBookOpen,
    LuPlus,
    LuSearch,
    LuFilter,
    LuLayoutGrid,
    LuList,
    LuPencil,
    LuTrash2,
    LuEye,
    LuArchive,
    LuCheck,
    LuX
} from 'react-icons/lu';
import { FiMoreVertical } from 'react-icons/fi';

export default function ClientModuleManagement() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();

    const [modules, setModules] = useState<Module[]>([]);
    const [filteredModules, setFilteredModules] = useState<Module[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statistics, setStatistics] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filters
    const [filters, setFilters] = useState<ModuleFilters>({});
    const [searchQuery, setSearchQuery] = useState('');

    // Create/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentModule, setCurrentModule] = useState<Module | null>(null);
    const [formData, setFormData] = useState({
        module_name: '',
        description: '',
        grade_level: '',
        subject: 'ICT'
    });
    const [formErrors, setFormErrors] = useState<{ field: string; message: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch modules on mount
    useEffect(() => {
        fetchModules();
        fetchStatistics();
    }, [filters]);

    // Filter modules based on search
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredModules(modules);
        } else {
            const filtered = modules.filter(module =>
                module.module_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                module.grade_level.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredModules(filtered);
        }
    }, [modules, searchQuery]);

    const fetchModules = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await apiClient.getModules(filters);
            setModules(response.data);
        } catch (error) {
            console.error('Failed to fetch modules:', error);
            setError(getErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            const response = await apiClient.getModuleStatistics();
            setStatistics(response.data);
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
        }
    };

    const handleCreate = () => {
        setFormData({
            module_name: '',
            description: '',
            grade_level: user?.classGrade || 'Grade 6',
            subject: 'ICT'
        });
        setCurrentModule(null);
        setIsEditing(false);
        setFormErrors([]);
        setShowModal(true);
    };

    const handleEdit = (module: Module) => {
        setFormData({
            module_name: module.module_name,
            description: module.description || '',
            grade_level: module.grade_level,
            subject: module.subject
        });
        setCurrentModule(module);
        setIsEditing(true);
        setFormErrors([]);
        setShowModal(true);
    };

    const handleDelete = async (moduleId: number) => {
        if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
            return;
        }

        try {
            await apiClient.deleteModule(moduleId);
            await fetchModules();
            await fetchStatistics();
            showToast('Module deleted successfully', 'success');
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    const handleTogglePublish = async (moduleId: number, currentStatus: boolean) => {
        try {
            await apiClient.togglePublishModule(moduleId, !currentStatus);
            await fetchModules();
            showToast('Module status updated successfully', 'success');
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        const validation = validateModuleForm(formData);
        setFormErrors(validation.errors);

        if (!validation.isValid) {
            return;
        }

        setIsSubmitting(true);

        try {
            if (isEditing && currentModule) {
                // Update existing module
                await apiClient.updateModule(currentModule.module_id, formData);
            } else {
                // Create new module
                const moduleData = {
                    ...formData,
                    school_id: user?.schoolId
                };
                await apiClient.createModule(moduleData);
            }

            // Refresh data
            await fetchModules();
            await fetchStatistics();

            // Close modal and reset form
            setShowModal(false);
            setFormData({
                module_name: '',
                description: '',
                grade_level: user?.classGrade || 'Grade 6',
                subject: 'ICT'
            });
            setCurrentModule(null);
            setIsEditing(false);
            showToast(`Module ${isEditing ? 'updated' : 'created'} successfully`, 'success');
        } catch (error) {
            const errorMsg = getErrorMessage(error);
            showToast(`Failed to ${isEditing ? 'update' : 'create'} module: ${errorMsg}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFilterChange = (key: keyof ModuleFilters, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value === 'all' ? undefined : value
        }));
    };

    const getErrorForField = (field: string): string | undefined => {
        return formErrors.find(e => e.field === field)?.message;
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 glass-effect">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-purple-600 text-white p-2 rounded-lg">
                                    <LuBookOpen className="w-5 h-5" />
                                </span>
                                Module Management
                            </h1>
                            <p className="text-gray-500 text-sm mt-1 ml-11">Create and manage learning modules</p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                            <LuPlus className="w-5 h-5" /> Create New Module
                        </button>
                    </div>

                    {/* Stats Summary */}
                    {statistics && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                                <div className="text-purple-600 text-sm font-bold uppercase tracking-wider mb-1">Total Modules</div>
                                <div className="text-2xl font-black text-purple-900">{statistics.total_modules}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                                <div className="text-green-600 text-sm font-bold uppercase tracking-wider mb-1">Published</div>
                                <div className="text-2xl font-black text-green-900">{statistics.published_modules}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                <div className="text-blue-600 text-sm font-bold uppercase tracking-wider mb-1">Grade Levels</div>
                                <div className="text-2xl font-black text-blue-900">{statistics.grade_levels}</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                                <div className="text-orange-600 text-sm font-bold uppercase tracking-wider mb-1">Content Items</div>
                                <div className="text-2xl font-black text-orange-900">{statistics.total_content_items}</div>
                            </div>
                        </div>
                    )}

                    {/* Filters Toolbar */}
                    <div className="mt-8 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search modules..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                            />
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-48">
                                <select
                                    value={filters.grade_level || 'all'}
                                    onChange={(e) => handleFilterChange('grade_level', e.target.value)}
                                    className="w-full pl-4 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer"
                                    style={{ backgroundImage: 'none' }} // Remove default arrow if customized
                                >
                                    <option value="all">All Grades</option>
                                    <option value="Grade 6">Grade 6</option>
                                    <option value="Grade 7">Grade 7</option>
                                    <option value="Grade 8">Grade 8</option>
                                </select>
                                <LuFilter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="relative flex-1 md:w-48">
                                <select
                                    value={filters.is_published === undefined ? 'all' : filters.is_published.toString()}
                                    onChange={(e) => handleFilterChange('is_published', e.target.value === 'all' ? undefined : e.target.value === 'true')}
                                    className="w-full pl-4 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="all">All Status</option>
                                    <option value="true">Published</option>
                                    <option value="false">Unpublished</option>
                                </select>
                                <LuEye className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <LuLayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <LuList className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <CardSkeleton key={i} />
                            ))}
                        </div>
                    </div>
                ) : error ? (
                    <ErrorMessage
                        error={error}
                        title="Failed to load modules"
                        onRetry={fetchModules}
                    />
                ) : filteredModules.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <LuBookOpen className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No modules found</h3>
                        <p className="text-gray-500 mb-6">Create your first module to get started</p>
                        <button
                            onClick={handleCreate}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20"
                        >
                            Create Module
                        </button>
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredModules.map((module) => (
                                    <div key={module.module_id} className="bg-white rounded-[2rem] shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all group">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${module.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {module.is_published ? 'Published' : 'Draft'}
                                                </span>
                                                <div className="relative group/menu">
                                                    <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                                                        <FiMoreVertical className="w-5 h-5" />
                                                    </button>
                                                    {/* Dropdown Menu - Simplified for demo */}
                                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 hidden group-hover/menu:block z-10">
                                                        <button onClick={() => handleEdit(module)} className="w-full text-left px-4 py-2 hover:bg-purple-50 text-gray-700 hover:text-purple-700 rounded-lg text-sm font-medium flex items-center gap-2">
                                                            <LuPencil className="w-4 h-4" /> Edit Details
                                                        </button>
                                                        <button onClick={() => handleTogglePublish(module.module_id, module.is_published)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2">
                                                            {module.is_published ? <LuArchive className="w-4 h-4" /> : <LuCheck className="w-4 h-4" />}
                                                            {module.is_published ? 'Unpublish' : 'Publish'}
                                                        </button>
                                                        <div className="h-px bg-gray-100 my-1"></div>
                                                        <button onClick={() => handleDelete(module.module_id)} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2">
                                                            <LuTrash2 className="w-4 h-4" /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-1">{module.module_name}</h3>
                                            <p className="text-gray-500 text-sm mb-6 line-clamp-2 h-10">{module.description || 'No description provided.'}</p>

                                            <div className="flex items-center justify-between text-sm font-medium text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl">
                                                <span>{module.grade_level}</span>
                                                <span>•</span>
                                                <span>{module.unit_count} Units</span>
                                            </div>

                                            <button
                                                onClick={() => router.push(`/admin/modules/${module.module_id}/units`)}
                                                className="w-full py-3 bg-purple-50 text-purple-700 font-bold rounded-xl hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                Manage Content <LuBookOpen className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2rem] shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">Module Name</th>
                                            <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">Grade</th>
                                            <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">Content</th>
                                            <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                                            <th className="p-6 font-bold text-gray-500 text-xs uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredModules.map((module) => (
                                            <tr key={module.module_id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="p-6 font-bold text-gray-900">{module.module_name}</td>
                                                <td className="p-6">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold">{module.grade_level}</span>
                                                </td>
                                                <td className="p-6 text-sm text-gray-500">
                                                    {module.unit_count} units, {module.content_count} items
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${module.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {module.is_published ? 'Published' : 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => router.push(`/admin/modules/${module.module_id}/units`)}
                                                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                            title="Manage Content"
                                                        >
                                                            <LuBookOpen className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(module)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <LuPencil className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(module.module_id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
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
                        )}
                    </>
                )}
            </main>

            {/* Create/Edit Modal - Reusing styles but could be extracted to a PremiumModal component */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fade-in_0.2s_ease-out]">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-gray-900">
                                    {isEditing ? 'Edit Module' : 'Create New Module'}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <LuX className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    {/* Module Name */}
                                    <div>
                                        <label htmlFor="module_name" className="block text-sm font-bold text-gray-700 mb-2">Module Name</label>
                                        <input
                                            type="text"
                                            id="module_name"
                                            value={formData.module_name}
                                            onChange={(e) => setFormData({ ...formData, module_name: e.target.value })}
                                            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${getErrorForField('module_name') ? 'border-red-500 bg-red-50' : 'border-gray-200'
                                                }`}
                                            placeholder="e.g., Introduction to Computer Science"
                                        />
                                        {getErrorForField('module_name') && (
                                            <p className="mt-1 text-sm text-red-600 font-medium">{getErrorForField('module_name')}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Grade Level */}
                                        <div>
                                            <label htmlFor="grade_level" className="block text-sm font-bold text-gray-700 mb-2">Grade Level</label>
                                            <select
                                                id="grade_level"
                                                value={formData.grade_level}
                                                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="">Select Grade</option>
                                                <option value="Grade 6">Grade 6</option>
                                                <option value="Grade 7">Grade 7</option>
                                                <option value="Grade 8">Grade 8</option>
                                                <option value="Grade 9">Grade 9</option>
                                                <option value="Grade 10">Grade 10</option>
                                            </select>
                                        </div>

                                        {/* Subject */}
                                        <div>
                                            <label htmlFor="subject" className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                                            <select
                                                id="subject"
                                                value={formData.subject}
                                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="ICT">ICT</option>
                                                <option value="Computer Science">Computer Science</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                                        <textarea
                                            id="description"
                                            rows={4}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none"
                                            placeholder="What will students learn in this module?"
                                        ></textarea>
                                        <div className="flex justify-end mt-1">
                                            <span className="text-xs text-gray-400">{formData.description.length}/500</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <LoadingSpinner />
                                        ) : (
                                            isEditing ? 'Save Changes' : 'Create Module'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
