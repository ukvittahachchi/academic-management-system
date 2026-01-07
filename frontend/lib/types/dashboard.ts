export interface DashboardOverview {
    total_modules: number;
    completed_parts: number;
    completion_percentage: number;
    avg_score: number;
    passed_assignments: number;
    activity_streak: number;
    total_learning_parts?: number;
    total_assignments?: number;
    total_study_time_minutes?: number;
    avg_daily_study_minutes?: number;
}

export interface UpcomingAssignment {
    assignment_id: number;
    part_id: number;
    title: string;
    description: string;
    time_limit_minutes: number;
    total_marks: number;
    passing_marks: number;
    max_attempts: number;
    start_date: string | null;
    end_date: string | null;
    module_name: string;
    unit_name: string;
    attempts_used: number;
    best_score: number | null;
    best_percentage: number | null;
    passed: boolean | null;
    status: 'available' | 'not_started' | 'expired' | 'completed' | 'attempts_exhausted';
    can_attempt: boolean;
}

export interface GradeOverview {
    module_name: string;
    grade_level: string;
    total_assignments: number;
    passed_assignments: number;
    avg_percentage: number | null;
    highest_percentage: number | null;
    lowest_percentage: number | null;
    pass_count: number;
}

export interface PerformanceHistory {
    date: string;
    daily_completed: number;
    daily_avg_score: number;
    daily_study_time: number;
}

export interface ModuleProgress {
    module_name: string;
    total_parts: number;
    completed_parts: number;
    progress_percentage: number;
    avg_score: number | null;
}

export interface StudyTimeStat {
    study_date: string;
    total_minutes: number;
    completed_items: number;
}

export interface RecentActivity {
    module_name: string;
    content_title: string;
    status: string;
    score: number | null;
    completed_at: string;
    time_taken_minutes: number | null;
}

export interface Notification {
    type: 'assignment_due' | 'new_content';
    title: string;
    message: string;
    relevant_date: string;
}

export interface DashboardData {
    overview: DashboardOverview;
    upcoming_assignments: UpcomingAssignment[];
    grades_overview: GradeOverview[];
    performance_history: PerformanceHistory[];
    module_progress: ModuleProgress[];
    study_time_stats: StudyTimeStat[];
    leaderboard?: any;
    notifications: Notification[];
    recent_activity: RecentActivity[];
    module_breakdown: any[];
    assignment_performance: any[];
}