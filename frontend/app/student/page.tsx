'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StudentRoute } from '@/components/auth/ProtectedRoute';
import { apiClient } from '@/lib/api-client';

// Keep your interface, but we will check the data structure in the console
interface DashboardData {
  dashboard: {
    welcomeMessage: string;
    stats: {
      modulesCompleted: number;
      assignmentsPending: number;
      averageScore: number;
      totalModules: number;
    };
    recentActivity: Array<any>;
    upcomingAssignments: Array<any>;
  };
}

export default function StudentDashboardPage() {
  const { user } = useAuth(); // Removed logout here, passed down or used in header
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data: any = await apiClient.getStudentDashboard();
        
        // 🔍 DEBUG: Check your browser console to see what the API actually sends!
        console.log("API Response:", data); 

        // HANDLE DATA MISMATCH
        // If API returns data directly (flat) instead of inside "dashboard":
        if (data && !data.dashboard && data.stats) {
            console.warn("Data structure mismatch detected. Fixing...");
            setDashboardData({ dashboard: data } as DashboardData);
        } else {
            setDashboardData(data as DashboardData);
        }

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // ❌ OLD WAY: (This caused the redirect bug)
  // if (isLoading) return <Loading /> 
  // return <StudentRoute> ... </StudentRoute>

  // ✅ NEW WAY: Wrap everything in StudentRoute
  return (
    <StudentRoute>
      {isLoading ? (
        // Loading Spinner inside the protected route
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      ) : (
        // Actual Content
        <div className="min-h-screen bg-gray-50">
           {/* Header */}
           <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
              <p className="text-gray-600">
                {/* Safe Access with ?. */}
                {dashboardData?.dashboard?.welcomeMessage || `Welcome!`}
              </p>
            </div>
           </header>

           {/* Content Body */}
           <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* If data is missing, show a message instead of crashing */}
              {!dashboardData ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">No dashboard data available.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Example Stat Card */}
                    <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                        <p className="text-gray-500">Modules Completed</p>
                        <p className="text-2xl font-bold">
                            {dashboardData.dashboard?.stats?.modulesCompleted ?? 0}
                        </p>
                    </div>
                    {/* ... (Add the rest of your cards here) ... */}
                </div>
              )}
           </main>
        </div>
      )}
    </StudentRoute>
  );
}