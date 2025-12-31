'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { StudentRoute } from '@/components/auth/ProtectedRoute';
import { apiClient } from '@/lib/api-client';

interface DashboardData {
  dashboard: {
    welcomeMessage: string;
    stats: {
      modulesCompleted: number;
      assignmentsPending: number;
      averageScore: number;
      totalModules: number;
    };
    recentActivity: Array<{
      type: string;
      title: string;
      score?: number;
      status?: string;
      date: string;
    }>;
    upcomingAssignments: Array<{
      title: string;
      dueDate: string;
      module: string;
    }>;
  };
}

export default function StudentDashboardPage() {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await apiClient.getStudentDashboard();
        setDashboardData(data as DashboardData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <StudentRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Student Dashboard
                </h1>
                <p className="text-gray-600">
                  {dashboardData?.dashboard.welcomeMessage || `Welcome, ${user?.fullName}!`}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <p className="font-medium text-gray-900">{user?.fullName}</p>
                  <p className="text-sm text-gray-500">
                    Grade {user?.classGrade} • Roll No: {user?.username}
                  </p>
                </div>
                <button
                  onClick={() => logout()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <span className="text-green-600 text-xl">📚</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Modules Completed</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {dashboardData?.dashboard.stats.modulesCompleted || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  <span className="text-blue-600 text-xl">📝</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Assignments Pending</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {dashboardData?.dashboard.stats.assignmentsPending || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg mr-4">
                  <span className="text-purple-600 text-xl">🏆</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Average Score</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {dashboardData?.dashboard.stats.averageScore || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-500 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg mr-4">
                  <span className="text-yellow-600 text-xl">🎯</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Modules</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {dashboardData?.dashboard.stats.totalModules || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">⏰</span> Recent Activity
              </h2>
              <div className="space-y-4">
                {dashboardData?.dashboard.recentActivity.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No recent activity found.</p>
                ) : (
                    dashboardData?.dashboard.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                        <div className={`p-2 rounded-lg mr-4 ${
                        activity.type === 'assignment' ? 'bg-green-100' :
                        activity.type === 'module' ? 'bg-blue-100' :
                        'bg-purple-100'
                        }`}>
                        <span className={
                            activity.type === 'assignment' ? 'text-green-600' :
                            activity.type === 'module' ? 'text-blue-600' :
                            'text-purple-600'
                        }>
                            {activity.type === 'assignment' ? '📝' :
                            activity.type === 'module' ? '📚' : '🎬'}
                        </span>
                        </div>
                        <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-500">
                            {activity.score !== undefined ? `Score: ${activity.score}%` : `Status: ${activity.status}`}
                        </p>
                        </div>
                        <div className="text-sm text-gray-400">{activity.date}</div>
                    </div>
                    ))
                )}
              </div>
            </div>

            {/* Upcoming Assignments */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📅</span> Upcoming Assignments
              </h2>
              <div className="space-y-4">
                {dashboardData?.dashboard.upcomingAssignments.length === 0 ? (
                     <p className="text-gray-500 text-center py-4">No upcoming assignments.</p>
                ) : (
                    dashboardData?.dashboard.upcomingAssignments.map((assignment, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all bg-gray-50/50">
                        <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-800">{assignment.title}</h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded flex items-center">
                            🕒 {assignment.dueDate}
                        </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">Module: {assignment.module}</p>
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors text-sm">
                        Start Assignment
                        </button>
                    </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Requested Link Integration */}
              <Link
                href="/student/modules"
                className="p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-center transition-all hover:shadow-sm group"
              >
                <div className="text-2xl mb-2 group-transform group-hover:scale-110 transition-transform duration-200">📚</div>
                <p className="font-medium text-green-800">Browse Modules</p>
                <p className="text-sm text-green-600">Start learning now</p>
              </Link>

              <Link 
                href="/student/assignments"
                className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-center transition-all hover:shadow-sm group"
              >
                <div className="text-2xl mb-2 group-transform group-hover:scale-110 transition-transform duration-200">📝</div>
                <p className="font-medium text-blue-800">My Assignments</p>
                <p className="text-sm text-blue-600">View pending work</p>
              </Link>

              <Link 
                href="/student/grades"
                className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-center transition-all hover:shadow-sm group"
              >
                <div className="text-2xl mb-2 group-transform group-hover:scale-110 transition-transform duration-200">📊</div>
                <p className="font-medium text-purple-800">Progress Report</p>
                <p className="text-sm text-purple-600">View your grades</p>
              </Link>

            </div>
          </div>
        </main>
      </div>
    </StudentRoute>
  );
}
