export interface StudentAnalytics {
    overall_summary: {
        full_name: string;
        class_grade: string;
        roll_number: string;
        module_name: string;
        total_learning_items: number;
        completed_items: number;
        completion_percentage: number;
        avg_score: number;
        total_study_minutes: number;
        active_days: number;
    };
    weekly_trends: Array<{
        week_start: string;
        weekly_completed: number;
        weekly_avg_score: number;
        weekly_study_minutes: number;
        active_days: number;
    }>;
    assignment_performance: Array<{
        assignment_name: string;
        module_name: string;
        score: number;
        total_marks: number;
        percentage: number;
        time_taken_minutes: number;
        submitted_at: string;
        accuracy_percentage: number;
        total_correct: number;
        total_questions: number;
        avg_time_per_question: number;
        result_status: 'passed' | 'failed';
    }>;
    time_spent_analysis: Array<{
        session_date: string;
        day_of_week: string;
        hour_of_day: number;
        session_type: 'learning' | 'review' | 'assignment' | 'assessment';
        total_minutes: number;
        avg_focus_score: number;
        part_type: string;
        module_name: string;
        daily_total_minutes: number;
        avg_daily_minutes: number;
    }>;
    weak_areas: Array<{
        weak_area_id: number;
        area_type: 'concept' | 'skill' | 'assignment_type' | 'time_management';
        area_name: string;
        difficulty_score: number;
        occurrences: number;
        first_identified: string;
        last_occurrence: string;
        improvement_status: 'identified' | 'improving' | 'resolved';
        notes: string;
        module_name: string;
        unit_name: string;
        content_title: string;
        days_since_last_occurrence: number;
    }>;
    learning_patterns: Array<{
        preferred_learning_time: string;
        avg_session_minutes: number;
        preferred_content_type: 'reading' | 'video' | 'presentation' | 'interactive';
        completion_pattern: 'linear' | 'random' | 'focused' | 'scattered';
        retention_rate: number;
        module_name: string;
    }>;
    content_type_performance: Array<{
        part_type: string;
        completed_count: number;
        avg_score: number;
        avg_time_minutes: number;
        min_score: number;
        max_score: number;
        score_std_dev: number;
        coverage_percentage: number;
    }>;
    class_comparison: Array<{
        module_name: string;
        unit_name: string;
        content_title: string;
        student_score: number;
        class_avg_score: number;
        score_difference: number;
    }>;
}

export interface AnalyticsSummary {
    total_modules: number;
    total_learning_items: number;
    completed_items: number;
    overall_avg_score: number;
    total_study_minutes: number;
    total_assignments: number;
    passed_assignments: number;
    identified_weak_areas: number;
    total_active_days: number;
    days_since_started: number;
}

export interface ImprovementRecommendation {
    type: 'weak_area' | 'study_habit' | 'content_performance';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
    estimated_time: string;
    resources: string[];
}

export interface StudySession {
    student_id: number;
    learning_part_id: number;
    start_time: string;
    end_time: string;
    session_type: 'learning' | 'review' | 'assignment' | 'assessment';
    focus_score: number;
    distractions_noted: string;
}

export interface WeakAreaInput {
    module_id: number;
    unit_id?: number;
    learning_part_id?: number;
    area_type: 'concept' | 'skill' | 'assignment_type' | 'time_management';
    area_name: string;
    difficulty_score: number;
    notes: string;
}