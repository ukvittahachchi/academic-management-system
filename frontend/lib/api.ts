const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        credentials: 'include', // Important for cookies/auth
      });
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid response type: ${contentType}`);
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Request Failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        error: 'NETWORK_ERROR',
      };
    }
  }
  
  // Health check
  async healthCheck() {
    return this.request('/health');
  }
  
  // Test database connection
  async testDatabase() {
    return this.request('/test/db');
  }
  
  // Get system info
  async getSystemInfo() {
    return this.request('/test/system');
  }
  
  // Get sample students
  async getStudents() {
    return this.request('/test/students');
  }
  
  // Test CORS
  async testCors() {
    return this.request('/test/cors');
  }
}

export const apiClient = new ApiClient();