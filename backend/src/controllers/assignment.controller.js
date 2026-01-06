const AssignmentModel = require('../models/Assignment.model');
const ContentModel = require('../models/Content.model');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');

class AssignmentController {
    // Get assignment details
    getAssignmentDetails = asyncHandler(async (req, res) => {
        const { partId } = req.params;
        const userId = req.user.userId;

        if (!partId) {
            throw new AppError('Part ID is required', 400);
        }

        // Get assignment
        const assignment = await AssignmentModel.getAssignmentByPartId(partId);

        if (!assignment) {
            throw new AppError('Assignment not found or inactive', 404);
        }

        // Check if student can attempt
        const canAttempt = await AssignmentModel.canAttemptAssignment(userId, assignment.assignment_id);

        // Get student's previous attempts and results
        const attempts = await AssignmentModel.getStudentAttempts(userId, assignment.assignment_id);
        const results = await AssignmentModel.getAssignmentResults(userId, assignment.assignment_id);

        // Log access
        await ContentModel.logContentAccess(
            userId,
            partId,
            'view',
            req.headers['user-agent'],
            req.ip
        );

        res.json({
            success: true,
            data: {
                assignment,
                canAttempt,
                attempts,
                results
            }
        });
    });

    // Start new attempt
    startAttempt = asyncHandler(async (req, res) => {
        const { partId } = req.params;
        const userId = req.user.userId;

        if (!partId) {
            throw new AppError('Part ID is required', 400);
        }

        // Get assignment
        const assignment = await AssignmentModel.getAssignmentByPartId(partId);

        if (!assignment) {
            throw new AppError('Assignment not found or inactive', 404);
        }

        // Check if student can attempt
        const canAttempt = await AssignmentModel.canAttemptAssignment(userId, assignment.assignment_id);

        if (!canAttempt.canAttempt) {
            throw new AppError(canAttempt.reason, 403);
        }

        let attempt;

        if (canAttempt.hasActiveAttempt) {
            // Resume existing attempt
            attempt = await AssignmentModel.getActiveAttempt(userId, assignment.assignment_id);
        } else {
            // Start new attempt
            const nextAttempt = await AssignmentModel.getNextAttemptNumber(userId, assignment.assignment_id);
            attempt = await AssignmentModel.startAttempt(userId, assignment.assignment_id, nextAttempt);
        }

        // Get questions (shuffled if enabled)
        const questions = await AssignmentModel.getQuestions(
            assignment.assignment_id,
            assignment.shuffle_questions
        );

        // Remove correct answers from questions sent to client
        const safeQuestions = questions.map(q => ({
            question_id: q.question_id,
            question_text: q.question_text,
            question_type: q.question_type,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            option_e: q.option_e,
            marks: q.marks,
            difficulty_level: q.difficulty_level,
            question_order: q.question_order
        }));

        res.json({
            success: true,
            data: {
                assignment,
                attempt,
                questions: safeQuestions,
                total_questions: safeQuestions.length,
                time_limit_seconds: assignment.time_limit_minutes * 60
            }
        });
    });

    // Save answer progress
    saveProgress = asyncHandler(async (req, res) => {
        const { attemptId } = req.params;
        const { answers, timeRemaining, currentQuestion } = req.body;
        const userId = req.user.userId;

        // Update attempt time
        await AssignmentModel.updateAttemptTime(attemptId, timeRemaining);

        // In a real implementation, you might want to save partial answers
        // For now, we'll just update the time

        res.json({
            success: true,
            message: 'Progress saved'
        });
    });

    // Submit assignment
    submitAssignment = asyncHandler(async (req, res) => {
        const { attemptId } = req.params;
        const { answers } = req.body;
        const userId = req.user.userId;

        // Get attempt details
        const query = `
            SELECT aa.*, a.* 
            FROM assignment_attempts aa
            JOIN assignments a ON aa.assignment_id = a.assignment_id
            WHERE aa.attempt_id = ? AND aa.student_id = ?
        `;

        const db = require('../config/mysql');
        const attemptRows = await db.execute(query, [attemptId, userId]);

        if (attemptRows.length === 0) {
            throw new AppError('Attempt not found', 404);
        }

        const attempt = attemptRows[0];

        // Calculate score
        const scoreResult = await AssignmentModel.calculateScore(
            attempt.assignment_id,
            answers
        );

        // Calculate time taken
        const timeTakenSeconds = attempt.time_limit_minutes * 60 - attempt.time_remaining_seconds;

        // Save submission
        const submissionId = await AssignmentModel.saveSubmission({
            assignment_id: attempt.assignment_id,
            student_id: userId,
            attempt_number: attempt.attempt_number,
            answers_json: answers,
            score: scoreResult.score,
            total_marks: scoreResult.total_marks,
            percentage: scoreResult.percentage,
            time_taken_seconds: timeTakenSeconds,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            review_data: scoreResult.review_data
        });

        // Complete attempt
        await AssignmentModel.completeAttempt(attemptId);

        // Mark learning part as completed if passed
        if (scoreResult.percentage >= attempt.passing_marks) {
            await ContentModel.markAsCompleted(userId, attempt.part_id);
        }

        // Get updated results
        const results = await AssignmentModel.getAssignmentResults(userId, attempt.assignment_id);

        res.json({
            success: true,
            data: {
                submission_id: submissionId,
                score: scoreResult.score,
                total_marks: scoreResult.total_marks,
                percentage: scoreResult.percentage,
                passed: scoreResult.percentage >= attempt.passing_marks,
                passing_marks: attempt.passing_marks,
                time_taken_seconds: timeTakenSeconds,
                review_data: attempt.show_results_immediately ? scoreResult.review_data : null,
                results_summary: results
            }
        });
    });

