'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ContentMetadata } from '@/lib/types/content';
import { assignmentAPI } from '@/lib/api-client';
import {
    StartAttemptResponse,
    Question,
    StudentAnswer,
    SubmissionResponse
} from '@/lib/types/assignment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

interface AssignmentViewerProps {
    content: ContentMetadata;
    onComplete?: () => void;
}

export default function AssignmentViewer({ content, onComplete }: AssignmentViewerProps) {
    const router = useRouter();
    const [view, setView] = useState<'details' | 'attempt' | 'results'>('details');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [assignmentData, setAssignmentData] = useState<StartAttemptResponse | null>(null);
    const [submissionResult, setSubmissionResult] = useState<SubmissionResponse | null>(null);
    const [answers, setAnswers] = useState<StudentAnswer>({});
    const [currentQuestion, setCurrentQuestion] = useState<number>(0);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveRef = useRef<NodeJS.Timeout | null>(null);

    // Load assignment details
    useEffect(() => {
        loadAssignmentDetails();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        };
    }, [content.part_id]);

    const loadAssignmentDetails = async () => {
        try {
            setLoading(true);
            const data = await assignmentAPI.getAssignmentDetails(content.part_id);

            if (data.canAttempt.hasActiveAttempt) {
                // Resume existing attempt
                await startAttempt();
            } else {
                setLoading(false);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load assignment');
            setLoading(false);
        }
    };

    const startAttempt = async () => {
        try {
            setLoading(true);
            const data = await assignmentAPI.startAssignmentAttempt(content.part_id);
            setAssignmentData(data);
            setTimeRemaining(data.time_limit_seconds);
            setView('attempt');

            // Start timer
            startTimer(data.time_limit_seconds);

            // Start auto-save every 30 seconds
            startAutoSave(data.attempt.attempt_id);

            setLoading(false);
        } catch (err: any) {
            setError(err.message || 'Failed to start attempt');
            setLoading(false);
        }
    };

    const startTimer = (initialTime: number) => {
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startAutoSave = (attemptId: number) => {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);

        autoSaveRef.current = setTimeout(async () => {
            if (assignmentData) {
                try {
                    const result = await assignmentAPI.autoSaveAssignmentProgress(attemptId, timeRemaining);
                    if (result.timed_out) {
                        handleTimeUp();
                    }
                } catch (err) {
                    console.error('Auto-save failed:', err);
                }

                // Schedule next auto-save
                startAutoSave(attemptId);
            }
        }, 30000); // Auto-save every 30 seconds
    };

    const handleTimeUp = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);

        // Auto-submit with current answers
        if (assignmentData) {
            try {
                setIsSubmitting(true);
                const result = await assignmentAPI.submitAssignment(
                    assignmentData.attempt.attempt_id,
                    answers
                );
                setSubmissionResult(result);
                setView('results');
            } catch (err: any) {
                setError('Time is up! Assignment auto-submitted.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleAnswerChange = (questionId: number, answer: string | string[]) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));

        // Save progress
        if (assignmentData) {
            assignmentAPI.saveAssignmentProgress(
                assignmentData.attempt.attempt_id,
                { ...answers, [questionId]: answer },
                timeRemaining,
                currentQuestion
            );
        }
    };

    const handleSingleChoice = (questionId: number, option: string) => {
        handleAnswerChange(questionId, option);
    };

    const handleMultipleChoice = (questionId: number, option: string) => {
        const currentAnswers = Array.isArray(answers[questionId])
            ? answers[questionId] as string[]
            : [];

        const newAnswers = currentAnswers.includes(option)
            ? currentAnswers.filter(a => a !== option)
            : [...currentAnswers, option];

        handleAnswerChange(questionId, newAnswers);
    };

    const handleSubmit = async () => {
        setShowConfirmSubmit(true);
    };

    const confirmSubmit = async () => {
        if (!assignmentData) return;

        try {
            setIsSubmitting(true);
            const result = await assignmentAPI.submitAssignment(
                assignmentData.attempt.attempt_id,
                answers
            );

            setSubmissionResult(result);
            setView('results');

            // Stop timers
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveRef.current) clearTimeout(autoSaveRef.current);

            // Mark as completed if passed
            if (result.passed && onComplete) {
                onComplete();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit assignment');
        } finally {
            setIsSubmitting(false);
            setShowConfirmSubmit(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgressPercentage = () => {
        if (!assignmentData) return 0;
        const answered = Object.keys(answers).length;
        return (answered / assignmentData.total_questions) * 100;
    };

    const renderDetailsView = () => {
        if (!assignmentData) return null;

        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">
                            {assignmentData.assignment.title}
                        </h1>
                        <p className="text-gray-600 text-lg">
                            {assignmentData.assignment.description}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-lg">
                            <h3 className="font-semibold text-blue-800 mb-2">📊 Assignment Details</h3>
                            <ul className="space-y-2">
                                <li className="flex justify-between">
                                    <span className="text-gray-600">Questions:</span>
                                    <span className="font-medium">{assignmentData.assignment.question_count}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-gray-600">Total Marks:</span>
                                    <span className="font-medium">{assignmentData.assignment.total_marks}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-gray-600">Passing Marks:</span>
                                    <span className="font-medium">{assignmentData.assignment.passing_marks}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-gray-600">Time Limit:</span>
                                    <span className="font-medium">{assignmentData.assignment.time_limit_minutes} minutes</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-gray-600">Attempts Allowed:</span>
                                    <span className="font-medium">{assignmentData.assignment.max_attempts}</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-green-50 p-6 rounded-lg">
                            <h3 className="font-semibold text-green-800 mb-2">📝 Instructions</h3>
                            <ul className="space-y-2">
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <span>Read each question carefully</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <span>Timer will start when you begin the attempt</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <span>You can navigate between questions</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <span>Answers are auto-saved every 30 seconds</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-green-600 mr-2">✓</span>
                                    <span>Submit before time runs out</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={startAttempt}
                            className="px-8 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Start Assignment
                        </button>
                        <p className="text-gray-500 text-sm mt-4">
                            You have {assignmentData.assignment.max_attempts} attempts remaining
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const renderAttemptView = () => {
        if (!assignmentData) return null;

        const currentQ = assignmentData.questions[currentQuestion];
        const isSingleChoice = currentQ.question_type === 'single';
        const currentAnswer = answers[currentQ.question_id];

        return (
            <div className="h-full flex flex-col bg-gray-50">
                {/* Header with Timer */}
                <div className="bg-white shadow">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    {assignmentData.assignment.title}
                                </h1>
                                <p className="text-gray-600 text-sm">
                                    Question {currentQuestion + 1} of {assignmentData.total_questions}
                                </p>
                            </div>

                            <div className="flex items-center space-x-6">
                                {/* Timer */}
                                <div className={`text-lg font-bold px-4 py-2 rounded-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    ⏱️ {formatTime(timeRemaining)}
                                </div>

                                {/* Progress */}
                                <div className="text-center">
                                    <div className="text-sm text-gray-600">Progress</div>
                                    <div className="text-lg font-bold text-gray-900">
                                        {Math.round(getProgressPercentage())}%
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    Submit Assignment
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${getProgressPercentage()}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden">
                    <div className="h-full grid grid-cols-1 lg:grid-cols-4">
                        {/* Questions Navigation */}
                        <div className="lg:col-span-1 bg-white border-r p-4 overflow-y-auto">
                            <h3 className="font-semibold text-gray-900 mb-4">Questions</h3>
                            <div className="grid grid-cols-5 lg:grid-cols-2 gap-2">
                                {assignmentData.questions.map((q, index) => (
                                    <button
                                        key={q.question_id}
                                        onClick={() => setCurrentQuestion(index)}
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm ${currentQuestion === index
                                            ? 'bg-blue-100 border-2 border-blue-500'
                                            : answers[q.question_id]
                                                ? 'bg-green-100 border border-green-300'
                                                : 'bg-gray-100 border border-gray-300 hover:bg-gray-200'
                                            }`}
                                    >
                                        <span className="font-medium">Q{index + 1}</span>
                                        <span className={`text-xs mt-1 ${answers[q.question_id] ? 'text-green-600' : 'text-gray-500'
                                            }`}>
                                            {answers[q.question_id] ? '✓' : '○'}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="mt-6 text-xs text-gray-600">
                                <div className="flex items-center space-x-2 mb-1">
                                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                                    <span>Answered</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-blue-100 border-2 border-blue-500 rounded"></div>
                                    <span>Current</span>
                                </div>
                            </div>
                        </div>

                        {/* Question Area */}
                        <div className="lg:col-span-3 p-6 overflow-y-auto">
                            <div className="max-w-3xl mx-auto">
                                {/* Question Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center space-x-3 mb-2">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                                                Question {currentQuestion + 1}
                                            </span>
                                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${currentQ.difficulty_level === 'easy'
                                                ? 'bg-green-100 text-green-700'
                                                : currentQ.difficulty_level === 'medium'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {currentQ.difficulty_level.toUpperCase()}
                                            </span>
                                            <span className="text-gray-500 text-sm">
                                                Marks: {currentQ.marks}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900">
                                            {currentQ.question_text}
                                        </h2>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-sm text-gray-500">Question Type</div>
                                        <div className="font-medium">
                                            {isSingleChoice ? 'Single Choice' : 'Multiple Choice'}
                                        </div>
                                    </div>
                                </div>

                                {/* Options */}
                                <div className="space-y-4">
                                    {['A', 'B', 'C', 'D', 'E'].map((option) => {
                                        const optionText = currentQ[`option_${option.toLowerCase()}` as keyof Question] as string;
                                        if (!optionText) return null;

                                        const isSelected = isSingleChoice
                                            ? currentAnswer === option
                                            : Array.isArray(currentAnswer) && currentAnswer.includes(option);

                                        return (
                                            <div
                                                key={option}
                                                onClick={() => {
                                                    if (isSingleChoice) {
                                                        handleSingleChoice(currentQ.question_id, option);
                                                    } else {
                                                        handleMultipleChoice(currentQ.question_id, option);
                                                    }
                                                }}
                                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-start">
                                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${isSelected
                                                        ? 'bg-blue-500 text-white'
                                                        : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {option}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-gray-800">{optionText}</p>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="ml-2 text-blue-500">
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex justify-between mt-8">
                                    <button
                                        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                                        disabled={currentQuestion === 0}
                                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        ← Previous
                                    </button>

                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => {
                                                // Mark for review
                                                // You can implement this feature
                                            }}
                                            className="px-4 py-2 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50"
                                        >
                                            ⭐ Mark for Review
                                        </button>

                                        <button
                                            onClick={() => setCurrentQuestion(prev => {
                                                if (prev < assignmentData.total_questions - 1) {
                                                    return prev + 1;
                                                }
                                                return prev;
                                            })}
                                            disabled={currentQuestion === assignmentData.total_questions - 1}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="bg-white border-t p-4">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                {Object.keys(answers).length} of {assignmentData.total_questions} questions answered
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        // Clear current answer
                                        handleAnswerChange(currentQ.question_id, isSingleChoice ? '' : []);
                                    }}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    Clear Answer
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Submit Assignment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderResultsView = () => {
        if (!submissionResult) return null;

        const isPassed = submissionResult.passed;
        const percentage = submissionResult.percentage;

        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className={`p-8 text-center ${isPassed ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="text-6xl mb-4">
                            {isPassed ? '🎉' : '📝'}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {isPassed ? 'Congratulations!' : 'Keep Practicing!'}
                        </h1>
                        <p className="text-gray-600 text-lg">
                            {isPassed
                                ? 'You have successfully passed the assignment!'
                                : 'You need more practice to pass this assignment.'}
                        </p>
                    </div>

                    {/* Results Summary */}
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-blue-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-blue-700 mb-2">
                                    {submissionResult.score}/{submissionResult.total_marks}
                                </div>
                                <div className="text-sm text-blue-600">Score</div>
                            </div>

                            <div className="bg-green-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-green-700 mb-2">
                                    {percentage}%
                                </div>
                                <div className="text-sm text-green-600">Percentage</div>
                            </div>

                            <div className="bg-purple-50 p-6 rounded-lg text-center">
                                <div className="text-3xl font-bold text-purple-700 mb-2">
                                    {Math.floor(submissionResult.time_taken_seconds / 60)}:
                                    {(submissionResult.time_taken_seconds % 60).toString().padStart(2, '0')}
                                </div>
                                <div className="text-sm text-purple-600">Time Taken</div>
                            </div>

                            <div className={`p-6 rounded-lg text-center ${isPassed ? 'bg-green-100' : 'bg-red-100'}`}>
                                <div className="text-3xl font-bold mb-2">
                                    {isPassed ? 'PASS' : 'FAIL'}
                                </div>
                                <div className={`text-sm ${isPassed ? 'text-green-700' : 'text-red-700'}`}>
                                    {isPassed ? 'Passed' : `Need ${submissionResult.passing_marks}% to pass`}
                                </div>
                            </div>
                        </div>

                        {/* Performance Meter */}
                        <div className="mb-8">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Your Performance</span>
                                <span>{percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className={`h-4 rounded-full transition-all duration-1000 ${percentage >= 70 ? 'bg-green-500' :
                                        percentage >= 40 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                        }`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-gray-500">0%</span>
                                <span className="text-xs text-gray-500">50%</span>
                                <span className="text-xs text-gray-500">100%</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-4 justify-center">
                            <button
                                onClick={() => {
                                    // View detailed review
                                    if (submissionResult.review_data) {
                                        // Show review modal or navigate to review page
                                        // You can implement this
                                        alert('Review feature coming soon!');
                                    }
                                }}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                📊 View Detailed Review
                            </button>

                            <button
                                onClick={() => {
                                    // Retry assignment
                                    if (submissionResult.results_summary.attempts_used <
                                        submissionResult.results_summary.max_attempts!) {
                                        setView('details');
                                        loadAssignmentDetails();
                                    }
                                }}
                                disabled={submissionResult.results_summary.attempts_used >=
                                    submissionResult.results_summary.max_attempts!}
                                className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                            >
                                🔄 Try Again ({submissionResult.results_summary.attempts_used}/
                                {submissionResult.results_summary.max_attempts} attempts used)
                            </button>

                            <button
                                onClick={() => router.push('/student/dashboard')}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                🏠 Back to Dashboard
                            </button>
                        </div>

                        {/* Quick Stats */}
                        {submissionResult.review_data && (
                            <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                                <h3 className="font-semibold text-gray-900 mb-4">Quick Statistics</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600">
                                            {submissionResult.review_data.filter(q => q.correct).length}
                                        </div>
                                        <div className="text-sm text-gray-600">Correct Answers</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-red-600">
                                            {submissionResult.review_data.filter(q => !q.correct).length}
                                        </div>
                                        <div className="text-sm text-gray-600">Incorrect Answers</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {submissionResult.review_data.filter(q => q.marks_obtained > 0).length}
                                        </div>
                                        <div className="text-sm text-gray-600">Questions Scored</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {Math.round(submissionResult.review_data.filter(q => q.correct).length /
                                                submissionResult.review_data.length * 100)}%
                                        </div>
                                        <div className="text-sm text-gray-600">Accuracy</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderConfirmModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="text-center mb-6">
                    <div className="text-5xl mb-4">❓</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Submit Assignment?
                    </h3>
                    <p className="text-gray-600">
                        Are you sure you want to submit your answers? You cannot change them after submission.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800 mb-2">Submission Summary:</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Questions answered: {Object.keys(answers).length}/
                                {assignmentData?.total_questions}</li>
                            <li>• Time remaining: {formatTime(timeRemaining)}</li>
                            <li>• Attempt: {assignmentData?.attempt.attempt_number}/
                                {assignmentData?.assignment.max_attempts}</li>
                        </ul>
                    </div>

                    <div className="flex space-x-4">
                        <button
                            onClick={() => setShowConfirmSubmit(false)}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmSubmit}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Submitting...
                                </span>
                            ) : (
                                'Yes, Submit Now'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <ErrorMessage error={error} onRetry={loadAssignmentDetails} />
            </div>
        );
    }

    return (
        <div className="h-full">
            {view === 'details' && renderDetailsView()}
            {view === 'attempt' && renderAttemptView()}
            {view === 'results' && renderResultsView()}
            {showConfirmSubmit && renderConfirmModal()}
        </div>
    );
}