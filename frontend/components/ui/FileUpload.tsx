import React, { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, File, FileText, Image as ImageIcon, Film } from 'lucide-react';

interface FileUploadProps {
    onUploadComplete: (files: UploadedFile[]) => void;
    multiple?: boolean;
    accept?: string;
    maxSizeMB?: number;
    label?: string;
}

export interface UploadedFile {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    url: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
    onUploadComplete,
    multiple = false,
    accept = '*',
    maxSizeMB = 50,
    label = 'Upload Files'
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFiles(files);
        }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            handleFiles(files);
        }
    };

    const handleFiles = async (files: File[]) => {
        setError(null);

        // Validate file size
        const invalidFiles = files.filter(file => file.size > maxSizeMB * 1024 * 1024);
        if (invalidFiles.length > 0) {
            setError(`Files must be smaller than ${maxSizeMB}MB`);
            return;
        }

        if (!multiple && files.length > 1) {
            setError('Only one file allowed');
            return;
        }

        uploadFiles(files);
    };

    const uploadFiles = async (files: File[]) => {
        setIsUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        files.forEach(file => {
            formData.append(multiple ? 'files' : 'file', file);
        });

        try {
            const endpoint = multiple ? '/api/upload/multiple' : '/api/upload/single';
            const xhr = new XMLHttpRequest();

            xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${endpoint}`);

            // Get auth token from local storage or cookie if needed
            const token = localStorage.getItem('token');
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.withCredentials = true;

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    setUploadProgress(percentComplete);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const response = JSON.parse(xhr.responseText);
                    const resultFiles = multiple ? response.files : [response.file];
                    onUploadComplete(resultFiles);
                    setIsUploading(false);
                    setUploadProgress(100);
                } else {
                    setError('Upload failed. Server responded with ' + xhr.status);
                    setIsUploading(false);
                }
            };

            xhr.onerror = () => {
                setError('Upload failed. Network error.');
                setIsUploading(false);
            };

            xhr.send(formData);

        } catch (err) {
            setError('Upload failed. An unexpected error occurred.');
            setIsUploading(false);
            console.error(err);
        }
    };

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="w-6 h-6 text-blue-500" />;
        if (['pdf'].includes(ext || '')) return <FileText className="w-6 h-6 text-red-500" />;
        if (['mp4', 'mov', 'avi'].includes(ext || '')) return <Film className="w-6 h-6 text-purple-500" />;
        return <File className="w-6 h-6 text-gray-500" />;
    };

    return (
        <div className="w-full">
            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple={multiple}
                    accept={accept}
                    onChange={handleFileSelect}
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                    <Upload className="w-10 h-10 text-gray-400" />
                    <div className="text-sm font-medium text-gray-700">
                        Click to upload or drag and drop
                    </div>
                    <div className="text-xs text-gray-500">
                        {accept === '*' ? 'All files accepted' : accept} (Max {maxSizeMB}MB)
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Uploading...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center">
                    <X className="w-4 h-4 mr-2" />
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileUpload;
