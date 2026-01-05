export interface Unit {
  unit_id: number;
  unit_name: string;
  unit_order: number;
  description: string;
  learning_objectives: string;
  estimated_time_minutes: number;
  module_id: number;
  module_name: string;
  grade_level: string;
  part_count: number;
  required_parts: number;
  total_parts: number;
  completed_parts?: number;
  in_progress_parts?: number;
  progress_percentage?: number;
  has_in_progress?: boolean;
  next_part_id?: number;
  parts?: LearningPart[];
  created_at: string;
  updated_at: string;
}

export interface LearningPart {
  part_id: number;
  unit_id: number;
  part_type: 'reading' | 'presentation' | 'video' | 'assignment';
  title: string;
  content_url?: string;
  content_data?: string;
  display_order: number;
  duration_minutes: number;
  is_active: boolean;
  requires_completion: boolean;
  unlock_next: boolean;
  module_id: number;
  module_name: string;

  // Student progress
  student_status?: 'not_started' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
  time_spent_seconds?: number;
  score?: number;
  total_marks?: number;
  attempts?: number;

  // Navigation
  next_part?: {
    part_id: number;
    title: string;
    part_type: string;
  };
  previous_part?: {
    part_id: number;
    title: string;
    part_type: string;
  };

  created_at: string;
  updated_at: string;
}

export interface ModuleHierarchy {
  module: {
    module_id: number;
    module_name: string;
    description: string;
    grade_level: string;
    subject: string;
    is_published: boolean;
    created_by_name: string;
    unit_count: number;
    content_count: number;
    progress: {
      total_parts: number;
      completed_parts: number;
      in_progress_parts: number;
      progress_percentage: number;
      total_time_seconds: number;
      total_time_formatted: string;
      average_score: number;
    };
  };
  units: Unit[];
  resume_point?: {
    part_id: number;
    part_title: string;
    part_type: string;
    unit_name: string;
    module_name: string;
  };
  hierarchy: {
    module: string;
    unit_count: number;
    total_parts: number;
  };
}

export interface StudentProgress {
  overall_progress: {
    total_modules: number;
    total_units: number;
    total_parts: number;
    completed_parts: number;
    progress_percentage: number;
    total_time_seconds: number;
    total_time_formatted: string;
    average_score: number;
    recent_modules: Array<{
      module_id: number;
      module_name: string;
      last_accessed: string;
    }>;
  };
  recent_activity: Array<{
    progress_id: number;
    part_id: number;
    part_title: string;
    part_type: string;
    unit_name: string;
    module_name: string;
    status: string;
    activity_type: string;
    time_ago: string;
    formatted_date: string;
  }>;
  bookmarks: Array<{
    bookmark_id: number;
    part_id: number;
    part_title: string;
    part_type: string;
    unit_name: string;
    unit_id: number;
    module_name: string;
    module_id: number;
    notes?: string;
    progress_status?: string;
    created_at: string;
  }>;
  resume_point?: any;
}

export interface NavigationState {
  currentModule: ModuleHierarchy | null;
  currentUnit: Unit | null;
  currentPart: LearningPart | null;
  isLoading: boolean;
  error: string | null;
  breadcrumbs: Array<{
    label: string;
    href: string;
  }>;
}

// Progress update payload
export interface ProgressUpdate {
  status: 'not_started' | 'in_progress' | 'completed';
  time_spent_seconds?: number;
  score?: number;
  total_marks?: number;
  data_json?: any;
}

// Bookmark payload
export interface BookmarkData {
  module_id: number;
  unit_id: number;
  part_id: number;
  notes?: string;
}