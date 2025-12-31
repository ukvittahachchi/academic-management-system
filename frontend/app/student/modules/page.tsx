'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StudentRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { Module, ModuleFilters } from '@/lib/types/module';
import { getErrorMessage, formatDate } from '@/lib/validation';

export default function StudentModulesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [modules, setModules] = useState<Module[]>([]);
  const [filteredModules, setFilteredModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<ModuleFilters>({
    is_published: true // Students should only see published modules
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch modules on mount
  useEffect(() => {
    fetchModules();
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

  const handleFilterChange = (key: keyof ModuleFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  return (
    <StudentRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  My Learning Modules
                </h1>
                <p className="text-gray-600">
                  Browse and start your learning modules
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Filters and Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search modules..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Grade Level Filter */}
              <div>
                <select
                  value={filters.grade_level || 'all'}
                  onChange={(e) => handleFilterChange('grade_level', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Grade Levels</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modules Grid (Card View for Students) */}
          <div className="mb-8">
            {isLoading ? (
              <div className="p-8 text-center bg-white rounded-xl shadow">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading modules...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center bg-white rounded-xl shadow">
                <div className="text-red-600 mb-4 text-4xl">❌</div>
                <p className="text-gray-800 mb-2">Failed to load modules</p>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchModules}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Try Again
                </button>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl shadow">
                <div className="text-gray-400 text-6xl mb-4">📚</div>
                <p className="text-xl text-gray-800 mb-2">No modules found</p>
                <p className="text-gray-600">
                  {searchQuery ? 'Try a different search term.' : 'There are no modules available for you right now.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredModules.map((module) => (
                  <div key={module.module_id} className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full border border-gray-100">
                    <div className="p-6 flex-grow">
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                          {module.grade_level}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {module.subject}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {module.module_name}
                      </h3>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {module.description || 'No description available for this module.'}
                      </p>

                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <span className="mr-3">📚 {module.unit_count} Units</span>
                        <span>📝 {module.content_count} Items</span>
                      </div>
                    </div>

                    <div className="p-6 pt-0 mt-auto">
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                        <span>Progress</span>
                        <span>0%</span>
                      </div>

                      <button
                        onClick={() => router.push(`/student/modules/${module.module_id}`)}
                        className="w-full block text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                      >
                        Start Learning
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentRoute>
  );
}
