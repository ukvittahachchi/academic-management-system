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

// Teacher Types
import {
  TeacherDashboardData,
  TeacherClass,
  TeacherStudent,
  ClassPerformance,
  AssignmentPerformance,
  PerformanceDistribution,
  ActivityTrend,
  TopPerformer,
  StudentNeedingAttention,
  TeacherFilters
} from './types/teacher';

// Analytics Types
import {
  StudentAnalytics,
  AnalyticsSummary,
  ImprovementRecommendation,
  StudySession,
  WeakAreaInput
} from './types/analytics';

// Report Types
import {
  ReportGenerationRequest,
  ReportGenerationResponse,
  ReportsListResponse,
  ReportConfigResponse,
  ReportFilter
} from './types/report';

// Admin Types
import {
  AdminUser,
  CreateUserInput,
  UpdateUserInput,
  UserListResponse,
  AuditLogListResponse,
  SystemSettings
} from './types/admin';

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
        // Handle void responses or non-json errors
        if (response.ok) return {} as T;
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

  /**
   * Fetches the specific Teacher Dashboard Data
   */
  async getTeacherDashboard(): Promise<TeacherDashboardData> {
    const response = await this.request<{ data: TeacherDashboardData }>('/teacher/dashboard');
    return response.data;
  }

  async getAdminDashboard() {
    return this.request('/auth/dashboard/admin');
  }

  /**
   * Main Dashboard Entry Point
   * Fetches data based on the current user's role
   */
  async getDashboardData(): Promise<DashboardData | TeacherDashboardData | any> {
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
  // ADMIN MANAGEMENT
  // ======================

  async getUsers(page: number = 1, limit: number = 20, filters?: { role?: string, search?: string }): Promise<UserListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.role) params.append('role', filters.role);
    if (filters?.search) params.append('search', filters.search);

    const response = await this.request<{ data: UserListResponse }>(`/users?${params.toString()}`);
    return response.data;
  }

  async getUser(userId: number): Promise<AdminUser> {
    const response = await this.request<{ data: AdminUser }>(`/users/${userId}`);
    return response.data;
  }

  async createUser(userData: CreateUserInput): Promise<AdminUser> {
    const response = await this.request<{ data: AdminUser }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response.data;
  }

  async updateUser(userId: number, updateData: UpdateUserInput): Promise<AdminUser> {
    const response = await this.request<{ data: AdminUser }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    return response.data;
  }

  async deleteUser(userId: number): Promise<void> {
    await this.request(`/users/${userId}`, {
      method: 'DELETE'
    });
  }

  async getAuditLogs(page: number = 1, limit: number = 20): Promise<AuditLogListResponse> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await this.request<{ data: AuditLogListResponse }>(`/users/audit-logs?${queryParams.toString()}`);
    return response.data;
  }

  async getSettings(): Promise<SystemSettings> {
    const response = await this.request<{ data: SystemSettings }>('/settings');
    return response.data;
  }

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const response = await this.request<{ data: SystemSettings }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    return response.data;
  }

  // --- Specific Dashboard Widgets (Student) ---

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
  // TEACHER MANAGEMENT
  // ======================

  async getTeacherClasses(): Promise<TeacherClass[]> {
    const response = await this.request<{ data: TeacherClass[] }>('/teacher/classes');
    return response.data;
  }

  async getClassStudents(filters?: any): Promise<{
    students: TeacherStudent[];
    total: number;
    filters: any;
  }> {
    const queryParams = new URLSearchParams(filters || {}).toString();
    const url = queryParams ? `/teacher/students?${queryParams}` : '/teacher/students';
    const response = await this.request<{ data: { students: TeacherStudent[]; total: number; filters: any } }>(url);
    return response.data;
  }

  async getClassPerformance(filters?: any): Promise<ClassPerformance[]> {
    const queryParams = new URLSearchParams(filters || {}).toString();
    const url = queryParams ? `/teacher/performance?${queryParams}` : '/teacher/performance';
    const response = await this.request<{ data: ClassPerformance[] }>(url);
    return response.data;
  }

  async getStudentPerformance(studentId: number, moduleId?: number): Promise<any> {
    const url = moduleId
      ? `/teacher/students/${studentId}/performance?module_id=${moduleId}`
      : `/teacher/students/${studentId}/performance`;
    const response = await this.request<{ data: any }>(url);
    return response.data;
  }

  async getAssignmentPerformance(filters?: any): Promise<AssignmentPerformance[]> {
    const queryParams = new URLSearchParams(filters || {}).toString();
    const url = queryParams ? `/teacher/assignments/performance?${queryParams}` : '/teacher/assignments/performance';
    const response = await this.request<{ data: AssignmentPerformance[] }>(url);
    return response.data;
  }

  async getPerformanceDistribution(filters?: any): Promise<PerformanceDistribution[]> {
    const queryParams = new URLSearchParams(filters || {}).toString();
    const url = queryParams ? `/teacher/performance/distribution?${queryParams}` : '/teacher/performance/distribution';
    const response = await this.request<{ data: PerformanceDistribution[] }>(url);
    return response.data;
  }

  async getActivityTrends(days?: number): Promise<ActivityTrend[]> {
    const url = days ? `/teacher/activity/trends?days=${days}` : '/teacher/activity/trends';
    const response = await this.request<{ data: ActivityTrend[] }>(url);
    return response.data;
  }

  async getTopPerformers(limit?: number, filters?: any): Promise<TopPerformer[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    const url = `/teacher/top-performers?${params.toString()}`;
    const response = await this.request<{ data: TopPerformer[] }>(url);
    return response.data;
  }

  async getStudentsNeedingAttention(limit?: number, filters?: any): Promise<StudentNeedingAttention[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }
    const url = `/teacher/attention-needed?${params.toString()}`;
    const response = await this.request<{ data: StudentNeedingAttention[] }>(url);
    return response.data;
  }

  async getDashboardFilters(): Promise<TeacherFilters> {
    const response = await this.request<{ data: TeacherFilters }>('/teacher/filters');
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

  // ======================
  // ANALYTICS & INSIGHTS
  // ======================

  async getStudentAnalytics(studentId: number, moduleId?: number): Promise<StudentAnalytics> {
    const url = moduleId
      ? `/analytics/student/${studentId}/comprehensive?module_id=${moduleId}`
      : `/analytics/student/${studentId}/comprehensive`;

    const response = await this.request<{ data: StudentAnalytics }>(url);
    return response.data;
  }

  async getStudentProgressAnalytics(studentId: number, filters?: any): Promise<any[]> {
    const queryParams = new URLSearchParams(filters || {}).toString();
    const url = queryParams
      ? `/analytics/student/${studentId}/progress?${queryParams}`
      : `/analytics/student/${studentId}/progress`;

    const response = await this.request<{ data: any[] }>(url);
    return response.data;
  }

  async getStudentAssignmentPerformance(studentId: number, filters?: any): Promise<any[]> {
    const queryParams = new URLSearchParams(filters || {}).toString();
    const url = queryParams
      ? `/analytics/student/${studentId}/assignments?${queryParams}`
      : `/analytics/student/${studentId}/assignments`;

    const response = await this.request<{ data: any[] }>(url);
    return response.data;
  }

  async getTimeSpentAnalysis(studentId: number, filters?: any): Promise<any[]> {
    const queryParams = new URLSearchParams(filters || {}).toString();
    const url = queryParams
      ? `/analytics/student/${studentId}/time-spent?${queryParams}`
      : `/analytics/student/${studentId}/time-spent`;

    const response = await this.request<{ data: any[] }>(url);
    return response.data;
  }

  async getWeakAreas(studentId: number, filters?: any): Promise<any[]> {
    const queryParams = new URLSearchParams(filters || {}).toString();
    const url = queryParams
      ? `/analytics/student/${studentId}/weak-areas?${queryParams}`
      : `/analytics/student/${studentId}/weak-areas`;

    const response = await this.request<{ data: any[] }>(url);
    return response.data;
  }

  async addWeakArea(studentId: number, weakAreaData: WeakAreaInput): Promise<{ weak_area_id: number }> {
    const response = await this.request<{ data: { weak_area_id: number } }>(`/analytics/student/${studentId}/weak-areas`, {
      method: 'POST',
      body: JSON.stringify(weakAreaData)
    });
    return response.data;
  }

  async updateWeakAreaStatus(weakAreaId: number, status: string, notes?: string): Promise<void> {
    await this.request(`/analytics/weak-areas/${weakAreaId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    });
  }

  async getLearningPatterns(studentId: number, moduleId?: number): Promise<any[]> {
    const url = moduleId
      ? `/analytics/student/${studentId}/learning-patterns?module_id=${moduleId}`
      : `/analytics/student/${studentId}/learning-patterns`;

    const response = await this.request<{ data: any[] }>(url);
    return response.data;
  }

  async trackStudySession(studentId: number, sessionData: StudySession): Promise<{ tracking_id: number }> {
    const response = await this.request<{ data: { tracking_id: number } }>(`/analytics/student/${studentId}/track-session`, {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
    return response.data;
  }

  async getStudyHabits(studentId: number, days?: number): Promise<any[]> {
    const url = days
      ? `/analytics/student/${studentId}/study-habits?days=${days}`
      : `/analytics/student/${studentId}/study-habits`;

    const response = await this.request<{ data: any[] }>(url);
    return response.data;
  }

  async getPerformanceTrends(studentId: number, moduleId?: number, weeks?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (moduleId) params.append('module_id', moduleId.toString());
    if (weeks) params.append('weeks', weeks.toString());

    const url = `/analytics/student/${studentId}/performance-trends?${params.toString()}`;
    const response = await this.request<{ data: any[] }>(url);
    return response.data;
  }

  async getContentTypePerformance(studentId: number, moduleId?: number): Promise<any[]> {
    const url = moduleId
      ? `/analytics/student/${studentId}/content-performance?module_id=${moduleId}`
      : `/analytics/student/${studentId}/content-performance`;

    const response = await this.request<{ data: any[] }>(url);
    return response.data;
  }

  async getImprovementRecommendations(studentId: number): Promise<ImprovementRecommendation[]> {
    const response = await this.request<{ data: ImprovementRecommendation[] }>(`/analytics/student/${studentId}/recommendations`);
    return response.data;
  }

  async getAnalyticsSummary(studentId: number): Promise<AnalyticsSummary> {
    const response = await this.request<{ data: AnalyticsSummary }>(`/analytics/student/${studentId}/summary`);
    return response.data;
  }

  // ======================
  // REPORTS & EXPORTS
  // ======================

  async generateReport(data: ReportGenerationRequest): Promise<ReportGenerationResponse> {
    return this.request<ReportGenerationResponse>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getReports(page: number = 1, limit: number = 20): Promise<ReportsListResponse> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    return this.request<ReportsListResponse>(`/reports?${queryParams.toString()}`);
  }

  async getReportConfigurations(reportType?: string): Promise<ReportConfigResponse> {
    const queryParams = reportType ? `?report_type=${reportType}` : '';
    return this.request<ReportConfigResponse>(`/reports/configurations${queryParams}`);
  }

  async scheduleReport(data: any): Promise<any> {
    return this.request('/reports/schedule', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteReport(reportId: number): Promise<{ success: boolean; message: string }> {
    return this.request(`/reports/${reportId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Downloads a report file. 
   * Uses native fetch directly instead of this.request() because it returns a Blob, not JSON.
   */
  async downloadReport(reportId: number): Promise<void> {
    const url = `${API_BASE_URL}/reports/download/${reportId}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: {
        ...defaultHeaders
      },
      credentials: 'include',
    };

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }

      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Extract filename from headers or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'report.xlsx';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Report Download Failed:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();

// Exporting aliases to maintain backward compatibility and support specific imports
export const assignmentAPI = apiClient;
export const dashboardAPI = apiClient;
export const teacherAPI = apiClient;
export const analyticsAPI = apiClient;
export const reportsAPI = apiClient;