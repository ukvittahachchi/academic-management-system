const AnalyticsModel = require('../models/Analytics.model');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');

class AnalyticsController {
    // Get comprehensive student analytics
    getStudentAnalytics = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { module_id } = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify teacher has access to this student
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const analytics = await AnalyticsModel.getStudentAnalytics(studentId, module_id);

        res.json({
            success: true,
            data: analytics
        });
    });

    // Get student progress tracking
    getStudentProgress = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const filters = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const progress = await AnalyticsModel.getStudentProgress(studentId, filters);

        res.json({
            success: true,
            data: progress
        });
    });

    // Get assignment performance analysis
    getAssignmentPerformance = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const filters = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const performance = await AnalyticsModel.getAssignmentPerformanceAnalysis(studentId, filters);

        res.json({
            success: true,
            data: performance
        });
    });

    // Get time spent analysis
    getTimeSpentAnalysis = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const filters = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const analysis = await AnalyticsModel.getTimeSpentAnalysis(studentId, filters);

        res.json({
            success: true,
            data: analysis
        });
    });

    // Get weak areas identification
    getWeakAreas = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const filters = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const weakAreas = await AnalyticsModel.getWeakAreas(studentId, filters);

        res.json({
            success: true,
            data: weakAreas
        });
    });

    // Add new weak area
    addWeakArea = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const weakAreaData = req.body;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify teacher has access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess) {
            throw new AppError('Access denied', 403);
        }

        weakAreaData.student_id = parseInt(studentId);

        const weakAreaId = await AnalyticsModel.addWeakArea(weakAreaData);

        res.json({
            success: true,
            data: { weak_area_id: weakAreaId },
            message: 'Weak area added successfully'
        });
    });

    // Update weak area status
    updateWeakAreaStatus = asyncHandler(async (req, res) => {
        const { weakAreaId } = req.params;
        const { status, notes } = req.body;

        if (!weakAreaId || !status) {
            throw new AppError('Weak area ID and status are required', 400);
        }

        await AnalyticsModel.updateWeakAreaStatus(weakAreaId, status, notes);

        res.json({
            success: true,
            message: 'Weak area status updated successfully'
        });
    });

    // Get learning patterns
    getLearningPatterns = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { module_id } = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const patterns = await AnalyticsModel.getLearningPatterns(studentId, module_id);

        res.json({
            success: true,
            data: patterns
        });
    });

    // Track study session
    trackStudySession = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const sessionData = req.body;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify student is tracking their own session
        if (req.user.user_id !== parseInt(studentId)) {
            throw new AppError('You can only track your own study sessions', 403);
        }

        sessionData.student_id = parseInt(studentId);

        const trackingId = await AnalyticsModel.trackStudySession(sessionData);

        res.json({
            success: true,
            data: { tracking_id: trackingId },
            message: 'Study session tracked successfully'
        });
    });

    // Get study habits summary
    getStudyHabits = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { days } = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const habits = await AnalyticsModel.getStudyHabitsSummary(studentId, parseInt(days) || 30);

        res.json({
            success: true,
            data: habits
        });
    });

    // Get performance trends
    getPerformanceTrends = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { module_id, weeks } = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const trends = await AnalyticsModel.getPerformanceTrends(
            studentId,
            module_id,
            parseInt(weeks) || 12
        );

        res.json({
            success: true,
            data: trends
        });
    });

    // Get content type performance
    getContentTypePerformance = asyncHandler(async (req, res) => {
        const { studentId } = req.params;
        const { module_id } = req.query;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const performance = await AnalyticsModel.getContentTypePerformance(studentId, module_id);

        res.json({
            success: true,
            data: performance
        });
    });

    // Get improvement recommendations
    getImprovementRecommendations = asyncHandler(async (req, res) => {
        const { studentId } = req.params;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const recommendations = await AnalyticsModel.getImprovementRecommendations(studentId);

        res.json({
            success: true,
            data: recommendations
        });
    });

    // Get analytics summary
    getAnalyticsSummary = asyncHandler(async (req, res) => {
        const { studentId } = req.params;

        if (!studentId) {
            throw new AppError('Student ID is required', 400);
        }

        // Verify access
        const hasAccess = await this.verifyTeacherAccess(req.user.user_id, studentId);
        if (!hasAccess && req.user.user_id !== parseInt(studentId)) {
            throw new AppError('Access denied', 403);
        }

        const summary = await AnalyticsModel.getAnalyticsSummary(studentId);

        res.json({
            success: true,
            data: summary
        });
    });

    // Verify teacher has access to student
    async verifyTeacherAccess(teacherId, studentId) {
        // Teachers can access analytics for students in their classes
        const query = `
            SELECT 1
            FROM teacher_classes tc
            JOIN modules m ON tc.module_id = m.module_id
            JOIN users u ON m.school_id = u.school_id
            WHERE tc.teacher_id = ? 
                AND u.user_id = ? 
                AND u.role = 'student'
                AND tc.is_active = TRUE
            LIMIT 1
        `;

        const db = require('../config/mysql');
        const [rows] = await db.execute(query, [teacherId, studentId]);

        return rows.length > 0;
    }
}

module.exports = new AnalyticsController();