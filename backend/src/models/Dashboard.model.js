const db = require('../config/mysql');

class DashboardModel {
    // Get overall dashboard statistics
    static async getDashboardStats(studentId) {
        // Call the stored procedure
        const results = await db.query('CALL get_student_dashboard_stats(?)', [studentId]);

        return {
            overall_stats: results[0][0] || {},
            recent_activity: results[1] || [],
            module_progress: results[2] || [],
            assignment_performance: results[3] || []
        };
    }

    // Get upcoming assignments
    static async getUpcomingAssignments(studentId, limit = 5) {
        const query = `
            SELECT 
                uav.*,
                CASE 
                    WHEN uav.status = 'available' AND uav.attempts_used < uav.max_attempts 
                    THEN TRUE 
                    ELSE FALSE 
                    END as can_attempt
            FROM upcoming_assignments_view uav
            WHERE uav.user_id = ? 
                AND uav.status IN ('available', 'not_started')
            ORDER BY 
                CASE WHEN uav.start_date IS NOT NULL THEN uav.start_date ELSE '9999-12-31' END,
                uav.end_date
            LIMIT ?
        `;

        const rows = await db.query(query, [studentId, limit]);
        return rows;
    }

    // Get grades overview
    static async getGradesOverview(studentId) {
        const query = `
            SELECT 
                m.module_name,
                m.grade_level,
                COUNT(DISTINCT a.assignment_id) as total_assignments,
                COUNT(DISTINCT CASE WHEN ar.passed = TRUE THEN a.assignment_id END) as passed_assignments,
                AVG(ar.best_percentage) as avg_percentage,
                MAX(ar.best_percentage) as highest_percentage,
                MIN(ar.best_percentage) as lowest_percentage,
                SUM(CASE WHEN ar.passed = TRUE THEN 1 ELSE 0 END) as pass_count
            FROM modules m
            JOIN units un ON m.module_id = un.module_id
            JOIN learning_parts lp ON un.unit_id = lp.unit_id
            JOIN assignments a ON lp.part_id = a.part_id
            LEFT JOIN assignment_results ar ON a.assignment_id = ar.assignment_id AND ar.student_id = ?
            WHERE m.is_published = TRUE
            GROUP BY m.module_id
            ORDER BY m.module_name
        `;

        const rows = await db.execute(query, [studentId]);
        return rows;
    }

    // Get performance history for charts
    static async getPerformanceHistory(studentId, days = 30) {
        const query = `
            SELECT 
                ph.date,
                SUM(ph.completed_parts) as daily_completed,
                AVG(ph.avg_score) as daily_avg_score,
                SUM(ph.total_time_spent_minutes) as daily_study_time
            FROM performance_history ph
            WHERE ph.student_id = ? 
                AND ph.date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY ph.date
            ORDER BY ph.date
        `;

        const rows = await db.execute(query, [studentId, days]);
        return rows;
    }

    // Get module-wise progress for charts
    static async getModuleProgress(studentId) {
        const query = `
            SELECT 
                m.module_name,
                COUNT(DISTINCT lp.part_id) as total_parts,
                COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) as completed_parts,
                ROUND((COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) / 
                       COUNT(DISTINCT lp.part_id)) * 100, 2) as progress_percentage,
                AVG(CASE WHEN sp.status = 'completed' THEN sp.score ELSE NULL END) as avg_score
            FROM modules m
            JOIN units un ON m.module_id = un.module_id
            JOIN learning_parts lp ON un.unit_id = lp.unit_id
            LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = ?
            WHERE m.is_published = TRUE
            GROUP BY m.module_id
            HAVING total_parts > 0
            ORDER BY progress_percentage DESC, m.module_name
        `;

        const rows = await db.execute(query, [studentId]);
        return rows;
    }

    // Get activity streak
    static async getActivityStreak(studentId) {
        const query = `
            WITH activity_days AS (
                SELECT DISTINCT DATE(completed_at) as activity_date
                FROM student_progress
                WHERE student_id = ? 
                    AND completed_at IS NOT NULL
                    AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
                UNION
                SELECT DISTINCT DATE(submitted_at) as activity_date
                FROM submissions
                WHERE student_id = ? 
                    AND submitted_at IS NOT NULL
                    AND submitted_at >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
            ),
            streaks AS (
                SELECT 
                    activity_date,
                    @streak := IF(DATEDIFF(activity_date, @prev_date) = 1, @streak + 1, 1) as streak,
                    @prev_date := activity_date
                FROM activity_days, 
                    (SELECT @streak := 0, @prev_date := NULL) vars
                ORDER BY activity_date DESC
            )
            SELECT MAX(streak) as current_streak
            FROM streaks
        `;

        const rows = await db.execute(query, [studentId, studentId]);
        return rows[0]?.current_streak || 0;
    }

