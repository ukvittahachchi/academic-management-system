'use client';

import React, { useState } from 'react';
import { BookOpen, MonitorPlay, Video, FileQuestion, ChevronDown, ChevronUp, Save, Eye, CheckCircle } from 'lucide-react';
import FileUpload, { UploadedFile } from '../../ui/FileUpload';
import QuizBuilder, { QuestionData } from './QuizBuilder';

interface LearningPart {
    part_id: string;
    part_type: 'reading' | 'presentation' | 'video' | 'assignment';
    title: string;
    content_url?: string;
    requires_completion: boolean;
}

interface UnitContentEditorProps {
    unitId: string;
    parts: LearningPart[];
    onUpdatePart: (partId: string, data: any) => Promise<void>;
    onCreateAssignment: (partId: string, assignmentData: any, questions: QuestionData[]) => Promise<void>;
}

const PART_ICONS = {
    reading: BookOpen,
    presentation: MonitorPlay,
    video: Video,
    assignment: FileQuestion
};

const PART_LABELS = {
    reading: 'Reading Material',
    presentation: 'Lecture Presentation',
    video: 'Video Lesson',
    assignment: 'Unit Assignment'
};

const UnitContentEditor: React.FC<UnitContentEditorProps> = ({
    unitId,
    parts,
    onUpdatePart,
    onCreateAssignment
}) => {
    const [expandedPart, setExpandedPart] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Assignment State
    const [quizQuestions, setQuizQuestions] = useState<QuestionData[]>([]);
    const [assignmentParams, setAssignmentParams] = useState({
        total_marks: 100,
        passing_marks: 40,
        time_limit_minutes: 30,
        max_attempts: 3
    });

    const handleFileAvailable = async (partId: string, files: UploadedFile[]) => {
        if (files.length === 0) return;
        const file = files[0];

        try {
            setLoading(true);
            // Update part with content URL and metadata
            await onUpdatePart(partId, {
                content_url: file.path, // or file.url depending on backend
                content_data: JSON.stringify({
                    originalName: file.originalName,
                    mimetype: file.mimetype,
                    size: file.size
                })
            });
            alert('Content updated successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to update content');
        } finally {
            setLoading(false);
        }
    };

    const getFullUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        // Remove /api from base url if present to get the root url
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
        // Ensure path doesn't start with / to avoid double slashes
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `${baseUrl}/${cleanPath}`;
    };

    const handleSaveAssignment = async (partId: string) => {
        if (quizQuestions.length === 0) {
            alert('Please add at least one question');
            return;
        }

        try {
            setLoading(true);
            await onCreateAssignment(partId, {
                title: 'Unit Assignment',
                description: 'Complete this assignment to finish the unit.',
                ...assignmentParams
            }, quizQuestions);
            alert('Assignment created successfully!');
            setExpandedPart(null);
        } catch (error) {
            console.error(error);
            alert('Failed to create assignment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {parts.map((part) => {
                const Icon = PART_ICONS[part.part_type];
                const isExpanded = expandedPart === part.part_id;
                const hasContent = !!part.content_url;

                return (
                    <div key={part.part_id} className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">

                        {/* Header */}
                        <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedPart(isExpanded ? null : part.part_id)}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${hasContent ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">{PART_LABELS[part.part_type]}</h4>
                                    <p className="text-xs text-gray-500">
                                        {hasContent ? 'Content uploaded' : 'No content'} • {part.requires_completion ? 'Required' : 'Optional'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                {hasContent && !isExpanded && (
                                    <span className="mr-3 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full flex items-center">
                                        <CheckCircle className="w-3 h-3 mr-1" /> Ready
                                    </span>
                                )}
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                            </div>
                        </div>

                        {/* Content Body */}
                        {isExpanded && (
                            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                                {part.part_type === 'assignment' ? (
                                    <div className="space-y-6">
                                        <div className="bg-white p-4 rounded-md border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Time Limit (mins)</label>
                                                <input
                                                    type="number"
                                                    value={assignmentParams.time_limit_minutes}
                                                    onChange={e => setAssignmentParams({ ...assignmentParams, time_limit_minutes: parseInt(e.target.value) })}
                                                    className="w-full h-9 px-2 border rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Passing Marks</label>
                                                <input
                                                    type="number"
                                                    value={assignmentParams.passing_marks}
                                                    onChange={e => setAssignmentParams({ ...assignmentParams, passing_marks: parseInt(e.target.value) })}
                                                    className="w-full h-9 px-2 border rounded text-sm"
                                                />
                                            </div>
                                        </div>

                                        <QuizBuilder
                                            questions={quizQuestions}
                                            onChange={setQuizQuestions}
                                        />

                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={() => handleSaveAssignment(part.part_id)}
                                                disabled={loading}
                                                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                <Save className="w-4 h-4 mr-2" />
                                                Save Assignment
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="text-sm font-medium text-gray-700">Upload Content</h5>
                                            {hasContent && (
                                                <a href={getFullUrl(part.content_url!)} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline flex items-center">
                                                    <Eye className="w-4 h-4 mr-1" /> View Current File
                                                </a>
                                            )}
                                        </div>

                                        <FileUpload
                                            onUploadComplete={(files) => handleFileAvailable(part.part_id, files)}
                                            accept={part.part_type === 'video' ? 'video/*' : '.pdf,.ppt,.pptx'}
                                            label={`Upload ${part.part_type === 'video' ? 'Video' : 'Document'}`}
                                            maxSizeMB={part.part_type === 'video' ? 100 : 20}
                                        />

                                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 flex items-start mt-2">
                                            <div className="mr-2 mt-0.5">ℹ️</div>
                                            <div>
                                                Uploading a new file will replace the existing content immediately.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};



export default UnitContentEditor;
