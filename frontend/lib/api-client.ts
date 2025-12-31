import { LoginCredentials, LoginResponse, User } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    // Include credentials (cookies) for all requests
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include', // This is crucial for cookie-based auth
    };
    
    try {
      const response = await fetch(url, requestOptions);
      
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
      throw error;
    }
  }
  
  // ======================
  // AUTHENTICATION
  // ======================
  
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }
  
  async logout(): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }
  
  async getCurrentUser(): Promise<{ success: boolean; data: User }> {
    return this.request('/auth/me');
  }
  
  async checkAuth(): Promise<{ 
    success: boolean; 
    authenticated: boolean; 
    user?: User 
  }> {
    return this.request('/auth/check');
  }
  
  async refreshToken(): Promise<{ success: boolean; message: string }> {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }
  
  async changePassword(currentPassword: string, newPassword: string): Promise<{ 
    success: boolean; 
    message: string 
  }> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }
  
  async getRoleInfo(): Promise<{ 
    success: boolean; 
    data: { role: string; roleInfo: any; permissions: string[] } 
  }> {
    return this.request('/auth/role-info');
  }
  
  // ======================
  // DASHBOARD DATA
  // ======================
  
  async getStudentDashboard() {
    return this.request('/auth/dashboard/student');
  }
  
  async getTeacherDashboard() {
    return this.request('/auth/dashboard/teacher');
  }
  
  async getAdminDashboard() {
    return this.request('/auth/dashboard/admin');
  }
  
  // ======================
  // ROLE-SPECIFIC REQUESTS
  // ======================
  
  async getDashboardData() {
    // First get user role, then fetch appropriate dashboard
    const user = await this.getCurrentUser();
    switch (user.data.role) {
      case 'student':
        return this.getStudentDashboard();
      case 'teacher':
        return this.getTeacherDashboard();
      case 'admin':
        return this.getAdminDashboard();
      default:
        throw new Error('Unknown user role');
    }
  }
}

export const apiClient = new ApiClient();