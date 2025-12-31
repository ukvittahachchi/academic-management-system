import { LoginCredentials, LoginResponse, User } from './auth';
// Ensure you have defined these types in './types/module'
import { 
  Module, 
  CreateModuleData, 
  UpdateModuleData, 
  ModuleFilters, 
  ModuleStatistics 
} from './types/module';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiClient {
  /**
   * Generic request handler that manages headers, credentials, and error parsing
   */
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
      
      // Handle non-JSON responses (prevents crashing on 404/500 HTML pages)
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

  async getDashboardData() {
    // Helper: First get user role, then fetch appropriate dashboard
    const userResponse = await this.getCurrentUser();
    const role = userResponse.data?.role;
    
    switch (role) {
      case 'student':
        return this.getStudentDashboard();
      case 'teacher':
        return this.getTeacherDashboard();
      case 'admin':
        return this.getAdminDashboard();
      default:
        throw new Error(`Unknown or missing user role: ${role}`);
    }
  }

  // ======================
  // MODULE MANAGEMENT
  // ======================

  /**
   * Get a list of modules with optional filters
   */
  async getModules(filters?: ModuleFilters): Promise<{ 
    success: boolean; 
    count: number; 
    data: Module[] 
  }> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      if (filters.grade_level) queryParams.set('grade_level', filters.grade_level);
      if (filters.subject) queryParams.set('subject', filters.subject);
      // Explicit check for undefined so false is preserved
      if (filters.is_published !== undefined) {
        queryParams.set('is_published', filters.is_published.toString());
      }
    }
    
    const queryString = queryParams.toString();
    const url = `/modules${queryString ? `?${queryString}` : ''}`;
    
    return this.request(url);
  }

  /**
   * Get a single module by ID
   */
  async getModule(id: number): Promise<{ 
    success: boolean; 
    data: Module 
  }> {
    return this.request(`/modules/${id}`);
  }

  /**
   * Create a new module
   */
  async createModule(moduleData: CreateModuleData): Promise<{ 
    success: boolean; 
    message: string; 
    data: Module 
  }> {
    return this.request('/modules', {
      method: 'POST',
      body: JSON.stringify(moduleData),
    });
  }

  /**
   * Update an existing module
   */
  async updateModule(id: number, updateData: UpdateModuleData): Promise<{ 
    success: boolean; 
    message: string; 
    data: Module 
  }> {
    return this.request(`/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Delete a module
   */
  async deleteModule(id: number): Promise<{ 
    success: boolean; 
    message: string 
  }> {
    return this.request(`/modules/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Toggle publish status (admin/teacher feature)
   */
  async togglePublishModule(id: number, publish: boolean): Promise<{ 
    success: boolean; 
    message: string; 
    data: Module 
  }> {
    return this.request(`/modules/${id}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({ publish }),
    });
  }

  /**
   * Get statistics (total modules, subject breakdown, etc.)
   */
  async getModuleStatistics(): Promise<{ 
    success: boolean; 
    data: ModuleStatistics 
  }> {
    return this.request('/modules/statistics');
  }

  /**
   * Get available grade levels for dropdowns
   */
  async getGradeLevels(): Promise<{ 
    success: boolean; 
    data: string[] 
  }> {
    return this.request('/modules/grade-levels');
  }

  /**
   * Search modules by text query
   */
  async searchModules(query: string): Promise<{ 
    success: boolean; 
    count: number; 
    data: Module[] 
  }> {
    return this.request(`/modules/search?query=${encodeURIComponent(query)}`);
  }
}

export const apiClient = new ApiClient();