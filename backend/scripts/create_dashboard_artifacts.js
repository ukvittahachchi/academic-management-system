const db = require('../src/config/mysql');

async function runMigration() {
    console.log('Starting migration...');

    try {
        console.log('Creating upcoming_assignments_view...');
        await db.rawQuery(`
            CREATE OR REPLACE VIEW upcoming_assignments_view AS
            SELECT 
                a.assignment_id,
                a.title,
                a.description,
                a.total_marks,
                a.passing_marks,
                a.max_attempts,
                a.start_date,
                a.end_date,
                a.is_active,
                m.module_name,
                m.module_id,
                u.user_id,
                COALESCE(ar_aggr.attempts_used, 0) as attempts_used,
                CASE 
                    WHEN ar_aggr.passed > 0 THEN 'completed'
                    WHEN NOW() > a.end_date THEN 'expired'
                    WHEN COALESCE(ar_aggr.attempts_used, 0) >= a.max_attempts THEN 'attempts_exhausted'
                    ELSE 'available'
                END as status
            FROM users u
            JOIN modules m ON u.school_id = m.school_id
            JOIN units un ON m.module_id = un.module_id
            JOIN learning_parts lp ON un.unit_id = lp.unit_id
            JOIN assignments a ON lp.part_id = a.part_id
            LEFT JOIN (
                SELECT assignment_id, student_id, COUNT(*) as attempts_used, MAX(CASE WHEN passed THEN 1 ELSE 0 END) as passed
                FROM assignment_results
                GROUP BY assignment_id, student_id
            ) ar_aggr ON a.assignment_id = ar_aggr.assignment_id AND u.user_id = ar_aggr.student_id
            WHERE u.role = 'student' AND m.is_published = TRUE;
        `);

        console.log('Creating performance_history view...');
        await db.rawQuery(`
            CREATE OR REPLACE VIEW performance_history AS
            SELECT 
                student_id,
                DATE(completed_at) as date,
                COUNT(*) as completed_parts,
                0 as avg_score,
                SUM(time_spent_seconds) / 60 as total_time_spent_minutes
            FROM student_progress
            WHERE status = 'completed' AND completed_at IS NOT NULL
            GROUP BY student_id, DATE(completed_at);
        `);

        console.log('Creating get_student_dashboard_stats procedure...');
        await db.rawQuery('DROP PROCEDURE IF EXISTS get_student_dashboard_stats');
        await db.rawQuery(`
            CREATE PROCEDURE get_student_dashboard_stats(IN p_student_id INT)
            BEGIN
                -- 1. Overall Stats
                SELECT 
                    COUNT(DISTINCT m.module_id) as total_modules,
                    COUNT(DISTINCT lp.part_id) as total_learning_parts,
                    COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) as completed_parts,
                    COALESCE(ROUND((COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) / NULLIF(COUNT(DISTINCT lp.part_id), 0)) * 100, 2), 0) as completion_percentage,
                    0 as avg_score,
                    COUNT(DISTINCT a.assignment_id) as total_assignments,
                    COUNT(DISTINCT CASE WHEN ar.passed = TRUE THEN a.assignment_id END) as passed_assignments
                FROM users u
                JOIN modules m ON u.school_id = m.school_id
                JOIN units un ON m.module_id = un.module_id
                JOIN learning_parts lp ON un.unit_id = lp.unit_id
                LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = u.user_id
                LEFT JOIN assignments a ON lp.part_id = a.part_id
                LEFT JOIN assignment_results ar ON a.assignment_id = ar.assignment_id AND ar.student_id = u.user_id
                WHERE u.user_id = p_student_id AND m.is_published = TRUE;

                -- 2. Recent Activity
                SELECT 
                    'completed' as type,
                    m.module_name,
                    lp.title as content_title,
                    sp.status,
                    NULL as score,
                    sp.completed_at,
                    sp.time_spent_seconds / 60 as time_taken_minutes
                FROM student_progress sp
                JOIN learning_parts lp ON sp.part_id = lp.part_id
                JOIN units un ON lp.unit_id = un.unit_id
                JOIN modules m ON un.module_id = m.module_id
                WHERE sp.student_id = p_student_id AND sp.status = 'completed'
                ORDER BY sp.completed_at DESC
                LIMIT 5;

                -- 3. Module Progress
                SELECT 
                    m.module_name,
                    COUNT(DISTINCT lp.part_id) as total_parts,
                    COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) as completed_parts,
                    COALESCE(ROUND((COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.part_id END) / NULLIF(COUNT(DISTINCT lp.part_id), 0)) * 100, 2), 0) as progress_percentage,
                    0 as avg_score
                FROM modules m
                JOIN units un ON m.module_id = un.module_id
                JOIN learning_parts lp ON un.unit_id = lp.unit_id
                LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = p_student_id
                WHERE m.school_id = (SELECT school_id FROM users WHERE user_id = p_student_id) AND m.is_published = TRUE
                GROUP BY m.module_id, m.module_name
                ORDER BY m.module_name;

                -- 4. Assignment Performance
                SELECT 
                    a.title,
                    a.total_marks,
                    a.max_attempts,
                    m.module_name,
                    ar_stats.best_score,
                    ar_stats.best_percentage,
                    ar_stats.attempts_used,
                    CASE WHEN ar_stats.passed > 0 THEN TRUE ELSE FALSE END as passed,
                    ar_stats.last_attempt_at
                FROM assignments a
                JOIN learning_parts lp ON a.part_id = lp.part_id
                JOIN units un ON lp.unit_id = un.unit_id
                JOIN modules m ON un.module_id = m.module_id
                JOIN users u ON m.school_id = u.school_id
                LEFT JOIN (
                    SELECT 
                        assignment_id, 
                        student_id, 
                        MAX(best_score) as best_score, 
                        MAX(best_percentage) as best_percentage,
                        COUNT(*) as attempts_used,
                        MAX(CASE WHEN passed THEN 1 ELSE 0 END) as passed,
                        MAX(last_attempt_at) as last_attempt_at
                    FROM assignment_results
                    JOIN assignments USING(assignment_id)
                    GROUP BY assignment_id, student_id
                ) ar_stats ON a.assignment_id = ar_stats.assignment_id AND u.user_id = ar_stats.student_id
                WHERE u.user_id = p_student_id AND m.is_published = TRUE
                ORDER BY ar_stats.last_attempt_at DESC;
            END
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