    // Get submission review
    getSubmissionReview = asyncHandler(async (req, res) => {
        const { submissionId } = req.params;
        const userId = req.user.userId;

        const query = `
            SELECT 
                s.*,
                a.title as assignment_title,
                a.show_results_immediately,
                a.allow_review
            FROM submissions s
            JOIN assignments a ON s.assignment_id = a.assignment_id
            WHERE s.submission_id = ? AND s.student_id = ?
        `;

        const db = require('../config/mysql');
        const rows = await db.execute(query, [submissionId, userId]);

        if (rows.length === 0) {
            throw new AppError('Submission not found', 404);
        }

        const submission = rows[0];

        if (!submission.allow_review && submission.status === 'submitted') {
            throw new AppError('Review not allowed for this assignment', 403);
        }

        // Parse JSON data
        submission.answers_json = JSON.parse(submission.answers_json || '{}');
        submission.review_data = JSON.parse(submission.review_data || '[]');

        // Get questions for context
        const questions = await AssignmentModel.getQuestions(submission.assignment_id, false);

        res.json({
            success: true,
            data: {
                submission,
                questions
            }
        });
    });

    // Get student's assignment history
    getAssignmentHistory = asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { assignmentId } = req.params;

        if (!assignmentId) {
            throw new AppError('Assignment ID is required', 400);
        }

        const history = await AssignmentModel.getSubmissionHistory(userId, assignmentId);

        // Parse JSON data
        const parsedHistory = history.map(item => ({
            ...item,
            answers_json: JSON.parse(item.answers_json || '{}'),
            review_data: JSON.parse(item.review_data || '[]')
        }));

        res.json({
            success: true,
            data: parsedHistory
        });
    });

    // Get all assignments for student
    getStudentAssignments = asyncHandler(async (req, res) => {
        const userId = req.user.userId;

        const query = `
            SELECT 
                a.*,
                lp.part_id,
                lp.title as part_title,
                lp.display_order,
                u.unit_name,
                m.module_name,
                ar.best_score,
                ar.best_percentage,
                ar.passed,
                ar.attempts_used,
                ar.last_attempt_at
            FROM assignments a
            JOIN learning_parts lp ON a.part_id = lp.part_id
            JOIN units u ON lp.unit_id = u.unit_id
            JOIN modules m ON u.module_id = m.module_id
            LEFT JOIN assignment_results ar ON a.assignment_id = ar.assignment_id AND ar.student_id = ?
            WHERE a.is_active = TRUE AND m.is_published = TRUE
            ORDER BY m.module_name, u.unit_order, lp.display_order
        `;

        const db = require('../config/mysql');
        const assignments = await db.execute(query, [userId]);

        res.json({
            success: true,
            data: assignments
        });
    });

    // Auto-save progress (for timer and auto-submit)
    autoSaveProgress = asyncHandler(async (req, res) => {
        const { attemptId } = req.params;
        const { timeRemaining } = req.body;
        const userId = req.user.userId;

        // Update time remaining
        await AssignmentModel.updateAttemptTime(attemptId, timeRemaining);

        // Check if time is up
        if (timeRemaining <= 0) {
            // Get attempt details
            const query = `
                SELECT aa.*, a.* 
                FROM assignment_attempts aa
                JOIN assignments a ON aa.assignment_id = a.assignment_id
                WHERE aa.attempt_id = ? AND aa.student_id = ?
            `;

            const db = require('../config/mysql');
            const attemptRows = await db.execute(query, [attemptId, userId]);

            if (attemptRows.length > 0) {
                const attempt = attemptRows[0];

                // Auto-submit with empty answers
                await AssignmentModel.saveSubmission({
                    assignment_id: attempt.assignment_id,
                    student_id: userId,
                    attempt_number: attempt.attempt_number,
                    answers_json: {},
                    score: 0,
                    total_marks: attempt.total_marks,
                    percentage: 0,
                    time_taken_seconds: attempt.time_limit_minutes * 60,
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent'],
                    review_data: []
                });

                // Mark attempt as timed out
                await AssignmentModel.completeAttempt(attemptId, 'timed_out');

                return res.json({
                    success: true,
                    timed_out: true,
                    message: 'Assignment auto-submitted due to time limit'
                });
            }
        }

        res.json({
            success: true,
            message: 'Progress auto-saved'
        });
    });
}

module.exports = new AssignmentController();