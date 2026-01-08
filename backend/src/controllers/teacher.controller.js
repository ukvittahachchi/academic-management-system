const TeacherModel = require('../models/Teacher.model');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');

class TeacherController {
    // Get teacher dashboard overview
    // Get teacher dashboard overview
    getTeacherDashboard = asyncHandler(async (req, res) => {
        try {
            const teacherId = req.user.userId;

            // Call stored procedure for dashboard stats
            const query = 'CALL get_teacher_dashboard_stats(?)';
            const db = require('../config/mysql');

            // Use rawQuery which uses pool.query (text protocol) for better SP support
            const results = await db.rawQuery(query, [teacherId]);

            // Ensure results contains expected sets
            let overview = (Array.isArray(results) && results[0] && results[0][0]) ? results[0][0] : {};
            let classesList = (Array.isArray(results) && results[1]) ? results[1] : [];
            let recentActivity = (Array.isArray(results) && results[2]) ? results[2] : [];
            let performanceTrends = (Array.isArray(results) && results[3]) ? results[3] : [];

            // Parse numeric fields from stored procedure (MySQL returns decimals as strings)
            if (overview) {
                overview.overall_avg_score = parseFloat(overview.overall_avg_score || 0);
                overview.avg_completion_rate = parseFloat(overview.avg_completion_rate || 0);
                overview.total_classes = parseInt(overview.total_classes || 0);
                overview.total_students = parseInt(overview.total_students || 0);
            }

            classesList = classesList.map(c => ({
                ...c,
                class_avg_score: parseFloat(c.class_avg_score || 0),
                completion_rate: parseFloat(c.completion_rate || 0),
                student_count: parseInt(c.student_count || 0)
            }));

            performanceTrends = performanceTrends.map(t => ({
                ...t,
                avg_score: parseFloat(t.avg_score || 0),
                completion_rate: parseFloat(t.completion_rate || 0),
                active_students: parseInt(t.active_students || 0),
                completed_items: parseInt(t.completed_items || 0)
            }));

            // Get additional data from models
            let [
                classes,
                performanceDistribution,
                activityTrends,
                topPerformers,
                studentsNeedingAttention
            ] = await Promise.all([
                TeacherModel.getTeacherClasses(teacherId),
                TeacherModel.getPerformanceDistribution(teacherId),
                TeacherModel.getActivityTrends(teacherId, 7),
                TeacherModel.getTopPerformers(teacherId, 5),
                TeacherModel.getStudentsNeedingAttention(teacherId, 5)
            ]);

            // Cast model results
            performanceDistribution = performanceDistribution.map(d => ({
                ...d,
                student_count: parseInt(d.student_count || 0),
                avg_score_in_range: parseFloat(d.avg_score_in_range || 0),
                avg_study_time: parseFloat(d.avg_study_time || 0)
            }));

            topPerformers = topPerformers.map(s => ({
                ...s,
                avg_score: parseFloat(s.avg_score || 0)
            }));

            studentsNeedingAttention = studentsNeedingAttention.map(s => ({
                ...s,
                avg_score: s.avg_score ? parseFloat(s.avg_score) : null,
                days_inactive: parseInt(s.days_inactive || 0)
            }));

            classes = classes.map(c => ({
                ...c,
                student_count: parseInt(c.student_count || 0)
            }));

            activityTrends = activityTrends.map(t => ({
                ...t,
                active_students: parseInt(t.active_students || 0),
                completed_items: parseInt(t.completed_items || 0),
                avg_score: parseFloat(t.avg_score || 0)
            }));

            const dashboardData = {
                overview,
                classes: classesList,
                recent_activity: recentActivity,
                performance_trends: performanceTrends,
                class_list: classes,
                performance_distribution: performanceDistribution,
                activity_trends: activityTrends,
                top_performers: topPerformers,
                students_needing_attention: studentsNeedingAttention
            };

            res.json({
                success: true,
                data: dashboardData
            });
        } catch (error) {
            console.error('Teacher Dashboard Error:', error);
            // Log to fallback file just in case
            try {
                const fs = require('fs');
                const path = require('path');
                fs.writeFileSync(path.join(process.cwd(), 'backend_error.log'), error.stack || error.message);
            } catch (e) { }

            throw error;
        }
    });

    // Get teacher's classes
    getTeacherClasses = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;

        const classes = await TeacherModel.getTeacherClasses(teacherId);

