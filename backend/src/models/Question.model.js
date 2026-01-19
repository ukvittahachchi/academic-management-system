const db = require('../config/mysql');
const { AppError, NotFoundError } = require('../utils/errors');

class Question {
    // ======================
    // CREATE QUESTION
    // ======================
    static async create(questionData) {
        const {
            assignment_id,
            question_text,
            question_type,
            option_a,
            option_b,
            option_c,
            option_d,
            option_e,
            correct_answers,
            marks,
            explanation,
            difficulty_level,
            question_order
        } = questionData;

        if (!assignment_id || !question_text || !correct_answers) {
            throw new AppError('Missing required fields: assignment_id, question_text, correct_answers', 400);
        }

        const sql = `
            INSERT INTO questions (
                assignment_id, question_text, question_type,
                option_a, option_b, option_c, option_d, option_e,
                correct_answers, marks, explanation,
                difficulty_level, question_order, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `;

        const params = [
            assignment_id,
            question_text,
            question_type || 'single',
            option_a || null,
            option_b || null,
            option_c || null,
            option_d || null,
            option_e || null,
            correct_answers,
            marks || 1,
            explanation || null,
            difficulty_level || 'medium',
            question_order || 1
        ];

        try {
            const result = await db.execute(sql, params);
            return this.findById(result.insertId);
        } catch (error) {
            console.error('Create Question Error:', error);
            throw new AppError('Failed to create question', 500);
        }
    }

    // ======================
    // FIND BY ID
    // ======================
    static async findById(questionId) {
        const sql = `
            SELECT * FROM questions WHERE question_id = ? AND is_active = TRUE
        `;
        const rows = await db.execute(sql, [questionId]);

        if (!rows || rows.length === 0) {
            throw new NotFoundError('Question');
        }
        return rows[0];
    }

    // ======================
    // FIND BY ASSIGNMENT
    // ======================
    static async findByAssignment(assignmentId) {
        const sql = `
            SELECT * FROM questions 
            WHERE assignment_id = ? AND is_active = TRUE 
            ORDER BY question_order ASC
        `;
        return await db.execute(sql, [assignmentId]);
    }

    // ======================
    // UPDATE QUESTION
    // ======================
    static async update(questionId, updateData) {
        // Verify existence
        const question = await this.findById(questionId);
        if (!question) throw new NotFoundError('Question');

        const allowedFields = [
            'question_text', 'question_type',
            'option_a', 'option_b', 'option_c', 'option_d', 'option_e',
            'correct_answers', 'marks', 'explanation',
            'difficulty_level', 'question_order', 'is_active'
        ];

        const updates = [];
        const params = [];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(updateData[field]);
            }
        }

        if (updates.length === 0) return question;

        params.push(questionId);
        const sql = `UPDATE questions SET ${updates.join(', ')} WHERE question_id = ?`;

        await db.execute(sql, params);
        return this.findById(questionId);
    }

    // ======================
    // DELETE QUESTION
    // ======================
    static async delete(questionId) {
        // Soft delete
        const sql = 'UPDATE questions SET is_active = FALSE WHERE question_id = ?';
        await db.execute(sql, [questionId]);
        return { success: true, message: 'Question deleted successfully' };
    }
}

module.exports = Question;
