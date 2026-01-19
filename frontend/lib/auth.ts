// Authentication types and constants

export interface User {
  id?: number | string; // Compatibility alias for userId
  userId: number;
  username: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin';
  schoolId: number;
  classGrade?: string;
  subject?: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

// Role-based access constants
export const ROLE_PERMISSIONS = {
  student: [
    'view_modules',
    'access_learning_materials',
    'submit_assignments',
    'view_grades',
    'view_own_progress'
  ],
  teacher: [
    'view_modules',
    'view_student_progress',
    'view_class_analytics',
    'export_reports',
    'manage_assignments'
  ],
  admin: [
    'manage_users',
    'manage_modules',
    'manage_system',
    'view_all_reports',
    'configure_settings',
    'access_all_features'
  ]
} as const;

// Dashboard configurations
export const DASHBOARD_CONFIG = {
  student: {
    title: 'Student Dashboard',
    icon: '👨‍🎓',
    color: 'green',
    features: [
      'Access learning modules',
      'Submit assignments',
      'View your grades',
      'Track your progress'
    ]
  },
  teacher: {
    title: 'Teacher Dashboard',
    icon: '👩‍🏫',
    color: 'blue',
    features: [
      'Monitor student progress',
      'View class analytics',
      'Export reports',
      'Manage assignments'
    ]
  },
  admin: {
    title: 'Admin Dashboard',
    icon: '👨‍💼',
    color: 'purple',
    features: [
      'Manage users',
      'Create modules',
      'System configuration',
      'View all reports'
    ]
  }
} as const;