        res.json({
            success: true,
            data: classes
        });
    });

    // Get students in a class
    getClassStudents = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;
        const filters = req.query;

        const students = await TeacherModel.getClassStudents(teacherId, filters);

        res.json({
            success: true,
            data: {
                students,
                total: students.length,
                filters
            }
        });
    });

    // Get class performance metrics
    getClassPerformance = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;
        const filters = req.query;

        const performance = await TeacherModel.getClassPerformance(teacherId, filters);

        res.json({
            success: true,
            data: performance
        });
    });

    // Get student performance details
    getStudentPerformance = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;
        const { studentId } = req.params;
        const { module_id } = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        const performance = await TeacherModel.getStudentPerformance(
            teacherId,
            studentId,
            module_id
        );

        res.json({
            success: true,
            data: performance
        });
    });

    // Get assignment performance
    getAssignmentPerformance = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;
        const filters = req.query;

        const performance = await TeacherModel.getAssignmentPerformance(teacherId, filters);

        res.json({
            success: true,
            data: performance
        });
    });

    // Get performance distribution for charts
    getPerformanceDistribution = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;
        const filters = req.query;

        const distribution = await TeacherModel.getPerformanceDistribution(teacherId, filters);

        res.json({
            success: true,
            data: distribution
        });
    });

    // Get activity trends
    getActivityTrends = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;
        const { days } = req.query;

        const trends = await TeacherModel.getActivityTrends(teacherId, parseInt(days) || 30);

        res.json({
            success: true,
            data: trends
        });
    });

    // Get class comparison
    getClassComparison = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;

        const comparison = await TeacherModel.getClassComparison(teacherId);

        res.json({
            success: true,
            data: comparison
        });
    });

    // Get student progress trend
    getStudentProgressTrend = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;
        const { studentId, moduleId } = req.params;
        const { days } = req.query;

        if (!studentId || !moduleId) {
            throw new AppError('Student ID and Module ID are required', 400);
        }

        // Verify teacher has access to this student
        const hasAccess = await this.verifyTeacherAccess(teacherId, studentId, moduleId);
        if (!hasAccess) {
            throw new AppError('Access denied', 403);
        }

        const trend = await TeacherModel.getStudentProgressTrend(
            studentId,
            moduleId,
            parseInt(days) || 30
        );

        res.json({
            success: true,
            data: trend
        });
    });

    // Get top performers
    getTopPerformers = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;
        const { limit, ...filters } = req.query;

        const performers = await TeacherModel.getTopPerformers(
            teacherId,
            parseInt(limit) || 10,
            filters
        );

        res.json({
            success: true,
            data: performers
        });
    });

    // Get students needing attention
    getStudentsNeedingAttention = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;
        const { limit, ...filters } = req.query;

        const students = await TeacherModel.getStudentsNeedingAttention(
            teacherId,
            parseInt(limit) || 10,
            filters
        );

        res.json({
            success: true,
            data: students
        });
    });

    // Verify teacher has access to student/module
    async verifyTeacherAccess(teacherId, studentId, moduleId) {
        const query = `
            SELECT 1
            FROM teacher_classes tc
            JOIN teacher_students_view ts ON tc.assignment_id = ts.assignment_id
            WHERE tc.teacher_id = ? 
                AND ts.student_id = ? 
                AND tc.module_id = ?
            LIMIT 1
        `;

        const db = require('../config/mysql');
        const rows = await db.execute(query, [teacherId, studentId, moduleId]);

        return rows.length > 0;
    }

    // Get filters for teacher dashboard
    getDashboardFilters = asyncHandler(async (req, res) => {
        const teacherId = req.user.userId;

        const query = `
            SELECT DISTINCT
                m.module_id,
                m.module_name,
                tc.class_section
            FROM teacher_classes tc
            JOIN modules m ON tc.module_id = m.module_id
            WHERE tc.teacher_id = ? AND tc.is_active = TRUE
            ORDER BY m.module_name, tc.class_section
        `;

        const db = require('../config/mysql');
        const rows = await db.execute(query, [teacherId]);

        // Format for frontend
        const filters = {
            modules: [],
            class_sections: []
        };

        rows.forEach(row => {
            filters.modules.push({
                id: row.module_id,
                name: row.module_name
            });

            if (row.class_section && !filters.class_sections.includes(row.class_section)) {
                filters.class_sections.push(row.class_section);
            }
        });

        // Remove duplicates
        filters.modules = filters.modules.filter((module, index, self) =>
            index === self.findIndex(m => m.id === module.id)
        );

        res.json({
            success: true,
            data: filters
        });
    });
}

module.exports = new TeacherController();