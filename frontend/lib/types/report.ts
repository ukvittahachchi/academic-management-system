export interface ReportFilter {
    startDate?: string;
    endDate?: string;
    classGrade?: string;
    moduleId?: number;
    days?: number;
    gradeLevel?: string;
}

export interface ReportData {
    report_id: number;
    report_type: string;
    report_name: string;
    generated_by: number;
    generated_by_name: string;
    file_path: string;
    file_size_bytes: number;
    download_count: number;
    created_at: string;
    parameters?: ReportFilter;
    download_url: string;
}

export interface ReportConfiguration {
    type: string;
    name: string;
    description: string;
    columns?: ReportColumn[];
    sample_filters?: Partial<ReportFilter>;
}

export interface ReportColumn {
    item_id: number;
    column_name: string;
    column_label: string;
    data_type: 'string' | 'number' | 'date' | 'percentage' | 'boolean';
    sort_order: number;
    is_visible: boolean;
    formula?: string;
}

export interface ReportGenerationRequest {
    report_type: 'student_performance' | 'class_summary' | 'system_usage' | 'module_analytics';
    filters: ReportFilter;
    schedule?: 'daily' | 'weekly' | 'monthly' | 'custom';
    email_notification?: boolean;
}

export interface ReportGenerationResponse {
    success: boolean;
    data: {
        report_id: number;
        filename: string;
        download_url: string;
        file_size: number;
        record_count: number;
        generated_at: string;
    };
}

export interface ReportsListResponse {
    success: boolean;
    data: ReportData[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface ReportConfigResponse {
    success: boolean;
    data: ReportConfiguration[];
}