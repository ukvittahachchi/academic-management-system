const db = require('../config/mysql');

class Report {
    static async createReport(reportData) {
        const sql = `
            INSERT INTO reports 
            (school_id, report_type, report_name, generated_by, parameters_json, file_path, file_size_bytes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.execute(sql, [
            reportData.school_id,
            reportData.report_type,
            reportData.report_name,
            reportData.generated_by,
            JSON.stringify(reportData.parameters || {}),
            reportData.file_path,
            reportData.file_size_bytes
        ]);

        return result.insertId;
    }

    static async getReports(schoolId, userId, role, limit = 50, offset = 0) {
        let sql = `
            SELECT r.*, u.full_name as generated_by_name
            FROM reports r
            JOIN users u ON r.generated_by = u.user_id
            WHERE r.school_id = ?
        `;

        const params = [schoolId];

        if (role === 'teacher') {
            sql += ' AND r.generated_by = ?';
            params.push(userId);
        }

        sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const reports = await db.execute(sql, params);
        return reports;
    }

    static async getReportById(reportId, schoolId) {
        const sql = `
            SELECT r.*, u.full_name as generated_by_name
            FROM reports r
            JOIN users u ON r.generated_by = u.user_id
            WHERE r.report_id = ? AND r.school_id = ?
        `;

        const reports = await db.execute(sql, [reportId, schoolId]);
        return reports[0];
    }

    static async incrementDownloadCount(reportId) {
        const sql = 'UPDATE reports SET download_count = download_count + 1 WHERE report_id = ?';
        await db.execute(sql, [reportId]);
    }

    static async deleteOldReports(days = 30) {
        const sql = `
            DELETE FROM reports 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            OR (expires_at IS NOT NULL AND expires_at < NOW())
        `;

        const result = await db.execute(sql, [days]);
        return result.affectedRows;
    }

    static async getReportItems(reportType) {
        const sql = `
            SELECT * FROM report_items 
            WHERE report_type = ? AND is_visible = TRUE
            ORDER BY sort_order
        `;

        const items = await db.execute(sql, [reportType]);
        return items;
    }

    static async getStudentPerformanceData(schoolId, filters = {}) {
        let sql = `
            SELECT 
                u.user_id,
                u.full_name as student_name,
                u.username,
                u.class_grade,
                m.module_name,
                COUNT(DISTINCT up.unit_id) as units_completed,
                COUNT(DISTINCT lp.part_id) as total_assignments,
                SUM(CASE WHEN sp.status = 'completed' AND lp.part_type = 'assignment' THEN 1 ELSE 0 END) as assignments_completed,
                AVG(CASE WHEN sp.score IS NOT NULL THEN sp.score ELSE 0 END) as average_score,
                SUM(sp.time_spent_seconds) as total_time_spent,
                MAX(sp.last_accessed) as last_active
            FROM users u
            LEFT JOIN student_progress sp ON u.user_id = sp.student_id
            LEFT JOIN learning_parts lp ON sp.part_id = lp.part_id
            LEFT JOIN units up ON lp.unit_id = up.unit_id
            LEFT JOIN modules m ON up.module_id = m.module_id
            WHERE u.school_id = ? 
            AND u.role = 'student'
            AND u.is_active = TRUE
        `;

        const params = [schoolId];

        // Apply filters
        if (filters.classGrade) {
            sql += ' AND u.class_grade = ?';
            params.push(filters.classGrade);
        }

        if (filters.startDate && filters.endDate) {
            sql += ' AND sp.last_accessed BETWEEN ? AND ?';
            params.push(filters.startDate, filters.endDate);
        }

        if (filters.moduleId) {
            sql += ' AND m.module_id = ?';
            params.push(filters.moduleId);
        }

        sql += ' GROUP BY u.user_id, m.module_id';

        const data = await db.execute(sql, params);
        return data;
    }

    static async getClassSummaryData(schoolId, filters = {}) {
        let sql = `
            SELECT 
                u.class_grade,
                COUNT(DISTINCT u.user_id) as total_students,
                SUM(CASE WHEN u.last_login > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as active_students,
                AVG(
                    CASE 
                        WHEN sp.score IS NOT NULL THEN sp.score 
                        ELSE 0 
                    END
                ) as avg_score,
                AVG(
                    CASE 
                        WHEN sp.status = 'completed' THEN 1 
                        ELSE 0 
                    END
                ) * 100 as avg_completion_rate,
                MAX(sp.score) as top_score,
                (
                    SELECT u2.full_name 
                    FROM users u2
                    JOIN student_progress sp2 ON u2.user_id = sp2.student_id
                    WHERE u2.class_grade = u.class_grade
                    AND sp2.score = MAX(sp.score)
                    LIMIT 1
                ) as top_performer,
                SUM(CASE WHEN sp.score < 40 THEN 1 ELSE 0 END) as need_attention,
                AVG(sp.time_spent_seconds) as avg_time_spent
            FROM users u
            LEFT JOIN student_progress sp ON u.user_id = sp.student_id
            WHERE u.school_id = ?
            AND u.role = 'student'
            AND u.is_active = TRUE
        `;

        const params = [schoolId];

        if (filters.startDate && filters.endDate) {
            sql += ' AND sp.last_accessed BETWEEN ? AND ?';
            params.push(filters.startDate, filters.endDate);
        }

        sql += ' GROUP BY u.class_grade ORDER BY u.class_grade';

        const data = await db.execute(sql, params);
        return data;
    }

    static async getSystemUsageData(schoolId, days = 30) {
        const sql = `
            SELECT 
                DATE(a.created_at) as date,
                COUNT(CASE WHEN a.activity_type = 'login' THEN 1 END) as total_logins,
                COUNT(DISTINCT a.user_id) as active_users,
                COUNT(CASE WHEN sp.status = 'completed' AND lp.part_type = 'assignment' THEN 1 END) as new_assignments,
                COUNT(DISTINCT sp.part_id) as modules_accessed,
                AVG(sp.time_spent_seconds) / 60 as avg_session_time,
                COUNT(CASE WHEN a.activity_type = 'login_failed' THEN 1 END) as error_count,
                DATE_FORMAT(a.created_at, '%H:00') as peak_hour
            FROM auth_activity_logs a
            LEFT JOIN student_progress sp ON a.user_id = sp.student_id
            LEFT JOIN learning_parts lp ON sp.part_id = lp.part_id
            WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            AND EXISTS (
                SELECT 1 FROM users u 
                WHERE u.user_id = a.user_id 
                AND u.school_id = ?
            )
            GROUP BY DATE(a.created_at), DATE_FORMAT(a.created_at, '%H')
            ORDER BY date DESC, total_logins DESC
        `;

        const data = await db.execute(sql, [days, schoolId]);
        return data;
    }

    static async getModuleAnalyticsData(schoolId, filters = {}) {
        let sql = `
            SELECT 
                m.module_name,
                m.grade_level,
                COUNT(DISTINCT sp.student_id) as total_students_started,
                SUM(CASE WHEN sp.status = 'completed' THEN 1 ELSE 0 END) as completions,
                AVG(CASE WHEN sp.status = 'completed' THEN 100 ELSE 0 END) as avg_completion_percentage,
                AVG(CASE WHEN sp.score IS NOT NULL THEN sp.score END) as avg_score,
                SUM(sp.time_spent_seconds) / 3600 as total_hours_spent
            FROM modules m
            JOIN units u ON m.module_id = u.module_id
            JOIN learning_parts lp ON u.unit_id = lp.unit_id
            LEFT JOIN student_progress sp ON lp.part_id = sp.part_id
            WHERE m.school_id = ?
        `;

        const params = [schoolId];

        if (filters.gradeLevel) {
            sql += ' AND m.grade_level = ?';
            params.push(filters.gradeLevel);
        }

        sql += ' GROUP BY m.module_id ORDER BY avg_score DESC';

        const data = await db.execute(sql, params);
        return data;
    }
}

module.exports = Report;