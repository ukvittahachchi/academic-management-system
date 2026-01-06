import { LoginCredentials, LoginResponse, User } from './auth';
// Ensure you have defined these types in './types/module'
import {
  Module,
  CreateModuleData,
  UpdateModuleData,
  ModuleFilters,
  ModuleStatistics
} from './types/module';

// New imports for Navigation functionality
import {
  ModuleHierarchy,
  Unit,
  LearningPart,
  StudentProgress,
  ProgressUpdate,
  BookmarkData
} from './types/navigation';

// New imports for Content functionality
import {
  ContentResponse,
  DownloadableContent,
  DownloadUrlResponse
} from './types/content';

// New imports for Assignment functionality
import {
  AssignmentDetailsResponse,
  StartAttemptResponse,
  SubmissionResponse,
  Submission,
  StudentAssignment
} from './types/assignment';

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
   * Search modules by text query (Finds Modules)
   */
  async searchModules(query: string): Promise<{
    success: boolean;
    count: number;
    data: Module[]
  }> {
    return this.request(`/modules/search?query=${encodeURIComponent(query)}`);
  }

  // ======================
  // MODULE NAVIGATION
  // ======================

  /**
   * Get the full hierarchy (units/parts) of a specific module
   */
  async getModuleHierarchy(moduleId: number): Promise<{
    success: boolean;
    data: ModuleHierarchy;
  }> {
    return this.request(`/navigation/modules/${moduleId}/hierarchy`);
  }

  /**
   * Get details for a specific unit, including its learning parts
   */
  async getUnitDetails(unitId: number): Promise<{
    success: boolean;
    data: {
      unit: Unit;
      parts: LearningPart[];
      next_unit: Unit | null;
      navigation: any;
    };
  }> {
    return this.request(`/navigation/units/${unitId}`);
  }

  /**
   * Get a specific learning part (content) with navigation context
   */
  async getLearningPart(partId: number): Promise<{
    success: boolean;
    data: {
      part: LearningPart & { student_progress: any };
      hierarchy: any;
      navigation: any;
    };
  }> {
    return this.request(`/navigation/parts/${partId}`);
  }

  /**
   * Update student progress for a specific part
   */
  async updateProgress(partId: number, progress: ProgressUpdate): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    return this.request(`/navigation/parts/${partId}/progress`, {
      method: 'POST',
      body: JSON.stringify(progress),
    });
  }

  // ======================
  // PROGRESS & BOOKMARKS
  // ======================

  /**
   * Get overview of student progress across modules
   */
  async getProgressOverview(): Promise<{
    success: boolean;
    data: StudentProgress;
  }> {
    return this.request('/navigation/progress/overview');
  }

  /**
   * Get the last accessed point to resume learning
   */
  async getResumePoint(): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    return this.request('/navigation/resume');
  }

  /**
   * Create a new bookmark
   */
  async addBookmark(bookmarkData: BookmarkData): Promise<{
    success: boolean;
    message: string;
    data: { bookmark_id: number };
  }> {
    return this.request('/navigation/bookmarks', {
      method: 'POST',
      body: JSON.stringify(bookmarkData),
    });
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(bookmarkId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/navigation/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
    });
  }

  // ======================
  // CONTENT SEARCH
  // ======================

  /**
   * Search for content *inside* a specific module
   */
  async searchInModule(moduleId: number, query: string): Promise<{
    success: boolean;
    count: number;
    data: any[];
  }> {
    return this.request(`/navigation/modules/${moduleId}/search?query=${encodeURIComponent(query)}`);
  }

  // ======================
  // CONTENT MANAGEMENT
  // ======================

  /**
   * Get content details (Wraps the response data)
   */
  async getContentDetails(partId: number): Promise<ContentResponse> {
    const response = await this.request<{ data: ContentResponse }>(`/content/${partId}`);
    return response.data;
  }

  /**
   * Mark content as completed
   */
  async markAsCompleted(partId: number): Promise<void> {
    await this.request(`/content/${partId}/complete`, {
      method: 'POST',
    });
  }

  /**
   * Get download URL for content
   */
  async getDownloadUrl(partId: number): Promise<DownloadUrlResponse> {
    const response = await this.request<{ data: DownloadUrlResponse }>(`/content/${partId}/download-url`);
    return response.data;
  }

  /**
   * Get all downloadable content, optionally filtered by module
   */
  async getDownloadableContent(moduleId?: number): Promise<DownloadableContent[]> {
    const queryString = moduleId ? `?moduleId=${moduleId}` : '';
    const response = await this.request<{ data: DownloadableContent[] }>(`/content/downloads/list${queryString}`);
    return response.data;
  }

  /**
   * Update access time for analytics
   */
  async updateAccessTime(partId: number, timeSpent: number): Promise<void> {
    await this.request(`/content/${partId}/access-time`, {
      method: 'POST',
      body: JSON.stringify({ timeSpent }),
    });
  }

  // ======================
  // ASSIGNMENT SYSTEM
  // ======================

  /**
   * Get details for an assignment (time limit, instructions, etc.)
   */
  async getAssignmentDetails(partId: number): Promise<AssignmentDetailsResponse> {
    // Note: 'data' wrapper is handled in type or here.
    // Assuming API returns { success: true, data: { ... } }
    const response = await this.request<{ data: AssignmentDetailsResponse }>(`/assignments/${partId}/details`);
    return response.data;
  }

  /**
   * Start a new assignment attempt
   */
  async startAssignmentAttempt(partId: number): Promise<StartAttemptResponse> {
    const response = await this.request<{ data: StartAttemptResponse }>(`/assignments/${partId}/start`, {
      method: 'POST',
    });
    return response.data;
  }

  /**
   * Save progress (manual save triggered by user or navigation)
   */
  async saveAssignmentProgress(
    attemptId: number,
    answers: any,
    timeRemaining: number,
    currentQuestion: number
  ): Promise<void> {
    await this.request(`/assignments/attempt/${attemptId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ answers, timeRemaining, currentQuestion })
    });
  }

  /**
   * Auto-save progress (background sync)
   * Returns timed_out status if the server calculates time is up
   */
  async autoSaveAssignmentProgress(attemptId: number, timeRemaining: number): Promise<{ timed_out?: boolean }> {
    return this.request<{ timed_out?: boolean }>(`/assignments/attempt/${attemptId}/auto-save`, {
      method: 'POST',
      body: JSON.stringify({ timeRemaining })
    });
  }

  /**
   * Submit the assignment for grading
   */
  async submitAssignment(attemptId: number, answers: any): Promise<SubmissionResponse> {
    const response = await this.request<{ data: SubmissionResponse }>(`/assignments/attempt/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });
    return response.data;
  }

  /**
   * Get a review of a completed submission
   */
  async getSubmissionReview(submissionId: number): Promise<{ submission: Submission, questions: any[] }> {
    const response = await this.request<{ data: { submission: Submission, questions: any[] } }>(
      `/assignments/submission/${submissionId}/review`
    );
    return response.data;
  }

  /**
   * Get history of attempts for a specific assignment
   */
  async getAssignmentHistory(assignmentId: number): Promise<Submission[]> {
    const response = await this.request<{ data: Submission[] }>(`/assignments/${assignmentId}/history`);
    return response.data;
  }

  /**
   * Get all assignments assigned to the current student
   */
  async getStudentAssignments(): Promise<StudentAssignment[]> {
    const response = await this.request<{ data: StudentAssignment[] }>(`/assignments/student/all`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
export const assignmentAPI = apiClient;