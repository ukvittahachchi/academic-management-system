import { LoginCredentials, LoginResponse, User } from './auth';

// Dashboard Types
import {
  DashboardData,
  DashboardOverview,
  UpcomingAssignment,
  GradeOverview,
  PerformanceHistory,
  ModuleProgress,
  StudyTimeStat
} from './types/dashboard';

// Module Types
import {
  Module,
  CreateModuleData,
  UpdateModuleData,
  ModuleFilters,
  ModuleStatistics
} from './types/module';

// Navigation Types
import {
  ModuleHierarchy,
  Unit,
  LearningPart,
  StudentProgress,
  ProgressUpdate,
  BookmarkData
} from './types/navigation';

// Content Types
import {
  ContentResponse,
  DownloadableContent,
  DownloadUrlResponse
} from './types/content';

// Assignment Types
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
      credentials: 'include', // Crucial for cookie-based auth
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

  // --- Role Based Dashboard Fetchers ---

  async getStudentDashboard() {
    const response = await this.request<{ data: DashboardData }>('/dashboard');
    return response.data;
  }

  async getTeacherDashboard() {
    return this.request('/auth/dashboard/teacher');
  }

  async getAdminDashboard() {
    return this.request('/auth/dashboard/admin');
  }

  /**
   * Main Dashboard Entry Point
   * Fetches data based on the current user's role
   */
  async getDashboardData(): Promise<DashboardData> {
    const userResponse = await this.getCurrentUser();
    const role = userResponse.data?.role;

    switch (role) {
      case 'student':
        return this.getStudentDashboard() as Promise<DashboardData>;
      case 'teacher':
        return this.getTeacherDashboard() as Promise<any>; // TODO: Add TeacherDashboard type
      case 'admin':
        return this.getAdminDashboard() as Promise<any>; // TODO: Add AdminDashboard type
      default:
        throw new Error(`Unknown or missing user role: ${role}`);
    }
  }

  // --- Specific Dashboard Widgets (Migrated from dashboardAPI) ---

  async getDashboardOverview(): Promise<DashboardOverview> {
    const response = await this.request<{ data: DashboardOverview }>('/dashboard/overview');
    return response.data;
  }

  async getUpcomingAssignments(limit?: number): Promise<UpcomingAssignment[]> {
    const queryString = limit ? `?limit=${limit}` : '';
    const response = await this.request<{ data: UpcomingAssignment[] }>(`/dashboard/upcoming-assignments${queryString}`);
    return response.data;
  }

  async getGradesOverview(): Promise<GradeOverview[]> {
    const response = await this.request<{ data: GradeOverview[] }>('/dashboard/grades');
    return response.data;
  }

  async getPerformanceHistory(days?: number): Promise<PerformanceHistory[]> {
    const queryString = days ? `?days=${days}` : '';
    const response = await this.request<{ data: PerformanceHistory[] }>(`/dashboard/performance-history${queryString}`);
    return response.data;
  }

  async getModuleProgress(): Promise<ModuleProgress[]> {
    const response = await this.request<{ data: ModuleProgress[] }>('/dashboard/module-progress');
    return response.data;
  }

  async getStudyTimeStats(): Promise<StudyTimeStat[]> {
    const response = await this.request<{ data: StudyTimeStat[] }>('/dashboard/study-time');
    return response.data;
  }

  async getActivityStreak(): Promise<{ current_streak: number }> {
    const response = await this.request<{ data: { current_streak: number } }>('/dashboard/activity-streak');
    return response.data;
  }

  // ======================
  // MODULE MANAGEMENT
  // ======================

  async getModules(filters?: ModuleFilters): Promise<{
    success: boolean;
    count: number;
    data: Module[]
  }> {
    const queryParams = new URLSearchParams();

    if (filters) {
      if (filters.grade_level) queryParams.set('grade_level', filters.grade_level);
      if (filters.subject) queryParams.set('subject', filters.subject);
      if (filters.is_published !== undefined) {
        queryParams.set('is_published', filters.is_published.toString());
      }
    }

    const queryString = queryParams.toString();
    const url = `/modules${queryString ? `?${queryString}` : ''}`;

    return this.request(url);
  }

  async getModule(id: number): Promise<{
    success: boolean;
    data: Module
  }> {
    return this.request(`/modules/${id}`);
  }

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

  async deleteModule(id: number): Promise<{
    success: boolean;
    message: string
  }> {
    return this.request(`/modules/${id}`, {
      method: 'DELETE',
    });
  }

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

  async getModuleStatistics(): Promise<{
    success: boolean;
    data: ModuleStatistics
  }> {
    return this.request('/modules/statistics');
  }

  async getGradeLevels(): Promise<{
    success: boolean;
    data: string[]
  }> {
    return this.request('/modules/grade-levels');
  }

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

  async getModuleHierarchy(moduleId: number): Promise<{
    success: boolean;
    data: ModuleHierarchy;
  }> {
    return this.request(`/navigation/modules/${moduleId}/hierarchy`);
  }

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

  async getProgressOverview(): Promise<{
    success: boolean;
    data: StudentProgress;
  }> {
    return this.request('/navigation/progress/overview');
  }

  async getResumePoint(): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    return this.request('/navigation/resume');
  }

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

  async getContentDetails(partId: number): Promise<ContentResponse> {
    const response = await this.request<{ data: ContentResponse }>(`/content/${partId}`);
    return response.data;
  }

  async markAsCompleted(partId: number): Promise<void> {
    await this.request(`/content/${partId}/complete`, {
      method: 'POST',
    });
  }

  async getDownloadUrl(partId: number): Promise<DownloadUrlResponse> {
    const response = await this.request<{ data: DownloadUrlResponse }>(`/content/${partId}/download-url`);
    return response.data;
  }

  async getDownloadableContent(moduleId?: number): Promise<DownloadableContent[]> {
    const queryString = moduleId ? `?moduleId=${moduleId}` : '';
    const response = await this.request<{ data: DownloadableContent[] }>(`/content/downloads/list${queryString}`);
    return response.data;
  }

  async updateAccessTime(partId: number, timeSpent: number): Promise<void> {
    await this.request(`/content/${partId}/access-time`, {
      method: 'POST',
      body: JSON.stringify({ timeSpent }),
    });
  }

  // ======================
  // ASSIGNMENT SYSTEM
  // ======================

  async getAssignmentDetails(partId: number): Promise<AssignmentDetailsResponse> {
    const response = await this.request<{ data: AssignmentDetailsResponse }>(`/assignments/${partId}/details`);
    return response.data;
  }

  async startAssignmentAttempt(partId: number): Promise<StartAttemptResponse> {
    const response = await this.request<{ data: StartAttemptResponse }>(`/assignments/${partId}/start`, {
      method: 'POST',
    });
    return response.data;
  }

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

  async autoSaveAssignmentProgress(attemptId: number, timeRemaining: number): Promise<{ timed_out?: boolean }> {
    return this.request<{ timed_out?: boolean }>(`/assignments/attempt/${attemptId}/auto-save`, {
      method: 'POST',
      body: JSON.stringify({ timeRemaining })
    });
  }

  async submitAssignment(attemptId: number, answers: any): Promise<SubmissionResponse> {
    const response = await this.request<{ data: SubmissionResponse }>(`/assignments/attempt/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });
    return response.data;
  }

  async getSubmissionReview(submissionId: number): Promise<{ submission: Submission, questions: any[] }> {
    const response = await this.request<{ data: { submission: Submission, questions: any[] } }>(
      `/assignments/submission/${submissionId}/review`
    );
    return response.data;
  }

  async getAssignmentHistory(assignmentId: number): Promise<Submission[]> {
    const response = await this.request<{ data: Submission[] }>(`/assignments/${assignmentId}/history`);
    return response.data;
  }

  async getStudentAssignments(): Promise<StudentAssignment[]> {
    const response = await this.request<{ data: StudentAssignment[] }>(`/assignments/student/all`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
// Exporting as assignmentAPI as well to maintain backward compatibility if needed
export const assignmentAPI = apiClient;
export const dashboardAPI = apiClient;