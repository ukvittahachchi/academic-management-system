import { User } from '../auth';

// Re-export User for convenience
export type { User };

// AdminUser matches the raw API response from backend/src/models/User.model.js findAll()
export interface AdminUser {
    user_id: number;
    school_id: number;
    username: string;
    full_name: string;
    role: 'student' | 'teacher' | 'admin';
    is_active: boolean;
    must_change_password?: boolean;
    last_login?: string;
    created_at: string;
    class_grade?: string;
    roll_number?: string;
    subject?: string;
    // We might want to map this to the User interface if we need to pass it to shared components
    // but for admin tables, raw properties are better.
}

export interface CreateUserInput {
    username: string;
    full_name: string;
    plain_password?: string;
    role: 'student' | 'teacher' | 'admin';
    class_grade?: string;
    roll_number?: string;
    subject?: string;
}

export interface UpdateUserInput {
    full_name?: string;
    role?: string;
    class_grade?: string;
    roll_number?: string;
    subject?: string;
    password?: string;
    is_active?: boolean;
}

export interface AuditLog {
    log_id: number;
    user_id: number;
    activity_type: string;
    ip_address: string;
    user_agent: string;
    details: string | any;
    created_at: string;
    username: string;
    full_name: string;
    role: string;
}

export interface UserListResponse {
    users: AdminUser[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface AuditLogListResponse {
    logs: AuditLog[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface SystemSettings {
    school_name: string;
    academic_year: string;
    current_term: string;
    maintenance_mode: boolean;
    allow_registration: boolean;
    email_notifications: boolean;
    [key: string]: string | boolean | number;
}