    // Get study time statistics
    static async getStudyTimeStats(studentId) {
        const query = `
            SELECT 
                DATE(completed_at) as study_date,
                SUM(time_spent_seconds) / 60 as total_minutes,
                COUNT(*) as completed_items
            FROM student_progress
            WHERE student_id = ? 
                AND completed_at IS NOT NULL
                AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(completed_at)
            ORDER BY study_date
        `;

        const rows = await db.execute(query, [studentId]);
        return rows;
    }

    // Get leaderboard position (if implementing)
    static async getLeaderboardStats(studentId) {
        const query = `
            WITH student_rankings AS (
                SELECT 
                    u.user_id,
                    u.full_name,
                    u.class_grade,
                    COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) as completed_parts,
                    AVG(CASE WHEN sp.status = 'completed' THEN sp.score ELSE NULL END) as avg_score,
                    COUNT(DISTINCT CASE WHEN ar.passed = TRUE THEN a.assignment_id END) as passed_assignments,
                    ROW_NUMBER() OVER (ORDER BY 
                        COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) DESC,
                        AVG(CASE WHEN sp.status = 'completed' THEN sp.score ELSE NULL END) DESC
                    ) as rank_position
                FROM users u
                JOIN modules m ON u.school_id = m.school_id
                JOIN units un ON m.module_id = un.module_id
                JOIN learning_parts lp ON un.unit_id = lp.unit_id
                LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = u.user_id
                LEFT JOIN assignments a ON lp.part_id = a.part_id
                LEFT JOIN assignment_results ar ON a.assignment_id = ar.assignment_id AND ar.student_id = u.user_id
                WHERE u.role = 'student' 
                    AND u.user_id = ?
                GROUP BY u.user_id
            )
            SELECT * FROM student_rankings
        `;

        const rows = await db.execute(query, [studentId]);
        return rows[0] || null;
    }

    // Get recent notifications/announcements
    static async getRecentNotifications(studentId) {
        const query = `
            SELECT 
                'assignment_due' as type,
                a.title,
                CONCAT('Assignment "', a.title, '" is due soon') as message,
                a.end_date as relevant_date
            FROM assignments a
            JOIN learning_parts lp ON a.part_id = lp.part_id
            JOIN units un ON lp.unit_id = un.unit_id
            JOIN modules m ON un.module_id = m.module_id
            WHERE a.is_active = TRUE 
                AND a.end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
                AND m.school_id = (SELECT school_id FROM users WHERE user_id = ?)
            UNION
            SELECT 
                'new_content' as type,
                m.module_name,
                CONCAT('New content added to ', m.module_name) as message,
                m.updated_at as relevant_date
            FROM modules m
            WHERE m.is_published = TRUE 
                AND m.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND m.school_id = (SELECT school_id FROM users WHERE user_id = ?)
            ORDER BY relevant_date DESC
            LIMIT 5
        `;

        const rows = await db.execute(query, [studentId, studentId]);
        return rows;
    }

    // Get notifications for teacher (Assignment Due, New Submissions)
    static async getTeacherNotifications(teacherId) {
        const query = `
            /* Assignments due in next 3 days */
            SELECT 
                'assignment_due' as type,
                a.title,
                CONCAT('Assignment "', a.title, '" is due in ', DATEDIFF(a.end_date, NOW()), ' days') as message,
                a.end_date as relevant_date
            FROM assignments a
            JOIN learning_parts lp ON a.part_id = lp.part_id
            JOIN units un ON lp.unit_id = un.unit_id
            JOIN modules m ON un.module_id = m.module_id
            JOIN teacher_classes tc ON m.module_id = tc.module_id
            WHERE tc.teacher_id = ?
                AND a.is_active = TRUE
                AND a.end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
            
            UNION
            
            /* New submissions in last 24 hours */
            SELECT 
                'new_submission' as type,
                a.title,
                CONCAT('New submission for "', a.title, '"') as message,
                s.submitted_at as relevant_date
            FROM submissions s
            JOIN assignments a ON s.assignment_id = a.assignment_id
            JOIN learning_parts lp ON a.part_id = lp.part_id
            JOIN units un ON lp.unit_id = un.unit_id
            JOIN modules m ON un.module_id = m.module_id
            JOIN teacher_classes tc ON m.module_id = tc.module_id
            WHERE tc.teacher_id = ?
                AND s.submitted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            
            ORDER BY relevant_date DESC
            LIMIT 10
        `;

        const rows = await db.execute(query, [teacherId, teacherId]);
        return rows;
    }
}

module.exports = DashboardModel;