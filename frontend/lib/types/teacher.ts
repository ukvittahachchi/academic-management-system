import { ReportData } from './report';
import { Notification } from './dashboard';

export interface TeacherClass {
    assignment_id: number;
    teacher_id: number;
    module_id: number;
    class_section: string;
    module_name: string;
    grade_level: string;
    subject: string;
    description?: string;
    student_count: number;
}

export interface TeacherStudent {
    assignment_id: number;
    teacher_id: number;
    module_id: number;
    class_section: string;
    student_id: number;
    username: string;
    full_name: string;
    class_grade: string;
    roll_number: string;
    profile_picture_url: string | null;
    completed_parts: number;
    total_parts: number;
    avg_score: number | null;
    total_study_time_minutes: number;
    last_activity_date: string | null;
    overall_status: 'not_started' | 'in_progress' | 'completed';
    completion_percentage: number;
}

export interface ClassPerformance {
    assignment_id: number;
    teacher_id: number;
    module_id: number;
    class_section: string;
    activity_date: string;
    active_students_count: number;
    completed_items_count: number;
    avg_daily_score: number;
    total_study_time_minutes: number;
    module_name: string;
    grade_level: string;
}

export interface AssignmentPerformance {
    teacher_assignment_id: number;
    teacher_id: number;
    module_id: number;
    class_section: string;
    assignment_id: number;
    assignment_title: string;
    total_marks: number;
    passing_marks: number;
    total_submissions: number;
    avg_percentage: number;
    min_percentage: number;
    max_percentage: number;
    passed_count: number;
    module_name: string;
    grade_level: string;
}

export interface PerformanceDistribution {
    score_range: string;
    student_count: number;
    avg_score_in_range: number;
    avg_study_time: number;
}

export interface ActivityTrend {
    activity_date: string;
    active_students: number;
    completed_items: number;
    avg_score: number;
    total_study_time: number;
}

export interface TopPerformer {
    student_id: number;
    full_name: string;
    class_grade: string;
    roll_number: string;
    avg_score: number;
    completed_parts: number;
    total_parts: number;
    completion_rate: number;
    total_study_time_minutes: number;
    last_activity_date: string;
    module_name: string;
    class_section: string;
}

export interface StudentNeedingAttention {
    student_id: number;
    full_name: string;
    class_grade: string;
    roll_number: string;
    avg_score: number;
    completed_parts: number;
    total_parts: number;
    completion_rate: number;
    total_study_time_minutes: number;
    last_activity_date: string;
    days_inactive: number;
    module_name: string;
    class_section: string;
}

export interface TeacherDashboardData {
    overview: {
        total_classes: number;
        total_students: number;
        overall_avg_score: number;
        total_completed_items: number;
        avg_completion_rate: number;
        total_class_study_time: number;
    };
    classes: Array<{
        assignment_id: number;
        module_id: number;
        module_name: string;
        grade_level: string;
        class_section: string;
        student_count: number;
        class_avg_score: number;
        completion_rate: number;
        last_activity: string;
    }>;
    recent_activity: Array<{
        student_id: number;
        module_name: string;
        student_name: string;
        class_grade: string;
        content_title: string;
        score: number;
        completed_at: string;
        time_taken_minutes: number;
    }>;
    performance_trends: Array<{
        activity_date: string;
        active_students: number;
        completed_items: number;
        avg_score: number;
    }>;
    recent_reports: ReportData[];
    class_list: TeacherClass[];
    performance_distribution: PerformanceDistribution[];
    activity_trends: ActivityTrend[];
    top_performers: TopPerformer[];
    students_needing_attention: StudentNeedingAttention[];
    notifications: Notification[];
}

export interface TeacherFilters {
    modules: Array<{ id: number; name: string }>;
    class_sections: string[];
}