'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
  duration?: number;
}

interface StudentsResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    students: any[];
  };
}

export default function TestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'Frontend Loaded', status: 'success', message: 'React is running' },
  ]);
  const [isTesting, setIsTesting] = useState(false);

  const runTests = async () => {
    setIsTesting(true);
    
    // --- FIX: Define the Base URL with a fallback ---
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    console.log("Current API Base URL:", API_BASE_URL);

    const results: TestResult[] = [
      { name: 'Frontend Loaded', status: 'success', message: 'React is running' },
    ];

    // Test 1: Backend Health Check
    const start1 = Date.now();
    try {
      const health = await apiClient.healthCheck();
      const duration = Date.now() - start1;
      results.push({
        name: 'Backend API',
        status: health.success ? 'success' : 'error',
        message: health.message,
        data: health.data,
        duration
      });
    } catch (error) {
      results.push({
        name: 'Backend API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection failed',
        duration: Date.now() - start1
      });
    }

    // Test 2: Database Connection
    const start2 = Date.now();
    try {
      const dbTest = await apiClient.testDatabase();
      const duration = Date.now() - start2;
      results.push({
        name: 'MySQL Database',
        status: dbTest.success ? 'success' : 'error',
        message: dbTest.message,
        data: dbTest.data,
        duration
      });
    } catch (error) {
      results.push({
        name: 'MySQL Database',
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection failed',
        duration: Date.now() - start2
      });
    }

    // Test 3: Get Students (Test Data)
    const start3 = Date.now();
    try {
      const students = await apiClient.getStudents() as StudentsResponse;
      const duration = Date.now() - start3;
      const count = students.data?.count || 0;
      results.push({
        name: 'Sample Data',
        status: students.success ? 'success' : 'error',
        message: `Found ${count} students`,
        data: students.data,
        duration
      });
    } catch (error) {
      results.push({
        name: 'Sample Data',
        status: 'error',
        message: error instanceof Error ? error.message : 'Data fetch failed',
        duration: Date.now() - start3
      });
    }

    // Test 4: CORS Test
    const start4 = Date.now();
    try {
      // FIX: Use API_BASE_URL instead of direct process.env
      const response = await fetch(`${API_BASE_URL}/test/cors`, {
        method: 'GET',
        credentials: 'include'
      });
      
      const duration = Date.now() - start4;
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      results.push({
        name: 'CORS Configuration',
        status: 'success',
        message: data.message || 'CORS Check Passed',
        data: data.cors || data,
        duration
      });
    } catch (error) {
      results.push({
        name: 'CORS Configuration',
        status: 'error',
        message: error instanceof Error ? error.message : 'CORS test failed',
        duration: Date.now() - start4
      });
    }

    // Test 5: POST Request Test
    const start5 = Date.now();
    try {
      // FIX: Use API_BASE_URL instead of direct process.env
      const response = await fetch(`${API_BASE_URL}/test/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data', number: 123 }),
        credentials: 'include'
      });
      
      const duration = Date.now() - start5;

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      results.push({
        name: 'POST Requests',
        status: 'success',
        message: data.message || 'POST Echo successful',
        data: { received: data.data?.test || data },
        duration
      });
    } catch (error) {
      results.push({
        name: 'POST Requests',
        status: 'error',
        message: error instanceof Error ? error.message : 'POST test failed',
        duration: Date.now() - start5
      });
    }

    setTestResults(results);
    setIsTesting(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-300';
      case 'error': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Full Stack Connection Test</h1>
        <p className="text-gray-600 mb-6">
          Testing connectivity between frontend, backend, and databases.
        </p>
        
        <div className="mb-6">
          <button
            onClick={runTests}
            disabled={isTesting}
            className={`px-4 py-2 rounded-lg font-medium ${
              isTesting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isTesting ? 'Running Tests...' : 'Run Tests Again'}
          </button>
          <span className="ml-4 text-sm text-gray-500">
            Tests run automatically on page load
          </span>
        </div>

        <div className="space-y-4">
          {testResults.map((test, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getStatusColor(test.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-3">{getStatusIcon(test.status)}</span>
                  <div>
                    <h3 className="font-medium">{test.name}</h3>
                    <p className="text-sm opacity-80">{test.message}</p>
                  </div>
                </div>
                <div className="text-right">
                  {test.duration && (
                    <div className="text-sm font-mono">{test.duration}ms</div>
                  )}
                  <div className="text-xs uppercase font-semibold mt-1">
                    {test.status}
                  </div>
                </div>
              </div>
              
              {test.data && (
                <div className="mt-3 pt-3 border-t border-opacity-30">
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium">View Details</summary>
                    <pre className="mt-2 p-2 bg-black bg-opacity-10 rounded overflow-x-auto">
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-8 pt-6 border-t">
          <h3 className="font-bold text-gray-700 mb-3">System Information:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium">Frontend</div>
              <div className="text-gray-600">localhost:3000</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium">Backend API</div>
              <div className="text-gray-600">localhost:5000</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium">MySQL</div>
              <div className="text-gray-600">XAMPP (localhost:3306)</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="font-medium">MongoDB</div>
              <div className="text-gray-600">Atlas (Cloud)</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-yellow-800 mb-2">Development Tips:</h3>
        <ul className="text-yellow-700 text-sm space-y-1">
          <li>• Backend hot reloads automatically when you save files</li>
          <li>• Frontend updates instantly with Fast Refresh</li>
          <li>• Check browser console for API errors</li>
          <li>• Check backend terminal for server logs</li>
        </ul>
      </div>
    </div>
  );
}