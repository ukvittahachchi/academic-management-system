export interface Module {
  module_id: number;
  module_name: string;
  description: string;
  grade_level: string;
  subject: string;
  is_published: boolean;
  school_id: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
  unit_count: number;
  content_count: number;
  student_completed_count?: number;
  progress_percentage?: number;
  completed_by_count?: number;
}

export interface CreateModuleData {
  module_name: string;
  description: string;
  grade_level: string;
  subject?: string;
  school_id?: number;
}

export interface UpdateModuleData {
  module_name?: string;
  description?: string;
  grade_level?: string;
  subject?: string;
  is_published?: boolean;
}

export interface ModuleFilters {
  grade_level?: string;
  subject?: string;
  is_published?: boolean;
}

export interface ModuleStatistics {
  total_modules: number;
  published_modules: number;
  grade_levels: number;
  subjects: number;
  total_units: number;
  total_content_items: number;
}