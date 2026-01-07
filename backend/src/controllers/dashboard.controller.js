const DashboardModel = require('../models/Dashboard.model');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');

class DashboardController {
    // Get complete dashboard data
    getDashboardData = asyncHandler(async (req, res) => {
        const userId = req.user.userId;

        // Get all dashboard data in parallel for better performance
        const [
            stats,
            upcomingAssignments,
            gradesOverview,
            performanceHistory,
            moduleProgress,
            activityStreak,
            studyTimeStats,
            leaderboardStats,
            notifications
        ] = await Promise.all([
            DashboardModel.getDashboardStats(userId),
            DashboardModel.getUpcomingAssignments(userId, 5),
            DashboardModel.getGradesOverview(userId),
            DashboardModel.getPerformanceHistory(userId, 7), // Last 7 days
            DashboardModel.getModuleProgress(userId),
            DashboardModel.getActivityStreak(userId),
            DashboardModel.getStudyTimeStats(userId),
            DashboardModel.getLeaderboardStats(userId),
            DashboardModel.getRecentNotifications(userId)
        ]);

        // Calculate additional metrics
        const safeStudyTimeStats = studyTimeStats || [];
        const totalStudyTime = safeStudyTimeStats.reduce((sum, day) => sum + (day.total_minutes || 0), 0);
        const avgDailyStudyTime = safeStudyTimeStats.length > 0 ? totalStudyTime / safeStudyTimeStats.length : 0;

        // Format response
        const dashboardData = {
            overview: {
                total_modules: stats.overall_stats.total_modules || 0,
                total_learning_parts: stats.overall_stats.total_learning_parts || 0,
                completed_parts: stats.overall_stats.completed_parts || 0,
                completion_percentage: parseFloat(stats.overall_stats.completion_percentage || 0),
                avg_score: parseFloat(stats.overall_stats.avg_score || 0),
                total_assignments: stats.overall_stats.total_assignments || 0,
                passed_assignments: stats.overall_stats.passed_assignments || 0,
                activity_streak: activityStreak,
                total_study_time_minutes: totalStudyTime,
                avg_daily_study_minutes: avgDailyStudyTime
            },
            upcoming_assignments: upcomingAssignments,
            grades_overview: gradesOverview,
            performance_history: performanceHistory,
            module_progress: moduleProgress,
            study_time_stats: studyTimeStats,
            leaderboard: leaderboardStats,
            notifications: notifications,
            recent_activity: stats.recent_activity,
            module_breakdown: stats.module_progress,
            assignment_performance: stats.assignment_performance
        };

        res.json({
            success: true,
            data: dashboardData
        });
    });

    // Get dashboard overview (quick stats)
    getDashboardOverview = asyncHandler(async (req, res) => {
        const userId = req.user.userId;

        const stats = await DashboardModel.getDashboardStats(userId);
        const activityStreak = await DashboardModel.getActivityStreak(userId);

        const overview = {
            total_modules: stats.overall_stats.total_modules || 0,
            completed_parts: stats.overall_stats.completed_parts || 0,
            completion_percentage: stats.overall_stats.completion_percentage || 0,
            avg_score: stats.overall_stats.avg_score || 0,
            passed_assignments: stats.overall_stats.passed_assignments || 0,
            activity_streak: activityStreak
        };

        res.json({
            success: true,
            data: overview
        });
    });

    // Get upcoming assignments
    getUpcomingAssignments = asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { limit } = req.query;

        const assignments = await DashboardModel.getUpcomingAssignments(
            userId,
            parseInt(limit) || 5
        );

        res.json({
            success: true,
            data: assignments
        });
    });

    // Get grades overview
    getGradesOverview = asyncHandler(async (req, res) => {
        const userId = req.user.userId;

        const grades = await DashboardModel.getGradesOverview(userId);

        res.json({
            success: true,
            data: grades
        });
    });

    // Get performance history for charts
    getPerformanceHistory = asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { days } = req.query;

        const history = await DashboardModel.getPerformanceHistory(
            userId,
            parseInt(days) || 30
        );

        res.json({
            success: true,
            data: history
        });
    });

    // Get module progress
    getModuleProgress = asyncHandler(async (req, res) => {
        const userId = req.user.userId;

        const progress = await DashboardModel.getModuleProgress(userId);

        res.json({
            success: true,
            data: progress
        });
    });

    // Get study time statistics
    getStudyTimeStats = asyncHandler(async (req, res) => {
        const userId = req.user.userId;

        const stats = await DashboardModel.getStudyTimeStats(userId);

        res.json({
            success: true,
            data: stats
        });
    });

    // Get activity streak
    getActivityStreak = asyncHandler(async (req, res) => {
        const userId = req.user.userId;

        const streak = await DashboardModel.getActivityStreak(userId);

        res.json({
            success: true,
            data: { current_streak: streak }
        });
    });
}

module.exports = new DashboardController();