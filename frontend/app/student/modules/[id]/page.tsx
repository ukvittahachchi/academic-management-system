'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StudentRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { Module } from '@/lib/types/module';
import { Unit } from '@/lib/types/navigation';
import { getErrorMessage, formatDate } from '@/lib/validation';

export default function ModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [module, setModule] = useState<Module | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'progress'>('overview');

  const moduleId = params.id as string;

  useEffect(() => {
    if (moduleId) {
      fetchModule();
    }
  }, [moduleId]);

  const fetchModule = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getModule(parseInt(moduleId));
      setModule(response.data);

      try {
        const hierarchyResponse = await apiClient.getModuleHierarchy(parseInt(moduleId));
        if (hierarchyResponse.success) {
          setUnits(hierarchyResponse.data.units);
        }
      } catch (err) {
        console.error('Failed to fetch units:', err);
        // Don't block the main module load if units fail, but maybe log it
      }
    } catch (error) {
      console.error('Failed to fetch module:', error);
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartLearning = () => {
    router.push(`/student/modules/${moduleId}/navigation`);
  };

  if (isLoading) {
    return (
      <StudentRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading module details...</p>
          </div>
        </div>
      </StudentRoute>
    );
  }

  if (error || !module) {
    return (
      <StudentRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-5xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              Module Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              {error || 'The module you are looking for does not exist or you do not have access to it.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/student/modules')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg"
              >
                ← Back to Modules
              </button>
              <button
                onClick={fetchModule}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </StudentRoute>
    );
  }

  return (
    <StudentRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-start">
              <div>
                <button
                  onClick={() => router.push('/student/modules')}
                  className="mb-4 text-green-100 hover:text-white flex items-center"
                >
                  <span className="mr-2">←</span> Back to Modules
                </button>
                <h1 className="text-3xl font-bold mb-2">{module.module_name}</h1>
                <div className="flex items-center space-x-4 text-green-100">
                  <span className="px-3 py-1 bg-green-700 rounded-full text-sm">
                    {module.grade_level}
                  </span>
                  <span>{module.subject}</span>
                  <span>•</span>
                  <span>{module.unit_count} Units</span>
                  <span>•</span>
                  <span>{module.content_count} Lessons</span>
                </div>
              </div>
              <div className="text-right">
                <div className="mb-4">
                  <div className="text-2xl font-bold">
                    {module.progress_percentage || 0}%
                  </div>
                  <div className="text-sm text-green-100">Complete</div>
                </div>
                <button
                  onClick={handleStartLearning}
                  className="px-6 py-3 bg-white text-green-700 font-bold rounded-lg hover:bg-green-50 transition"
                >
                  {module.progress_percentage === 0 ? 'Start Learning' :
                    module.progress_percentage === 100 ? 'Review Again' : 'Continue Learning'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">Your Progress</span>
              <span className="font-bold text-green-600">
                {module.progress_percentage === 100 ? 'Completed!' : `${module.progress_percentage}%`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: `${module.progress_percentage || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('units')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'units'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Units ({module.unit_count})
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'progress'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                My Progress
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Description */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">About This Module</h2>
                  {module.description ? (
                    <p className="text-gray-700 whitespace-pre-line">{module.description}</p>
                  ) : (
                    <p className="text-gray-500 italic">No description provided for this module.</p>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">What You'll Learn</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <div className="bg-green-100 p-2 rounded-lg mr-3">
                        <span className="text-green-600">✅</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Basic Concepts</p>
                        <p className="text-sm text-gray-600">Understand fundamental ICT concepts</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <span className="text-blue-600">💻</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Practical Skills</p>
                        <p className="text-sm text-gray-600">Apply knowledge through assignments</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-purple-100 p-2 rounded-lg mr-3">
                        <span className="text-purple-600">📊</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Assessment</p>
                        <p className="text-sm text-gray-600">Test your knowledge with quizzes</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-yellow-100 p-2 rounded-lg mr-3">
                        <span className="text-yellow-600">🏆</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Certification</p>
                        <p className="text-sm text-gray-600">Earn certificate upon completion</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Info & Actions */}
              <div>
                <div className="bg-white rounded-xl shadow p-6 mb-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Module Info</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Created By</p>
                      <p className="font-medium">{module.created_by_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created On</p>
                      <p className="font-medium">{formatDate(module.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Grade Level</p>
                      <p className="font-medium">{module.grade_level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Subject</p>
                      <p className="font-medium">{module.subject}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl shadow p-6 border border-green-200">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Ready to Start?</h2>
                  <p className="text-gray-600 mb-6">
                    Begin your learning journey with this module. Work through units at your own pace.
                  </p>
                  <button
                    onClick={handleStartLearning}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg mb-3"
                  >
                    Start Learning Module
                  </button>
                  <button
                    onClick={() => router.push('/student/modules')}
                    className="w-full py-3 bg-white text-gray-700 border border-gray-300 font-medium rounded-lg hover:bg-gray-50"
                  >
                    Browse Other Modules
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'units' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Units in This Module</h2>
              <div className="space-y-4">
                {/* This will be populated when we implement units */}
                {units.length > 0 ? (
                  <div className="space-y-4">
                    {units.map((unit) => (
                      <div key={unit.unit_id} className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">
                              Unit {unit.unit_order}
                            </span>
                            <h3 className="text-lg font-bold text-gray-800">{unit.unit_name}</h3>
                          </div>
                          {unit.progress_percentage !== undefined && unit.progress_percentage > 0 && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                              {unit.progress_percentage}%
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 mb-4 text-sm line-clamp-2">{unit.description}</p>

                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-gray-500">
                            {unit.total_parts} Lessons • {unit.estimated_time_minutes || 30} mins
                          </div>
                          <button
                            onClick={() => router.push(`/student/modules/${moduleId}/navigation`)}
                            className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center"
                          >
                            Go to Class <span className="ml-1">→</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-5xl mb-6">📖</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">
                      Units Coming Soon
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-8">
                      The units for this module are being prepared by your teacher.
                      Check back soon to start learning!
                    </p>
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
                    >
                      Back to Overview
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">My Learning Progress</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {module.progress_percentage || 0}%
                    </div>
                    <div className="text-sm text-green-800 font-medium">Overall Progress</div>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {module.student_completed_count || 0}
                    </div>
                    <div className="text-sm text-blue-800 font-medium">Lessons Completed</div>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {module.content_count - (module.student_completed_count || 0)}
                    </div>
                    <div className="text-sm text-purple-800 font-medium">Lessons Remaining</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Study History</h3>
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-4xl mb-6">📊</div>
                    <p className="text-gray-600">
                      Your detailed progress tracking will appear here as you complete lessons.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </StudentRoute>
  );
}