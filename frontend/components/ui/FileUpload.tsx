import React, { useState, useRef, ChangeEvent } from 'react';
import { LuUpload, LuX, LuFile, LuFileText, LuImage, LuVideo } from 'react-icons/lu';

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
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <LuImage className="w-6 h-6 text-blue-500" />;
        if (['pdf'].includes(ext || '')) return <LuFileText className="w-6 h-6 text-red-500" />;
        if (['mp4', 'mov', 'avi'].includes(ext || '')) return <LuVideo className="w-6 h-6 text-purple-500" />;
        return <LuFile className="w-6 h-6 text-gray-500" />;
    };

    return (
        <div className="w-full">
            <div
                className={`border-2 border-dashed rounded-[1.5rem] p-8 text-center cursor-pointer transition-all duration-300 ${isDragging ? 'border-purple-500 bg-purple-50 scale-[1.02]' : 'border-gray-200 hover:border-purple-400 hover:bg-gray-50'
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

                <div className="flex flex-col items-center justify-center space-y-3">
                    <div className={`p-4 rounded-full ${isDragging ? 'bg-purple-200' : 'bg-gray-100'} transition-colors`}>
                        <LuUpload className={`w-8 h-8 ${isDragging ? 'text-purple-700' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="text-base font-bold text-gray-700">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-sm font-medium text-gray-400 mt-1">
                            {accept === '*' ? 'All files accepted' : accept} (Max {maxSizeMB}MB)
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            {isUploading && (
                <div className="mt-6 space-y-2 animate-[fade-in_0.3s_ease-out]">
                    <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <span>Uploading...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(147,51,234,0.5)]"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center shadow-sm border border-red-100 animate-[shake_0.5s_ease-in-out]">
                    <LuX className="w-5 h-5 mr-3 flex-shrink-0" />
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileUpload;
