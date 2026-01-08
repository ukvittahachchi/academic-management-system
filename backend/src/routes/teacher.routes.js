const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Teacher role required for all teacher routes
router.use(authMiddleware.authorize('teacher', 'admin'));

// Teacher dashboard
router.get('/dashboard', teacherController.getTeacherDashboard);

// Get teacher's classes
router.get('/classes', teacherController.getTeacherClasses);

// Get students in class
router.get('/students', teacherController.getClassStudents);

// Get class performance metrics
router.get('/performance', teacherController.getClassPerformance);

// Get student performance details
router.get('/students/:studentId/performance', teacherController.getStudentPerformance);

// Get assignment performance
router.get('/assignments/performance', teacherController.getAssignmentPerformance);

// Get performance distribution for charts
router.get('/performance/distribution', teacherController.getPerformanceDistribution);

// Get activity trends
router.get('/activity/trends', teacherController.getActivityTrends);

// Get class comparison
router.get('/classes/comparison', teacherController.getClassComparison);

// Get student progress trend
router.get('/students/:studentId/modules/:moduleId/progress', teacherController.getStudentProgressTrend);

// Get top performers
router.get('/top-performers', teacherController.getTopPerformers);

// Get students needing attention
router.get('/attention-needed', teacherController.getStudentsNeedingAttention);

// Get dashboard filters
router.get('/filters', teacherController.getDashboardFilters);

module.exports = router;