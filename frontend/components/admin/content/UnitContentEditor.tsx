'use client';

import React, { useState } from 'react';
import {
    LuBookOpen,
    LuMonitor,
    LuVideo,
    LuClipboardList,
    LuChevronDown,
    LuChevronUp,
    LuSave,
    LuEye,
    LuCircleCheck,
    LuCheck,
    LuX,
    LuTrash2,
    LuFileText,
    LuPlus
} from 'react-icons/lu';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/contexts/ToastContext';
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
    onDeleteAssignment: (partId: string) => Promise<void>;
    onCreatePart?: (partData: any) => Promise<void>;
    onDeletePart?: (partId: string) => Promise<void>;
}

const PART_ICONS = {
    reading: LuBookOpen,
    presentation: LuMonitor,
    video: LuVideo,
    assignment: LuClipboardList
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
    onCreateAssignment,
    onDeleteAssignment,
    onCreatePart,
    onDeletePart
}) => {
    const { showToast } = useToast();
    const [expandedPart, setExpandedPart] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showAddPart, setShowAddPart] = useState(false);
    const [newPartData, setNewPartData] = useState({
        title: '',
        part_type: 'reading' as 'reading' | 'presentation' | 'video' | 'assignment'
    });
    const [editingPartId, setEditingPartId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    // Assignment State
    const [quizQuestions, setQuizQuestions] = useState<QuestionData[]>([]);
    const [assignmentParams, setAssignmentParams] = useState({
        title: '',
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
            showToast('Content updated successfully!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update content', 'error');
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
            showToast('Please add at least one question', 'error');
            return;
        }

        try {
            setLoading(true);
            await onCreateAssignment(partId, {
                ...assignmentParams,
                title: assignmentParams.title || 'Unit Assignment',
                description: 'Complete this assignment to finish the unit.',
            }, quizQuestions);
            showToast('Assignment saved successfully!', 'success');
            setExpandedPart(null);
        } catch (error) {
            console.error(error);
            showToast('Failed to save assignment', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExpandPart = async (partId: string, partType: string) => {
        const isExpanding = expandedPart !== partId;
        setExpandedPart(isExpanding ? partId : null);

        if (isExpanding && partType === 'assignment') {
            try {
                setLoading(true);
                const data = await apiClient.getAssignmentByPart(partId);

                if (data && data.assignment) {
                    setAssignmentParams({
                        total_marks: data.assignment.total_marks,
                        passing_marks: data.assignment.passing_marks,
                        time_limit_minutes: data.assignment.time_limit_minutes,
                        max_attempts: data.assignment.max_attempts,
                        title: data.assignment.title || 'Unit Assignment'
                    });

                    if (data.questions) {
                        setQuizQuestions(data.questions.map((q: any) => ({
                            ...q,
                            id: q.question_id.toString(),
                            question_id: q.question_id
                        })));
                    }
                } else {
                    // Reset to defaults
                    setQuizQuestions([]);
                    setAssignmentParams({
                        title: parts.find(p => p.part_id === partId)?.title || 'Unit Assignment',
                        total_marks: 100,
                        passing_marks: 40,
                        time_limit_minutes: 30,
                        max_attempts: 3
                    });
                }
            } catch (error) {
                console.error('Failed to load assignment details:', error);
                // Optionally maintain previous state or reset
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCreatePart = async () => {
        if (!newPartData.title.trim()) {
            showToast('Please enter a title', 'error');
            return;
        }

        if (onCreatePart) {
            try {
                setLoading(true);
                await onCreatePart({
                    unit_id: unitId,
                    ...newPartData
                });
                setShowAddPart(false);
                setNewPartData({ title: '', part_type: 'reading' });
                showToast('Learning part created successfully!', 'success');
            } catch (error) {
                console.error(error);
                showToast('Failed to create learning part', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* Add Part Section */}
            {onCreatePart && (
                <div className="mb-6">
                    {!showAddPart ? (
                        <button
                            onClick={() => setShowAddPart(true)}
                            className="w-full py-4 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 hover:border-purple-500 hover:text-purple-600 transition-all flex items-center justify-center font-bold bg-white hover:bg-purple-50/50"
                        >
                            <LuPlus className="w-5 h-5 mr-2" /> Add Learning Part
                        </button>
                    ) : (
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-lg mb-6 animate-[fade-in_0.3s_ease-out]">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-bold text-gray-900 text-lg">Add New Learning Part</h4>
                                <button
                                    onClick={() => setShowAddPart(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <LuX className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Content Type</label>
                                    <div className="relative">
                                        <select
                                            value={newPartData.part_type}
                                            onChange={e => setNewPartData({ ...newPartData, part_type: e.target.value as any })}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none font-medium"
                                        >
                                            <option value="reading">Reading Material (PDF)</option>
                                            <option value="presentation">Presentation (PPT)</option>
                                            <option value="video">Video Lesson</option>
                                            <option value="assignment">Assignment / Quiz</option>
                                        </select>
                                        <LuChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Title</label>
                                    <input
                                        type="text"
                                        value={newPartData.title}
                                        onChange={e => setNewPartData({ ...newPartData, title: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                                        placeholder="e.g., Introduction to Algorithms"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowAddPart(false)}
                                    className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreatePart}
                                    disabled={loading}
                                    className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all transform active:scale-95"
                                >
                                    Create Part
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {parts.map((part) => {
                    const Icon = PART_ICONS[part.part_type];
                    const isExpanded = expandedPart === part.part_id;
                    const hasContent = !!part.content_url;

                    return (
                        <div key={part.part_id} className={`border border-gray-100 rounded-[1.5rem] bg-white overflow-hidden shadow-sm hover:shadow-md transition-all ${isExpanded ? 'ring-2 ring-purple-500 shadow-lg' : ''}`}>

                            {/* Header */}
                            <div
                                className="flex items-center justify-between p-5 cursor-pointer bg-white"
                                onClick={() => handleExpandPart(part.part_id, part.part_type)}
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`p-3 rounded-xl ${hasContent ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        {editingPartId === part.part_id ? (
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="font-bold text-gray-900 border-b-2 border-purple-500 px-1 py-0.5 w-full max-w-md focus:outline-none bg-transparent"
                                                    autoFocus
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (editTitle.trim() && editTitle !== part.title) {
                                                            await onUpdatePart(part.part_id, { title: editTitle });
                                                        }
                                                        setEditingPartId(null);
                                                    }}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded-lg"
                                                >
                                                    <LuCheck className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingPartId(null);
                                                    }}
                                                    className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"
                                                >
                                                    <LuX className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-lg">{part.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                        {PART_LABELS[part.part_type]}
                                                    </span>
                                                    {part.requires_completion && (
                                                        <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
                                                            Required
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {!editingPartId && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingPartId(part.part_id);
                                                    setEditTitle(part.title);
                                                }}
                                                className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                                                title="Rename Part"
                                            >
                                                <LuFileText className="w-5 h-5" />
                                            </button>
                                            {onDeletePart && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Are you sure you want to delete this learning part? This cannot be undone.')) {
                                                            await onDeletePart(part.part_id);
                                                        }
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Delete Part"
                                                >
                                                    <LuTrash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {hasContent && !isExpanded && !editingPartId && (
                                        <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                                            <LuCircleCheck className="w-4 h-4" /> Ready
                                        </span>
                                    )}
                                    <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <LuChevronDown className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            {/* Content Body */}
                            {
                                isExpanded && (
                                    <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                                        {part.part_type === 'assignment' ? (
                                            <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                                                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time Limit (mins)</label>
                                                        <input
                                                            type="number"
                                                            value={assignmentParams.time_limit_minutes}
                                                            onChange={e => setAssignmentParams({ ...assignmentParams, time_limit_minutes: parseInt(e.target.value) })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Passing Marks</label>
                                                        <input
                                                            type="number"
                                                            value={assignmentParams.passing_marks}
                                                            onChange={e => setAssignmentParams({ ...assignmentParams, passing_marks: parseInt(e.target.value) })}
                                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assignment Title</label>
                                                    <input
                                                        type="text"
                                                        value={assignmentParams.title}
                                                        onChange={e => setAssignmentParams({ ...assignmentParams, title: e.target.value })}
                                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none font-medium"
                                                        placeholder="Enter assignment title"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-2 font-medium">If generic (e.g. "Unit Assignment"), it will sync with part title.</p>
                                                </div>

                                                <QuizBuilder
                                                    questions={quizQuestions}
                                                    onChange={setQuizQuestions}
                                                />

                                                <div className="flex justify-between pt-4 border-t border-gray-200 mt-6">
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
                                                                setLoading(true);
                                                                await onDeleteAssignment(part.part_id);
                                                                setLoading(false);
                                                                setExpandedPart(null);
                                                            }
                                                        }}
                                                        disabled={loading}
                                                        className="flex items-center px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-bold transition-colors disabled:opacity-50"
                                                    >
                                                        Reset Assignment
                                                    </button>

                                                    <button
                                                        onClick={() => handleSaveAssignment(part.part_id)}
                                                        disabled={loading}
                                                        className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-500/20 font-bold disabled:opacity-50 transition-all transform active:scale-95"
                                                    >
                                                        <LuSave className="w-5 h-5 mr-2" />
                                                        Save Assignment
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h5 className="font-bold text-gray-900">Upload Content</h5>
                                                    {hasContent && (
                                                        <a href={getFullUrl(part.content_url!)} target="_blank" rel="noreferrer" className="text-sm font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center bg-purple-50 px-3 py-1.5 rounded-lg transition-colors">
                                                            <LuEye className="w-4 h-4 mr-2" /> View Current File
                                                        </a>
                                                    )}
                                                </div>

                                                <FileUpload
                                                    onUploadComplete={(files) => handleFileAvailable(part.part_id, files)}
                                                    accept={part.part_type === 'video' ? 'video/*' : '.pdf,.ppt,.pptx'}
                                                    label={`Upload ${part.part_type === 'video' ? 'Video' : 'Document'}`}
                                                    maxSizeMB={part.part_type === 'video' ? 100 : 20}
                                                />

                                                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 flex items-start mt-2 border border-blue-100">
                                                    <div className="mr-3 font-bold text-lg">ℹ️</div>
                                                    <div className="font-medium pt-0.5">
                                                        Uploading a new file will replace the existing content immediately.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            }
                        </div>
                    );
                })}
            </div >
        </div>
    );
};

export default UnitContentEditor;
