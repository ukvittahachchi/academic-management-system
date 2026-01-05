export interface ContentMetadata {
    part_id: number;
    title: string;
    part_type: 'reading' | 'presentation' | 'video' | 'assignment';
    content_url: string;
    content_type: string;
    file_size: number;
    thumbnail_url: string | null;
    video_duration: number | null;
    pages_count: number | null;
    is_downloadable: boolean;
    preview_enabled: boolean;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    storage_path: string;
    storage_provider: string;
    upload_date: string;
}

export interface ContentProgress {
    progress_id: number;
    status: 'not_started' | 'in_progress' | 'completed';
    started_at: string | null;
    completed_at: string | null;
    time_spent_seconds: number;
    score: number | null;
    total_marks: number | null;
}

export interface ViewerConfig {
    can_preview: boolean;
    can_download: boolean;
    supported_formats: string[];
    viewer_type: string;
    features: string[];
}

export interface ContentResponse {
    content: ContentMetadata;
    progress: ContentProgress | null;
    viewer_config: ViewerConfig;
}

export interface DownloadableContent {
    part_id: number;
    title: string;
    part_type: string;
    content_url: string;
    content_type: string;
    file_size: number;
    is_downloadable: boolean;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    unit_name: string;
    module_name: string;
}

export interface DownloadUrlResponse {
    download_url: string;
    file_name: string;
    file_size: number;
    expires_in: number;
}