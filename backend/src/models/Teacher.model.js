const db = require('../config/mysql');

class TeacherModel {
    // Get teacher's assigned classes
    static async getTeacherClasses(teacherId) {
        const query = `
            SELECT 
                tc.*,
                m.module_name,
                m.grade_level,
                m.subject,
                m.description,
                COUNT(DISTINCT ts.student_id) as student_count
            FROM teacher_classes tc
            JOIN modules m ON tc.module_id = m.module_id
            LEFT JOIN teacher_students_view ts ON tc.assignment_id = ts.assignment_id
            WHERE tc.teacher_id = ? AND tc.is_active = TRUE
            GROUP BY tc.assignment_id, tc.teacher_id, tc.module_id, tc.class_section
            ORDER BY m.module_name, tc.class_section
        `;

        const rows = await db.execute(query, [teacherId]);
        return rows;
    }

    // Get students in teacher's class
    static async getClassStudents(teacherId, filters = {}) {
        let query = `
            SELECT 
                ts.*,
                CASE 
                    WHEN ts.completed_parts = 0 THEN 'not_started'
                    WHEN ts.completed_parts = ts.total_parts THEN 'completed'
                    ELSE 'in_progress'
                END as overall_status,
                ROUND(ts.completed_parts * 100.0 / NULLIF(ts.total_parts, 0), 2) as completion_percentage
            FROM teacher_students_view ts
            WHERE ts.teacher_id = ?
        `;

        const params = [teacherId];

        // Apply filters
        if (filters.module_id) {
            query += ' AND ts.module_id = ?';
            params.push(filters.module_id);
        }

        if (filters.class_section) {
            query += ' AND ts.class_section = ?';
            params.push(filters.class_section);
        }

        if (filters.status) {
            if (filters.status === 'active') {
                query += ' AND ts.last_activity_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            } else if (filters.status === 'inactive') {
                query += ' AND (ts.last_activity_date IS NULL OR ts.last_activity_date < DATE_SUB(NOW(), INTERVAL 7 DAY))';
            }
        }

        if (filters.search) {
            query += ' AND (ts.full_name LIKE ? OR ts.username LIKE ? OR ts.roll_number LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Sorting
        const sortField = filters.sort_by || 'ts.full_name';
        const sortOrder = filters.sort_order === 'desc' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;

        // Pagination
        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
        }

        if (filters.offset) {
            query += ' OFFSET ?';
            params.push(parseInt(filters.offset));
        }

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get class performance metrics
    static async getClassPerformance(teacherId, filters = {}) {
        let query = `
            SELECT 
                cp.*,
                m.module_name,
                m.grade_level
            FROM class_performance_view cp
            JOIN modules m ON cp.module_id = m.module_id
            WHERE cp.teacher_id = ?
        `;

        const params = [teacherId];

        // Apply date filters
        if (filters.start_date) {
            query += ' AND cp.activity_date >= ?';
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            query += ' AND cp.activity_date <= ?';
            params.push(filters.end_date);
        }

        if (filters.module_id) {
            query += ' AND cp.module_id = ?';
            params.push(filters.module_id);
        }

        if (filters.class_section) {
            query += ' AND cp.class_section = ?';
            params.push(filters.class_section);
        }

        query += ' ORDER BY cp.activity_date DESC';

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get detailed student performance
    static async getStudentPerformance(teacherId, studentId, moduleId = null) {
        let query = `
            SELECT 
                ts.*,
                m.module_name,
                m.grade_level,
                tc.class_section,
                (
                    SELECT COUNT(*)
                    FROM assignment_results ar
                    JOIN assignments a ON ar.assignment_id = a.assignment_id
                    JOIN learning_parts lp ON a.part_id = lp.part_id
                    JOIN units un ON lp.unit_id = un.unit_id
                    WHERE ar.student_id = ts.student_id 
                        AND un.module_id = ts.module_id
                ) as total_assignments,
                (
                    SELECT COUNT(*)
                    FROM assignment_results ar
                    JOIN assignments a ON ar.assignment_id = a.assignment_id
                    JOIN learning_parts lp ON a.part_id = lp.part_id
                    JOIN units un ON lp.unit_id = un.unit_id
                    WHERE ar.student_id = ts.student_id 
                        AND un.module_id = ts.module_id
                        AND ar.passed = TRUE
                ) as passed_assignments
            FROM teacher_students_view ts
            JOIN modules m ON ts.module_id = m.module_id
            JOIN teacher_classes tc ON ts.assignment_id = tc.assignment_id
            WHERE ts.teacher_id = ? AND ts.student_id = ?
        `;

        const params = [teacherId, studentId];

        if (moduleId) {
            query += ' AND ts.module_id = ?';
            params.push(moduleId);
        }

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get assignment performance for class
    static async getAssignmentPerformance(teacherId, filters = {}) {
        let query = `
            SELECT 
                ap.*,
                m.module_name,
                m.grade_level
            FROM assignment_performance_view ap
            JOIN modules m ON ap.module_id = m.module_id
            WHERE ap.teacher_id = ?
        `;

        const params = [teacherId];

        if (filters.module_id) {
            query += ' AND ap.module_id = ?';
            params.push(filters.module_id);
        }

        if (filters.class_section) {
            query += ' AND ap.class_section = ?';
            params.push(filters.class_section);
        }

        query += ' ORDER BY ap.assignment_title';

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get performance distribution for charts
    static async getPerformanceDistribution(teacherId, filters = {}) {
        let query = `
            SELECT 
                CASE 
                    WHEN completion_percentage >= 90 THEN '90-100%'
                    WHEN completion_percentage >= 80 THEN '80-89%'
                    WHEN completion_percentage >= 70 THEN '70-79%'
                    WHEN completion_percentage >= 60 THEN '60-69%'
                    WHEN completion_percentage >= 50 THEN '50-59%'
                    ELSE 'Below 50%'
                END as score_range,
                COUNT(*) as student_count,
                AVG(avg_score) as avg_score_in_range,
                AVG(total_study_time_minutes) as avg_study_time
            FROM (
                SELECT 
                    ts.student_id,
                    ROUND(ts.completed_parts * 100.0 / NULLIF(ts.total_parts, 0), 2) as completion_percentage,
                    ts.avg_score,
                    ts.total_study_time_minutes
                FROM teacher_students_view ts
                WHERE ts.teacher_id = ?
        `;

        const params = [teacherId];

        if (filters.module_id) {
            query += ' AND ts.module_id = ?';
            params.push(filters.module_id);
        }

        if (filters.class_section) {
            query += ' AND ts.class_section = ?';
            params.push(filters.class_section);
        }

        query += ` ) as subquery
            GROUP BY 
                CASE 
                    WHEN completion_percentage >= 90 THEN '90-100%'
                    WHEN completion_percentage >= 80 THEN '80-89%'
                    WHEN completion_percentage >= 70 THEN '70-79%'
                    WHEN completion_percentage >= 60 THEN '60-69%'
                    WHEN completion_percentage >= 50 THEN '50-59%'
                    ELSE 'Below 50%'
                END
            ORDER BY 
                CASE 
                    WHEN score_range = '90-100%' THEN 1
                    WHEN score_range = '80-89%' THEN 2
                    WHEN score_range = '70-79%' THEN 3
                    WHEN score_range = '60-69%' THEN 4
                    WHEN score_range = '50-59%' THEN 5
                    ELSE 6
                END`;

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get activity trends
    static async getActivityTrends(teacherId, days = 30) {
        const query = `
            SELECT 
                DATE(sp.completed_at) as activity_date,
                COUNT(DISTINCT sp.student_id) as active_students,
                COUNT(*) as completed_items,
                AVG(sp.score) as avg_score,
                SUM(sp.time_spent_seconds) / 60 as total_study_time
            FROM teacher_classes tc
            JOIN modules m ON tc.module_id = m.module_id
            JOIN units un ON m.module_id = un.module_id
            JOIN learning_parts lp ON un.unit_id = lp.unit_id
            JOIN student_progress sp ON lp.part_id = sp.part_id
            WHERE tc.teacher_id = ? 
                AND sp.status = 'completed'
                AND sp.completed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(sp.completed_at)
            ORDER BY activity_date
        `;

        const rows = await db.execute(query, [teacherId, days]);
        return rows;
    }

    // Get class comparison data
    static async getClassComparison(teacherId) {
        const query = `
            SELECT 
                CONCAT(m.module_name, ' - ', tc.class_section) as class_name,
                COUNT(DISTINCT ts.student_id) as student_count,
                AVG(ts.avg_score) as avg_score,
                ROUND(AVG(ts.completed_parts * 100.0 / NULLIF(ts.total_parts, 0)), 2) as completion_rate,
                AVG(ts.total_study_time_minutes) as avg_study_time,
                MAX(ts.last_activity_date) as last_activity
            FROM teacher_classes tc
            JOIN modules m ON tc.module_id = m.module_id
            LEFT JOIN teacher_students_view ts ON tc.assignment_id = ts.assignment_id
            WHERE tc.teacher_id = ? AND tc.is_active = TRUE
            GROUP BY tc.assignment_id, m.module_name, tc.class_section
            ORDER BY m.module_name, tc.class_section
        `;

        const rows = await db.execute(query, [teacherId]);
        return rows;
    }

    // Get student progress over time
    static async getStudentProgressTrend(studentId, moduleId, days = 30) {
        const query = `
            SELECT 
                DATE(sp.completed_at) as date,
                COUNT(*) as daily_completed,
                AVG(sp.score) as daily_avg_score,
                SUM(sp.time_spent_seconds) / 60 as daily_study_time
            FROM student_progress sp
            JOIN learning_parts lp ON sp.part_id = lp.part_id
            JOIN units un ON lp.unit_id = un.unit_id
            WHERE sp.student_id = ? 
                AND un.module_id = ?
                AND sp.status = 'completed'
                AND sp.completed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(sp.completed_at)
            ORDER BY date
        `;

        const rows = await db.execute(query, [studentId, moduleId, days]);
        return rows;
    }

    // Get top performers
    static async getTopPerformers(teacherId, limit = 10, filters = {}) {
        let query = `
            SELECT 
                ts.student_id,
                ts.full_name,
                ts.class_grade,
                ts.roll_number,
                ts.avg_score,
                ts.completed_parts,
                ts.total_parts,
                ROUND(ts.completed_parts * 100.0 / NULLIF(ts.total_parts, 0), 2) as completion_rate,
                ts.total_study_time_minutes,
                ts.last_activity_date,
                m.module_name,
                tc.class_section
            FROM teacher_students_view ts
            JOIN modules m ON ts.module_id = m.module_id
            JOIN teacher_classes tc ON ts.assignment_id = tc.assignment_id
            WHERE ts.teacher_id = ? AND ts.avg_score IS NOT NULL
        `;

        const params = [teacherId];

        if (filters.module_id) {
            query += ' AND ts.module_id = ?';
            params.push(filters.module_id);
        }

        if (filters.class_section) {
            query += ' AND ts.class_section = ?';
            params.push(filters.class_section);
        }

        query += ' ORDER BY ts.avg_score DESC LIMIT ?';
        params.push(limit);

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get students needing attention
    static async getStudentsNeedingAttention(teacherId, limit = 10, filters = {}) {
        let query = `
            SELECT 
                ts.student_id,
                ts.full_name,
                ts.class_grade,
                ts.roll_number,
                ts.avg_score,
                ts.completed_parts,
                ts.total_parts,
                ROUND(ts.completed_parts * 100.0 / NULLIF(ts.total_parts, 0), 2) as completion_rate,
                ts.total_study_time_minutes,
                ts.last_activity_date,
                DATEDIFF(CURDATE(), ts.last_activity_date) as days_inactive,
                m.module_name,
                tc.class_section
            FROM teacher_students_view ts
            JOIN modules m ON ts.module_id = m.module_id
            JOIN teacher_classes tc ON ts.assignment_id = tc.assignment_id
            WHERE ts.teacher_id = ? 
                AND (ts.avg_score IS NULL OR ts.avg_score < 60)
        `;

        const params = [teacherId];

        if (filters.module_id) {
            query += ' AND ts.module_id = ?';
            params.push(filters.module_id);
        }

        if (filters.class_section) {
            query += ' AND ts.class_section = ?';
            params.push(filters.class_section);
        }

        query += ' ORDER BY ts.avg_score ASC, days_inactive DESC LIMIT ?';
        params.push(limit);

        const rows = await db.execute(query, params);
        return rows;
    }
}

module.exports = TeacherModel;