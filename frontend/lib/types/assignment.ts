export interface Assignment {
    assignment_id: number;
    part_id: number;
    title: string;
    description: string;
    question_count: number;
    total_marks: number;
    passing_marks: number;
    time_limit_minutes: number;
    max_attempts: number;
    attempt_window_days: number;
    shuffle_questions: boolean;
    show_results_immediately: boolean;
    allow_review: boolean;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    created_by: number;
    part_title: string;
    part_description: string;
}

export interface Question {
    question_id: number;
    assignment_id: number;
    question_text: string;
    question_type: 'single' | 'multiple';
    option_a: string;
    option_b: string;
    option_c?: string;
    option_d?: string;
    option_e?: string;
    marks: number;
    difficulty_level: 'easy' | 'medium' | 'hard';
    question_order: number;
}

export interface AssignmentAttempt {
    attempt_id: number;
    assignment_id: number;
    student_id: number;
    attempt_number: number;
    start_time: string;
    end_time: string | null;
    status: 'not_started' | 'in_progress' | 'completed' | 'timed_out';
    last_question_accessed: number;
    time_remaining_seconds: number;
    score?: number;
    percentage?: number;
    submitted_at?: string;
    submission_status?: string;
}

export interface CanAttemptResponse {
    canAttempt: boolean;
    reason?: string;
    attemptsUsed?: number;
    maxAttempts?: number;
    hasActiveAttempt?: boolean;
    attemptId?: number;
    attemptNumber?: number;
    nextAttempt?: number;
}

export interface AssignmentDetailsResponse {
    assignment: Assignment;
    canAttempt: CanAttemptResponse;
    attempts: AssignmentAttempt[];
    results: AssignmentResult | null;
}

export interface AssignmentResult {
    result_id: number;
    assignment_id: number;
    student_id: number;
    best_score: number;
    best_percentage: number;
    attempts_used: number;
    last_attempt_at: string | null;
    passed: boolean;
    completion_date: string | null;
    assignment_title?: string;
    total_marks?: number;
    passing_marks?: number;
    max_attempts?: number;
}

export interface StartAttemptResponse {
    assignment: Assignment;
    attempt: AssignmentAttempt;
    questions: Question[];
    total_questions: number;
    time_limit_seconds: number;
}

export interface SubmissionResponse {
    submission_id: number;
    score: number;
    total_marks: number;
    percentage: number;
    passed: boolean;
    passing_marks: number;
    time_taken_seconds: number;
    review_data: ReviewItem[] | null;
    results_summary: AssignmentResult;
}

export interface ReviewItem {
    question_id: number;
    correct: boolean;
    student_answer: string | string[];
    correct_answers: string[];
    marks_obtained: number;
    total_marks: number;
    explanation?: string;
}

export interface StudentAnswer {
    [question_id: number]: string | string[];
}

export interface Submission {
    submission_id: number;
    assignment_id: number;
    student_id: number;
    attempt_number: number;
    answers_json: StudentAnswer;
    score: number;
    total_marks: number;
    percentage: number;
    time_taken_seconds: number;
    started_at: string;
    submitted_at: string;
    status: 'in_progress' | 'submitted' | 'timed_out' | 'abandoned';
    review_data: ReviewItem[];
}

export interface StudentAssignment {
    assignment_id: number;
    part_id: number;
    title: string;
    description: string;
    question_count: number;
    total_marks: number;
    passing_marks: number;
    time_limit_minutes: number;
    max_attempts: number;
    part_title: string;
    unit_name: string;
    module_name: string;
    best_score: number | null;
    best_percentage: number | null;
    passed: boolean | null;
    attempts_used: number | null;
    last_attempt_at: string | null;
}