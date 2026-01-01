'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudentRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { ModuleHierarchy, Unit, LearningPart } from '@/lib/types/navigation';
import { LoadingSpinner, CardSkeleton, ProgressBar } from '@/components/ui/LoadingSpinner';
import { ErrorMessage, EmptyState } from '@/components/ui/ErrorMessage';
import Link from 'next/link';

export default function ModuleNavigationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [moduleHierarchy, setModuleHierarchy] = useState<ModuleHierarchy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const moduleId = params.id as string;

  useEffect(() => {
    if (moduleId) {
      fetchModuleHierarchy();
    }
  }, [moduleId]);

  const fetchModuleHierarchy = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getModuleHierarchy(parseInt(moduleId));
      setModuleHierarchy(response.data);

      // Auto-expand units with in-progress content
      const inProgressUnitIds = response.data.units
        .filter(unit => unit.has_in_progress)
        .map(unit => unit.unit_id);

      if (inProgressUnitIds.length > 0) {
        setExpandedUnits(inProgressUnitIds);
      } else if (response.data.units.length > 0) {
        // Expand first unit by default
        setExpandedUnits([response.data.units[0].unit_id]);
      }
    } catch (error: any) {
      console.error('Failed to fetch module hierarchy:', error);
      setError(error.message || 'Failed to load module content');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUnit = (unitId: number) => {
    setExpandedUnits(prev =>
      prev.includes(unitId)
        ? prev.filter(id => id !== unitId)
        : [...prev, unitId]
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await apiClient.searchInModule(parseInt(moduleId), searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const getPartIcon = (type: string) => {
    switch (type) {
      case 'reading': return '📖';
      case 'presentation': return '📊';
      case 'video': return '🎬';
      case 'assignment': return '📝';
      default: return '📄';
    }
  };

  const getPartColor = (type: string) => {
    switch (type) {
      case 'reading': return 'bg-blue-100 text-blue-800';
      case 'presentation': return 'bg-purple-100 text-purple-800';
      case 'video': return 'bg-green-100 text-green-800';
      case 'assignment': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed': return (
        <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          ✅ Completed
        </span>
      );
      case 'in_progress': return (
        <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          ⏳ In Progress
        </span>
      );
      default: return null;
    }
  };

  const handleResume = () => {
    if (moduleHierarchy?.resume_point) {
      router.push(`/student/learn/${moduleHierarchy.resume_point.part_id}`);
    } else if (moduleHierarchy && moduleHierarchy.units && moduleHierarchy.units.length > 0) {
      const firstUnit = moduleHierarchy.units[0];
      if (firstUnit.next_part_id) {
        router.push(`/student/learn/${firstUnit.next_part_id}`);
      }
    }
  };

  if (isLoading) {
    return (
      <StudentRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse space-y-8">
              {/* Header Skeleton */}
              <div className="bg-white rounded-2xl shadow p-8">
                <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-6"></div>
                <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>

              {/* Units Skeleton */}
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow p-6">
                  <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(j => (
                      <div key={j} className="h-4 bg-gray-200 rounded w-full"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </StudentRoute>
    );
  }

  if (error || !moduleHierarchy) {
    return (
      <StudentRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <ErrorMessage
            error={error || 'Module not found'}
            title="Failed to load module"
            onRetry={fetchModuleHierarchy}
          />
        </div>
      </StudentRoute>
    );
  }

  const { module, units, resume_point } = moduleHierarchy;

  return (
    <StudentRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Link
                    href="/student/modules"
                    className="text-blue-100 hover:text-white mr-4"
                  >
                    ← Back to Modules
                  </Link>
                  <span className="px-3 py-1 bg-blue-700 rounded-full text-sm">
                    {module.grade_level}
                  </span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{module.module_name}</h1>
                {module.description && (
                  <p className="text-blue-100 max-w-3xl">{module.description}</p>
                )}
              </div>

              <div className="flex flex-col items-end space-y-4">
                {/* Progress Stats */}
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {module.progress.progress_percentage}%
                  </div>
                  <div className="text-sm text-blue-200">
                    Overall Progress
                  </div>
                </div>

                {/* Resume Button */}
                {resume_point && (
                  <button
                    onClick={handleResume}
                    className="px-6 py-3 bg-white text-blue-700 font-bold rounded-lg hover:bg-blue-50 transition flex items-center"
                  >
                    <span className="mr-2">▶️</span>
                    Resume Learning
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Your Module Progress</span>
                <span className="font-semibold text-blue-600">
                  {module.progress.completed_parts} of {module.progress.total_parts} lessons completed
                </span>
              </div>
              <ProgressBar
                progress={module.progress.progress_percentage}
                color="blue"
                showPercentage={false}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{module.progress.completed_parts}</div>
                <div className="text-gray-600">Lessons Completed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">
                  {module.progress.in_progress_parts}
                </div>
                <div className="text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-600">
                  {module.progress.total_time_formatted}
                </div>
                <div className="text-gray-600">Time Spent</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setSearchResults([]);
                }}
                onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search within this module..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm"
              >
                Search
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-800 mb-2">
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-2">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center p-2 hover:bg-blue-100 rounded"
                    >
                      <span className="mr-3">
                        {result.type === 'unit' ? '📚' : getPartIcon(result.part_type)}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{result.title}</div>
                        <div className="text-sm text-gray-600">
                          {result.type === 'unit' ? 'Unit' : result.part_type}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (result.type === 'unit') {
                            router.push(`/student/units/${result.id}`);
                          } else {
                            router.push(`/student/learn/${result.id}`);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Units Hierarchy */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="space-y-6">
            {units.length === 0 ? (
              <EmptyState
                title="No Units Available"
                message="This module doesn't have any learning units yet. Check back soon!"
                icon="📚"
              />
            ) : (
              units.map((unit) => (
                <div
                  key={unit.unit_id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200"
                >
                  {/* Unit Header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => toggleUnit(unit.unit_id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h2 className="text-xl font-bold text-gray-800 mr-4">
                            Unit {unit.unit_order}: {unit.unit_name}
                          </h2>
                          {unit.has_in_progress && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              ⏳ In Progress
                            </span>
                          )}
                        </div>

                        {unit.description && (
                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {unit.description}
                          </p>
                        )}

                        {/* Unit Stats */}
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="mr-2">📝</span>
                            <span>{unit.total_parts} Lessons</span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-2">⏱️</span>
                            <span>{unit.estimated_time_minutes} min</span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-2">✅</span>
                            <span>{unit.completed_parts || 0} Completed</span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6">
                        <button className="text-gray-400 hover:text-gray-600 text-2xl">
                          {expandedUnits.includes(unit.unit_id) ? '−' : '+'}
                        </button>
                      </div>
                    </div>

                    {/* Unit Progress */}
                    <div className="mt-4">
                      <ProgressBar
                        progress={unit.progress_percentage || 0}
                        label={`Unit Progress (${unit.progress_percentage || 0}%)`}
                        showPercentage={false}
                        color="green"
                      />
                    </div>
                  </div>

                  {/* Unit Content (Collapsible) */}
                  {expandedUnits.includes(unit.unit_id) && (
                    <div className="border-t border-gray-200">
                      {/* Learning Objectives */}
                      {unit.learning_objectives && (
                        <div className="p-6 bg-blue-50">
                          <h3 className="font-semibold text-blue-800 mb-2">
                            Learning Objectives
                          </h3>
                          <div className="text-blue-700 whitespace-pre-line">
                            {unit.learning_objectives}
                          </div>
                        </div>
                      )}

                      {/* Learning Parts */}
                      <div className="p-6">
                        <h3 className="font-semibold text-gray-800 mb-4">
                          Lessons in this Unit
                        </h3>
                        <div className="space-y-3">
                          {Array.from({ length: unit.total_parts }).map((_, index) => {
                            // In real implementation, fetch actual parts
                            const partTypes = ['reading', 'presentation', 'video', 'assignment'];
                            const partType = partTypes[index % 4];
                            const partNumber = index + 1;
                            const isCompleted = unit.completed_parts && partNumber <= unit.completed_parts;
                            const isInProgress = unit.has_in_progress && partNumber === (unit.completed_parts || 0) + 1;

                            return (
                              <div
                                key={index}
                                className={`flex items-center p-4 rounded-lg border ${isInProgress
                                  ? 'border-blue-300 bg-blue-50'
                                  : isCompleted
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                                  }`}
                              >
                                <div className={`p-3 rounded-lg mr-4 ${getPartColor(partType)}`}>
                                  <span className="text-xl">{getPartIcon(partType)}</span>
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <h4 className="font-medium text-gray-800">
                                      Lesson {partNumber}: {partType.charAt(0).toUpperCase() + partType.slice(1)} Title
                                    </h4>
                                    {isCompleted && (
                                      <span className="ml-2 text-green-600">✓</span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {partType === 'reading' && 'Reading material (10 min)'}
                                    {partType === 'presentation' && 'Interactive presentation (15 min)'}
                                    {partType === 'video' && 'Educational video (8 min)'}
                                    {partType === 'assignment' && 'MCQ assignment (20 min)'}
                                  </div>
                                </div>

                                <div className="ml-4">
                                  {isInProgress ? (
                                    <button
                                      onClick={() => router.push(`/student/learn/${unit.next_part_id}`)}
                                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm"
                                    >
                                      Continue
                                    </button>
                                  ) : isCompleted ? (
                                    <button
                                      onClick={() => router.push(`/student/learn/${unit.unit_id * 10 + partNumber}`)}
                                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm"
                                    >
                                      Review
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        // Check if previous part is completed
                                        if (partNumber === 1 || (unit.completed_parts && partNumber <= unit.completed_parts + 1)) {
                                          router.push(`/student/learn/${unit.unit_id * 10 + partNumber}`);
                                        }
                                      }}
                                      className={`px-4 py-2 font-medium rounded-lg text-sm ${partNumber === 1 || (unit.completed_parts && partNumber <= unit.completed_parts + 1)
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        }`}
                                      disabled={!(partNumber === 1 || (unit.completed_parts && partNumber <= unit.completed_parts + 1))}
                                    >
                                      Start
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleResume}
                className="p-6 bg-white rounded-xl shadow text-center hover:shadow-lg transition"
              >
                <div className="text-3xl mb-3">▶️</div>
                <p className="font-bold text-gray-800 mb-2">Continue Learning</p>
                <p className="text-sm text-gray-600">
                  {resume_point
                    ? `Resume from ${resume_point.part_title}`
                    : 'Start from the beginning'}
                </p>
              </button>

              <button
                onClick={() => router.push(`/student/modules/${moduleId}`)}
                className="p-6 bg-white rounded-xl shadow text-center hover:shadow-lg transition"
              >
                <div className="text-3xl mb-3">📊</div>
                <p className="font-bold text-gray-800 mb-2">View Progress</p>
                <p className="text-sm text-gray-600">
                  Check detailed progress and statistics
                </p>
              </button>

              <button
                onClick={() => router.push('/student/modules')}
                className="p-6 bg-white rounded-xl shadow text-center hover:shadow-lg transition"
              >
                <div className="text-3xl mb-3">📚</div>
                <p className="font-bold text-gray-800 mb-2">Browse Modules</p>
                <p className="text-sm text-gray-600">
                  Explore other learning modules
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </StudentRoute>
  );
}