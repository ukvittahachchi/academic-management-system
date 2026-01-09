const db = require('../config/mysql');

class AnalyticsModel {
    // Get comprehensive student analytics
    static async getStudentAnalytics(studentId, moduleId = null) {
        const query = 'CALL get_comprehensive_student_analytics(?, ?)';
        const results = await db.execute(query, [studentId, moduleId]);
        return {
            overall_summary: results[0][0] || {},
            weekly_trends: results[1] || [],
            assignment_performance: results[2] || [],
            time_spent_analysis: results[3] || [],
            weak_areas: results[4] || [],
            learning_patterns: results[5] || [],
            content_type_performance: results[6] || [],
            class_comparison: results[7] || []
        };
    }

    // Get individual student progress
    static async getStudentProgress(studentId, filters = {}) {
        let query = `
            SELECT 
                sp.*,
                lp.title as content_title,
                lp.part_type,
                u.unit_name,
                m.module_name,
                m.grade_level
            FROM student_progress sp
            JOIN learning_parts lp ON sp.part_id = lp.part_id
            JOIN units u ON lp.unit_id = u.unit_id
            JOIN modules m ON u.module_id = m.module_id
            WHERE sp.student_id = ?
        `;

        const params = [studentId];

        if (filters.module_id) {
            query += ' AND m.module_id = ?';
            params.push(filters.module_id);
        }

        if (filters.status) {
            query += ' AND sp.status = ?';
            params.push(filters.status);
        }

        if (filters.start_date) {
            query += ' AND sp.completed_at >= ?';
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            query += ' AND sp.completed_at <= ?';
            params.push(filters.end_date);
        }

        if (filters.content_type) {
            query += ' AND lp.part_type = ?';
            params.push(filters.content_type);
        }

        query += ' ORDER BY sp.completed_at DESC';

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get assignment performance analysis
    static async getAssignmentPerformanceAnalysis(studentId, filters = {}) {
        let query = `
            SELECT 
                apa.*,
                CASE 
                    WHEN apa.percentage >= 80 THEN 'excellent'
                    WHEN apa.percentage >= 60 THEN 'good'
                    WHEN apa.percentage >= 40 THEN 'average'
                    ELSE 'needs_improvement'
                END as performance_category
            FROM assignment_performance_analysis_view apa
            WHERE apa.student_id = ?
        `;

        const params = [studentId];

        if (filters.module_id) {
            query += ' AND apa.module_id = ?';
            params.push(filters.module_id);
        }

        if (filters.start_date) {
            query += ' AND apa.submitted_at >= ?';
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            query += ' AND apa.submitted_at <= ?';
            params.push(filters.end_date);
        }

        if (filters.result_status) {
            query += ' AND apa.result_status = ?';
            params.push(filters.result_status);
        }

        query += ' ORDER BY apa.submitted_at DESC';

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get time spent analysis
    static async getTimeSpentAnalysis(studentId, filters = {}) {
        let query = `
            SELECT 
                tsa.*,
                SUM(tsa.total_minutes) OVER (PARTITION BY tsa.session_date) as daily_total_minutes,
                AVG(tsa.total_minutes) OVER (PARTITION BY tsa.student_id) as avg_daily_minutes
            FROM time_spent_analysis_view tsa
            WHERE tsa.student_id = ?
        `;

        const params = [studentId];

        if (filters.start_date) {
            query += ' AND tsa.session_date >= ?';
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            query += ' AND tsa.session_date <= ?';
            params.push(filters.end_date);
        }

        if (filters.session_type) {
            query += ' AND tsa.session_type = ?';
            params.push(filters.session_type);
        }

        query += ' ORDER BY tsa.session_date DESC, tsa.hour_of_day';

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get weak areas identification
    static async getWeakAreas(studentId, filters = {}) {
        let query = `
            SELECT 
                wa.*,
                m.module_name,
                u.unit_name,
                lp.title as content_title,
                DATEDIFF(CURDATE(), wa.last_occurrence) as days_since_last_occurrence
            FROM student_weak_areas wa
            LEFT JOIN modules m ON wa.module_id = m.module_id
            LEFT JOIN units u ON wa.unit_id = u.unit_id
            LEFT JOIN learning_parts lp ON wa.learning_part_id = lp.part_id
            WHERE wa.student_id = ?
        `;

        const params = [studentId];

        if (filters.module_id) {
            query += ' AND wa.module_id = ?';
            params.push(filters.module_id);
        }

        if (filters.area_type) {
            query += ' AND wa.area_type = ?';
            params.push(filters.area_type);
        }

        if (filters.improvement_status) {
            query += ' AND wa.improvement_status = ?';
            params.push(filters.improvement_status);
        }

        if (filters.min_difficulty) {
            query += ' AND wa.difficulty_score >= ?';
            params.push(filters.min_difficulty);
        }

        query += ' ORDER BY wa.difficulty_score DESC, wa.occurrences DESC';

        const rows = await db.execute(query, params);
        return rows;
    }

    // Add new weak area
    static async addWeakArea(data) {
        const {
            student_id,
            module_id,
            unit_id,
            learning_part_id,
            area_type,
            area_name,
            difficulty_score,
            notes
        } = data;

        // Check if weak area already exists
        const checkQuery = `
            SELECT * FROM student_weak_areas 
            WHERE student_id = ? 
                AND area_name = ? 
                AND area_type = ?
                AND improvement_status != 'resolved'
        `;

        const existing = await db.execute(checkQuery, [student_id, area_name, area_type]);

        if (existing.length > 0) {
            // Update existing weak area
            const updateQuery = `
                UPDATE student_weak_areas 
                SET 
                    occurrences = occurrences + 1,
                    last_occurrence = NOW(),
                    difficulty_score = GREATEST(difficulty_score, ?),
                    notes = CONCAT(notes, '\n', ?)
                WHERE weak_area_id = ?
            `;
            await db.execute(updateQuery, [difficulty_score, notes, existing[0].weak_area_id]);
            return existing[0].weak_area_id;
        } else {
            // Insert new weak area
            const insertQuery = `
                INSERT INTO student_weak_areas (
                    student_id, module_id, unit_id, learning_part_id,
                    area_type, area_name, difficulty_score, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await db.execute(insertQuery, [
                student_id, module_id, unit_id, learning_part_id,
                area_type, area_name, difficulty_score, notes
            ]);

            return result.insertId;
        }
    }

    // Update weak area status
    static async updateWeakAreaStatus(weakAreaId, status, notes = '') {
        const query = `
            UPDATE student_weak_areas 
            SET 
                improvement_status = ?,
                notes = CONCAT(notes, '\nStatus updated to: ', ?),
                last_occurrence = NOW()
            WHERE weak_area_id = ?
        `;

        await db.execute(query, [status, status, weakAreaId]);
    }

    // Get learning patterns
    static async getLearningPatterns(studentId, moduleId = null) {
        let query = `
            SELECT 
                mlp.*,
                m.module_name
            FROM module_learning_patterns mlp
            JOIN modules m ON mlp.module_id = m.module_id
            WHERE mlp.student_id = ?
        `;

        const params = [studentId];

        if (moduleId) {
            query += ' AND mlp.module_id = ?';
            params.push(moduleId);
        }

        const rows = await db.execute(query, params);
        return rows;
    }

    // Track study session
    static async trackStudySession(data) {
        const {
            student_id,
            learning_part_id,
            start_time,
            end_time,
            session_type,
            focus_score,
            distractions_noted
        } = data;

        const duration_seconds = Math.round((new Date(end_time) - new Date(start_time)) / 1000);

        const query = `
            INSERT INTO student_time_tracking (
                student_id, learning_part_id, start_time, end_time,
                duration_seconds, session_type, focus_score, distractions_noted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.execute(query, [
            student_id, learning_part_id, start_time, end_time,
            duration_seconds, session_type, focus_score, distractions_noted
        ]);

        return result.insertId;
    }

    // Get study habits summary
    static async getStudyHabitsSummary(studentId, days = 30) {
        const query = `
            SELECT 
                DAYNAME(start_time) as day_of_week,
                HOUR(start_time) as hour_of_day,
                AVG(duration_seconds) / 60 as avg_session_minutes,
                COUNT(*) as session_count,
                AVG(focus_score) as avg_focus_score,
                session_type,
                GROUP_CONCAT(DISTINCT lp.part_type) as content_types
            FROM student_time_tracking st
            JOIN learning_parts lp ON st.learning_part_id = lp.part_id
            WHERE st.student_id = ? 
                AND st.start_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                AND st.end_time IS NOT NULL
            GROUP BY DAYNAME(start_time), HOUR(start_time), session_type
            ORDER BY 
                FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
                hour_of_day
        `;

        const rows = await db.execute(query, [studentId, days]);
        return rows;
    }

    // Get performance trends over time
    static async getPerformanceTrends(studentId, moduleId = null, weeks = 12) {
        let query = `
            SELECT 
                DATE_FORMAT(DATE_SUB(sp.completed_at, INTERVAL WEEKDAY(sp.completed_at) DAY), '%Y-%m-%d') as week_start,
                COUNT(DISTINCT sp.part_id) as items_completed,
                AVG(sp.score) as avg_score,
                SUM(sp.time_spent_seconds) / 60 as study_minutes,
                COUNT(DISTINCT DATE(sp.completed_at)) as active_days,
                GROUP_CONCAT(DISTINCT lp.part_type) as content_types_covered
            FROM student_progress sp
            JOIN learning_parts lp ON sp.part_id = lp.part_id
            JOIN units un ON lp.unit_id = un.unit_id
            WHERE sp.student_id = ? 
                AND sp.status = 'completed'
                AND sp.completed_at >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
        `;

        const params = [studentId, weeks];

        if (moduleId) {
            query += ' AND un.module_id = ?';
            params.push(moduleId);
        }

        query += ' GROUP BY week_start ORDER BY week_start';

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get content type performance
    static async getContentTypePerformance(studentId, moduleId = null) {
        let query = `
            SELECT 
                lp.part_type,
                COUNT(*) as completed_count,
                AVG(sp.score) as avg_score,
                AVG(sp.time_spent_seconds) / 60 as avg_time_minutes,
                MIN(sp.score) as min_score,
                MAX(sp.score) as max_score,
                STD(sp.score) as score_std_dev,
                COUNT(DISTINCT lp.part_id) * 100.0 / (
                    SELECT COUNT(*) 
                    FROM learning_parts lp2
                    JOIN units un2 ON lp2.unit_id = un2.unit_id
                    WHERE un2.module_id = un.module_id
                ) as coverage_percentage
            FROM student_progress sp
            JOIN learning_parts lp ON sp.part_id = lp.part_id
            JOIN units un ON lp.unit_id = un.unit_id
            WHERE sp.student_id = ? 
                AND sp.status = 'completed'
        `;

        const params = [studentId];

        if (moduleId) {
            query += ' AND un.module_id = ?';
            params.push(moduleId);
        }

        query += ' GROUP BY lp.part_type ORDER BY avg_score DESC';

        const rows = await db.execute(query, params);
        return rows;
    }

    // Get improvement recommendations
    static async getImprovementRecommendations(studentId) {
        // Analyze weak areas and performance to generate recommendations
        const weakAreas = await this.getWeakAreas(studentId, { improvement_status: 'identified' });
        const performance = await this.getContentTypePerformance(studentId);
        const studyHabits = await this.getStudyHabitsSummary(studentId);

        const recommendations = [];

        // Recommendations based on weak areas
        weakAreas.forEach(area => {
            if (area.difficulty_score >= 4) {
                recommendations.push({
                    type: 'weak_area',
                    priority: 'high',
                    title: `Focus on ${area.area_name}`,
                    description: `You're struggling with ${area.area_name}. Consider reviewing related materials.`,
                    action: 'Review content and practice related exercises',
                    estimated_time: '30-45 minutes',
                    resources: ['Related readings', 'Practice questions', 'Video tutorials']
                });
            }
        });

        // Recommendations based on study habits
        const avgFocus = studyHabits.reduce((sum, habit) => sum + habit.avg_focus_score, 0) / studyHabits.length;
        if (avgFocus < 3) {
            recommendations.push({
                type: 'study_habit',
                priority: 'medium',
                title: 'Improve Focus During Study Sessions',
                description: 'Your average focus score is below optimal. Try breaking study sessions into shorter intervals.',
                action: 'Use Pomodoro technique (25 min study, 5 min break)',
                estimated_time: 'Session planning',
                resources: ['Focus timer app', 'Study environment tips']
            });
        }

        // Recommendations based on performance patterns
        performance.forEach(content => {
            if (content.avg_score < 60 && content.completed_count > 2) {
                recommendations.push({
                    type: 'content_performance',
                    priority: 'medium',
                    title: `Improve ${content.part_type} Performance`,
                    description: `Your average score for ${content.part_type} content is lower than expected.`,
                    action: `Review ${content.part_type} materials and attempt related exercises`,
                    estimated_time: '45-60 minutes',
                    resources: [`${content.part_type} specific resources`, 'Practice tests']
                });
            }
        });

        return recommendations;
    }

    // Get student analytics summary
    static async getAnalyticsSummary(studentId) {
        const query = `
            SELECT 
                COUNT(DISTINCT m.module_id) as total_modules,
                COUNT(DISTINCT sp.part_id) as total_learning_items,
                COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) as completed_items,
                AVG(CASE WHEN sp.status = 'completed' THEN sp.score END) as overall_avg_score,
                SUM(sp.time_spent_seconds) / 60 as total_study_minutes,
                COUNT(DISTINCT s.submission_id) as total_assignments,
                COUNT(DISTINCT CASE WHEN s.percentage >= a.passing_marks THEN s.submission_id END) as passed_assignments,
                COUNT(DISTINCT wa.weak_area_id) as identified_weak_areas,
                COUNT(DISTINCT DATE(sp.completed_at)) as total_active_days,
                DATEDIFF(CURDATE(), MIN(sp.started_at)) as days_since_started
            FROM users u
            LEFT JOIN modules m ON u.school_id = m.school_id
            LEFT JOIN units un ON m.module_id = un.module_id
            LEFT JOIN learning_parts lp ON un.unit_id = lp.unit_id
            LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = u.user_id
            LEFT JOIN assignments a ON lp.part_id = a.part_id
            LEFT JOIN submissions s ON a.assignment_id = s.assignment_id AND s.student_id = u.user_id
            LEFT JOIN student_weak_areas wa ON u.user_id = wa.student_id AND wa.improvement_status != 'resolved'
            WHERE u.user_id = ?
            GROUP BY u.user_id
        `;

        const rows = await db.execute(query, [studentId]);
        return rows[0] || {};
    }
}

module.exports = AnalyticsModel;