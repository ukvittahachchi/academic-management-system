'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { Module, ModuleFilters } from '@/lib/types/module';
import { validateModuleForm, getErrorMessage, formatDate } from '@/lib/validation';

export default function AdminModulesPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [modules, setModules] = useState<Module[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  
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
    } catch (error) {
      alert(getErrorMessage(error));
    }
  };

  const handleTogglePublish = async (moduleId: number, currentStatus: boolean) => {
    try {
      await apiClient.togglePublishModule(moduleId, !currentStatus);
      await fetchModules();
    } catch (error) {
      alert(getErrorMessage(error));
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
    } catch (error) {
      const errorMsg = getErrorMessage(error);
      alert(`Failed to ${isEditing ? 'update' : 'create'} module: ${errorMsg}`);
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
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Module Management
                </h1>
                <p className="text-gray-600">
                  Create and manage learning modules for students
                </p>
              </div>
              <button
                onClick={handleCreate}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow flex items-center"
              >
                <span className="mr-2">➕</span> Create New Module
              </button>
            </div>
          </div>
        </header>

        {/* Statistics */}
        {statistics && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg mr-4">
                    <span className="text-purple-600 text-xl">📚</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Modules</p>
                    <p className="text-2xl font-bold">{statistics.total_modules}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg mr-4">
                    <span className="text-green-600 text-xl">✅</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Published</p>
                    <p className="text-2xl font-bold">{statistics.published_modules}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg mr-4">
                    <span className="text-blue-600 text-xl">🏫</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Grade Levels</p>
                    <p className="text-2xl font-bold">{statistics.grade_levels}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center">
                  <div className="bg-yellow-100 p-3 rounded-lg mr-4">
                    <span className="text-yellow-600 text-xl">📝</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Content Items</p>
                    <p className="text-2xl font-bold">{statistics.total_content_items}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search modules..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Grade Level Filter */}
              <div>
                <select
                  value={filters.grade_level || 'all'}
                  onChange={(e) => handleFilterChange('grade_level', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Grade Levels</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filters.is_published === undefined ? 'all' : filters.is_published.toString()}
                  onChange={(e) => handleFilterChange('is_published', e.target.value === 'all' ? undefined : e.target.value === 'true')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="true">Published</option>
                  <option value="false">Unpublished</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modules Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading modules...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-red-600 mb-4">❌</div>
                <p className="text-gray-800 mb-2">Failed to load modules</p>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchModules}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                >
                  Try Again
                </button>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">📚</div>
                <p className="text-gray-800 mb-2">No modules found</p>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? 'Try a different search' : 'Create your first module to get started'}
                </p>
                <button
                  onClick={handleCreate}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow"
                >
                  Create New Module
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Module Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade Level
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Units/Content
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(Array.isArray(filteredModules) ? filteredModules : []).map((module) => (
                      <tr key={module.module_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{module.module_name}</div>
                            {module.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {module.description.length > 100
                                  ? `${module.description.substring(0, 100)}...`
                                  : module.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {module.grade_level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <span>{module.unit_count} units</span>
                            <span>•</span>
                            <span>{module.content_count} content items</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleTogglePublish(module.module_id, module.is_published)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              module.is_published
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {module.is_published ? 'Published' : 'Unpublished'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div>{formatDate(module.created_at)}</div>
                          <div className="text-xs">by {module.created_by_name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(module)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => router.push(`/admin/modules/${module.module_id}/units`)}
                              className="text-green-600 hover:text-green-900"
                            >
                              View Units
                            </button>
                            <button
                              onClick={() => handleDelete(module.module_id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredModules.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing <span className="font-medium">{filteredModules.length}</span> of{' '}
                    <span className="font-medium">{modules.length}</span> modules
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">
                      Previous
                    </button>
                    <button className="px-3 py-1 border border-gray-300 rounded text-sm">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isEditing ? 'Edit Module' : 'Create New Module'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {/* Module Name */}
                <div className="mb-6">
                  <label htmlFor="module_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Module Name *
                  </label>
                  <input
                    type="text"
                    id="module_name"
                    value={formData.module_name}
                    onChange={(e) => setFormData({ ...formData, module_name: e.target.value })}
                    className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition ${
                      getErrorForField('module_name') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Introduction to Computers"
                    required
                  />
                  {getErrorForField('module_name') && (
                    <p className="mt-1 text-sm text-red-600">{getErrorForField('module_name')}</p>
                  )}
                </div>

                {/* Grade Level */}
                <div className="mb-6">
                  <label htmlFor="grade_level" className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Level *
                  </label>
                  <select
                    id="grade_level"
                    value={formData.grade_level}
                    onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                    className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition ${
                      getErrorForField('grade_level') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select Grade Level</option>
                    <option value="Grade 6">Grade 6</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                  </select>
                  {getErrorForField('grade_level') && (
                    <p className="mt-1 text-sm text-red-600">{getErrorForField('grade_level')}</p>
                  )}
                </div>

                {/* Subject */}
                <div className="mb-6">
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
                  >
                    <option value="ICT">ICT</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Digital Literacy">Digital Literacy</option>
                    <option value="Programming">Programming</option>
                  </select>
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className={`block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition ${
                      getErrorForField('description') ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Brief description of what students will learn in this module..."
                    maxLength={500}
                  />
                  <div className="flex justify-between mt-1">
                    {getErrorForField('description') ? (
                      <p className="text-sm text-red-600">{getErrorForField('description')}</p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Optional. Max 500 characters.
                      </p>
                    )}
                    <span className="text-sm text-gray-500">
                      {formData.description.length}/500
                    </span>
                  </div>
                </div>

                {/* Form Errors */}
                {formErrors.length > 0 && !getErrorForField('module_name') && !getErrorForField('grade_level') && !getErrorForField('description') && (
                  <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <p className="font-medium">Please fix the following errors:</p>
                    <ul className="list-disc list-inside mt-1 text-sm">
                      {formErrors.map((error, index) => (
                        <li key={index}>{error.message}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </span>
                    ) : (
                      isEditing ? 'Update Module' : 'Create Module'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminRoute>
  );
}