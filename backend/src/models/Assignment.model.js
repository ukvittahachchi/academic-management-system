const db = require('../config/mysql');

class AssignmentModel {
    // Get assignment by part_id
    static async getAssignmentByPartId(partId) {
        const query = `
            SELECT 
                a.*,
                lp.title as part_title
            FROM assignments a
            JOIN learning_parts lp ON a.part_id = lp.part_id
            WHERE a.part_id = ? AND a.is_active = TRUE
        `;

        const rows = await db.execute(query, [partId]);
        return rows[0] || null;
    }

    // Create Assignment with Questions (Transaction)
    static async createAssignmentWithQuestions(assignmentData, questionsData) {
        // Access pool directly for transaction support
        if (!db.pool) await db.connect();
        const connection = await db.pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Create Assignment
            const {
                part_id, title, description,
                total_marks, passing_marks, time_limit_minutes, max_attempts
            } = assignmentData;

            const [assignResult] = await connection.execute(
                `INSERT INTO assignments (
                    part_id, title, description,
                    total_marks, passing_marks, time_limit_minutes, max_attempts, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
                [part_id, title, description, total_marks, passing_marks, time_limit_minutes, max_attempts]
            );

            const assignmentId = assignResult.insertId;

            // 2. Create Questions
            for (const q of questionsData) {
                await connection.execute(
                    `INSERT INTO questions (
                        assignment_id, question_text, question_type,
                        option_a, option_b, option_c, option_d, option_e,
                        correct_answers, marks, explanation,
                        difficulty_level, question_order, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
                    [
                        assignmentId, q.question_text, q.question_type || 'single',
                        q.option_a, q.option_b, q.option_c, q.option_d, q.option_e,
                        q.correct_answers, q.marks || 1, q.explanation,
                        q.difficulty_level || 'medium', q.question_order
                    ]
                );
            }

            await connection.commit();
            return { assignment_id: assignmentId, success: true };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get assignment by assignment_id
    static async getAssignmentById(assignmentId) {
        const query = `
            SELECT 
                a.*,
                lp.title as part_title
            FROM assignments a
            JOIN learning_parts lp ON a.part_id = lp.part_id
            WHERE a.assignment_id = ? AND a.is_active = TRUE
        `;

        const rows = await db.execute(query, [assignmentId]);
        return rows[0] || null;
    }

    // Get questions for assignment
    static async getQuestions(assignmentId, shuffle = false) {
        let query = `
            SELECT 
                question_id,
                assignment_id,
                question_text,
                question_type,
                option_a,
                option_b,
                option_c,
                option_d,
                option_e,
                marks,
                difficulty_level,
                question_order
            FROM questions
            WHERE assignment_id = ? AND is_active = TRUE
        `;

        if (shuffle) {
            query += ' ORDER BY RAND()';
        } else {
            query += ' ORDER BY question_order';
        }

        const rows = await db.execute(query, [assignmentId]);
        return rows;
    }

    // Get student's assignment attempts
    static async getStudentAttempts(studentId, assignmentId) {
        const query = `
            SELECT 
                aa.*,
                s.score,
                s.percentage,
                s.submitted_at,
                s.status as submission_status
            FROM assignment_attempts aa
            LEFT JOIN submissions s ON aa.assignment_id = s.assignment_id 
                AND aa.student_id = s.student_id 
                AND aa.attempt_number = s.attempt_number
            WHERE aa.assignment_id = ? AND aa.student_id = ?
            ORDER BY aa.attempt_number DESC
        `;

        const rows = await db.execute(query, [assignmentId, studentId]);
        return rows;
    }

    // Get student's active attempt
    static async getActiveAttempt(studentId, assignmentId) {
        const query = `
            SELECT * FROM assignment_attempts
            WHERE assignment_id = ? AND student_id = ? AND status = 'in_progress'
            ORDER BY attempt_number DESC
            LIMIT 1
        `;

        const rows = await db.execute(query, [assignmentId, studentId]);
        return rows[0] || null;
    }

    // Start new attempt
    static async startAttempt(studentId, assignmentId, attemptNumber) {
        const query = `
            INSERT INTO assignment_attempts 
            (assignment_id, student_id, attempt_number, status, time_remaining_seconds)
            VALUES (?, ?, ?, 'in_progress', ?)
        `;

        // Get time limit in seconds
        const assignment = await this.getAssignmentById(assignmentId);
        const timeRemaining = assignment.time_limit_minutes * 60;

        await db.execute(query, [assignmentId, studentId, attemptNumber, timeRemaining]);

        // Return the created attempt
        return this.getActiveAttempt(studentId, assignmentId);
    }

    // Update attempt time
    static async updateAttemptTime(attemptId, timeRemaining) {
        const query = `
            UPDATE assignment_attempts 
            SET time_remaining_seconds = ?, last_question_accessed = last_question_accessed + 1
            WHERE attempt_id = ?
        `;

        await db.execute(query, [timeRemaining, attemptId]);
    }

    // Complete attempt
    static async completeAttempt(attemptId, status = 'completed') {
        const query = `
            UPDATE assignment_attempts 
            SET status = ?, end_time = NOW()
            WHERE attempt_id = ?
        `;

        await db.execute(query, [status, attemptId]);
    }

    // Save submission
    static async saveSubmission(data) {
        const {
            assignment_id,
            student_id,
            attempt_number,
            answers_json,
            score,
            total_marks,
            percentage,
            time_taken_seconds,
            ip_address,
            user_agent,
            review_data
        } = data;

        const query = `
            INSERT INTO submissions 
            (assignment_id, student_id, attempt_number, answers_json, score, 
             total_marks, percentage, time_taken_seconds, submitted_at, 
             status, ip_address, user_agent, review_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'submitted', ?, ?, ?)
        `;

        const result = await db.execute(query, [
            assignment_id,
            student_id,
            attempt_number,
            JSON.stringify(answers_json),
            score,
            total_marks,
            percentage,
            time_taken_seconds,
            ip_address,
            user_agent,
            JSON.stringify(review_data)
        ]);

        // Update assignment results summary
        await this.updateAssignmentResults(assignment_id, student_id, score, percentage);

        return result.insertId;
    }

    // Update assignment results summary
    static async updateAssignmentResults(assignmentId, studentId, score, percentage) {
        // Check if result exists
        const checkQuery = `
            SELECT * FROM assignment_results 
            WHERE assignment_id = ? AND student_id = ?
        `;

        const existing = await db.execute(checkQuery, [assignmentId, studentId]);

        if (existing.length > 0) {
            // Update existing
            const updateQuery = `
                UPDATE assignment_results 
                SET 
                    attempts_used = attempts_used + 1,
                    last_attempt_at = NOW(),
                    best_score = GREATEST(best_score, ?),
                    best_percentage = GREATEST(best_percentage, ?),
                    passed = ? >= (SELECT passing_marks FROM assignments WHERE assignment_id = ?)
                WHERE assignment_id = ? AND student_id = ?
            `;

            const assignment = await this.getAssignmentById(assignmentId);
            const passed = percentage >= assignment.passing_marks;

            await db.execute(updateQuery, [
                score, percentage, percentage, assignmentId,
                assignmentId, studentId
            ]);
        } else {
            // Insert new
            const insertQuery = `
                INSERT INTO assignment_results 
                (assignment_id, student_id, best_score, best_percentage, 
                 attempts_used, last_attempt_at, passed)
                VALUES (?, ?, ?, ?, 1, NOW(), ?)
            `;

            const assignment = await this.getAssignmentById(assignmentId);
            const passed = percentage >= assignment.passing_marks;

            await db.execute(insertQuery, [
                assignmentId, studentId, score, percentage, passed
            ]);
        }
    }

    // Get student's submission history
    static async getSubmissionHistory(studentId, assignmentId) {
        const query = `
            SELECT 
                s.*,
                a.title as assignment_title
            FROM submissions s
            JOIN assignments a ON s.assignment_id = a.assignment_id
            WHERE s.student_id = ? AND s.assignment_id = ?
            ORDER BY s.attempt_number DESC
        `;

        const rows = await db.execute(query, [studentId, assignmentId]);
        return rows;
    }

    // Get submission by attempt
    static async getSubmissionByAttempt(studentId, assignmentId, attemptNumber) {
        const query = `
            SELECT * FROM submissions
            WHERE student_id = ? AND assignment_id = ? AND attempt_number = ?
        `;

        const rows = await db.execute(query, [studentId, assignmentId, attemptNumber]);
        return rows[0] || null;
    }

    // Get next attempt number for student
    static async getNextAttemptNumber(studentId, assignmentId) {
        const query = `
            SELECT COALESCE(MAX(attempt_number), 0) + 1 as next_attempt
            FROM assignment_attempts
            WHERE student_id = ? AND assignment_id = ?
        `;

        const rows = await db.execute(query, [studentId, assignmentId]);
        return rows[0].next_attempt;
    }

    // Check if student can attempt assignment
    static async canAttemptAssignment(studentId, assignmentId) {
        const assignment = await this.getAssignmentById(assignmentId);

        if (!assignment) {
            return { canAttempt: false, reason: 'Assignment not found' };
        }

        // Check max attempts
        const attempts = await this.getStudentAttempts(studentId, assignmentId);
        const submittedAttempts = attempts.filter(a => a.submission_status === 'submitted');

        if (submittedAttempts.length >= assignment.max_attempts) {
            return {
                canAttempt: false,
                reason: 'Maximum attempts reached',
                attemptsUsed: submittedAttempts.length,
                maxAttempts: assignment.max_attempts
            };
        }

        // Check if there's an active attempt
        const activeAttempt = await this.getActiveAttempt(studentId, assignmentId);
        if (activeAttempt) {
            return {
                canAttempt: true,
                hasActiveAttempt: true,
                attemptId: activeAttempt.attempt_id,
                attemptNumber: activeAttempt.attempt_number
            };
        }

        return {
            canAttempt: true,
            hasActiveAttempt: false,
            nextAttempt: submittedAttempts.length + 1
        };
    }

    // Get assignment results summary for student
    static async getAssignmentResults(studentId, assignmentId) {
        const query = `
            SELECT 
                ar.*,
                a.title as assignment_title,
                a.total_marks,
                a.passing_marks,
                a.max_attempts
            FROM assignment_results ar
            JOIN assignments a ON ar.assignment_id = a.assignment_id
            WHERE ar.assignment_id = ? AND ar.student_id = ?
        `;

        const rows = await db.execute(query, [assignmentId, studentId]);
        return rows[0] || null;
    }

    // Calculate score for submission
    static async calculateScore(assignmentId, studentAnswers) {
        // Get all questions with correct answers
        const questions = await this.getQuestions(assignmentId, false);

        let totalScore = 0;
        let totalMarks = 0;
        const reviewData = [];

        for (const question of questions) {
            totalMarks += question.marks;

            const studentAnswer = studentAnswers[question.question_id];
            const correctAnswers = question.correct_answers.split(',').map(a => a.trim());

            let isCorrect = false;
            let marksObtained = 0;

            if (question.question_type === 'single') {
                // Single choice - answer must match exactly
                isCorrect = studentAnswer && correctAnswers.includes(studentAnswer.toUpperCase());
            } else {
                // Multiple choice - all selected answers must match
                if (studentAnswer && Array.isArray(studentAnswer)) {
                    const sortedStudent = studentAnswer.sort().join(',');
                    const sortedCorrect = correctAnswers.sort().join(',');
                    isCorrect = sortedStudent === sortedCorrect;
                }
            }

            if (isCorrect) {
                marksObtained = question.marks;
                totalScore += question.marks;
            }

            reviewData.push({
                question_id: question.question_id,
                correct: isCorrect,
                student_answer: studentAnswer,
                correct_answers: correctAnswers,
                marks_obtained: marksObtained,
                total_marks: question.marks,
                explanation: question.explanation
            });
        }

        const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;

        return {
            score: totalScore,
            total_marks: totalMarks,
            percentage: parseFloat(percentage.toFixed(2)),
            review_data: reviewData
        };
    }
}

module.exports = AssignmentModel;