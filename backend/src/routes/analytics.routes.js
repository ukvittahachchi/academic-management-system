const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Student analytics routes
router.get('/student/:studentId/comprehensive', analyticsController.getStudentAnalytics);
router.get('/student/:studentId/progress', analyticsController.getStudentProgress);
router.get('/student/:studentId/assignments', analyticsController.getAssignmentPerformance);
router.get('/student/:studentId/time-spent', analyticsController.getTimeSpentAnalysis);
router.get('/student/:studentId/weak-areas', analyticsController.getWeakAreas);
router.get('/student/:studentId/learning-patterns', analyticsController.getLearningPatterns);
router.get('/student/:studentId/study-habits', analyticsController.getStudyHabits);
router.get('/student/:studentId/performance-trends', analyticsController.getPerformanceTrends);
router.get('/student/:studentId/content-performance', analyticsController.getContentTypePerformance);
router.get('/student/:studentId/recommendations', analyticsController.getImprovementRecommendations);
router.get('/student/:studentId/summary', analyticsController.getAnalyticsSummary);

// Student-only routes
router.post('/student/:studentId/track-session',
    authMiddleware.authorize('student'),
    analyticsController.trackStudySession
);

// Teacher-only routes
router.post('/student/:studentId/weak-areas',
    authMiddleware.authorize('teacher', 'admin'),
    analyticsController.addWeakArea
);

router.put('/weak-areas/:weakAreaId/status',
    authMiddleware.authorize('teacher', 'admin'),
    analyticsController.updateWeakAreaStatus
);

module.exports = router;