const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// ======================
// DASHBOARD ROUTES (Protected)
// ======================

// All routes require authentication
router.use(authenticate);

// @route   GET /api/dashboard
// @desc    Get complete dashboard data
// @access  Protected (Student)
router.get('/', dashboardController.getDashboardData);

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview (quick stats)
// @access  Protected (Student)
router.get('/overview', dashboardController.getDashboardOverview);

// @route   GET /api/dashboard/upcoming-assignments
// @desc    Get upcoming assignments
// @access  Protected (Student)
router.get('/upcoming-assignments', dashboardController.getUpcomingAssignments);

// @route   GET /api/dashboard/grades
// @desc    Get grades overview
// @access  Protected (Student)
router.get('/grades', dashboardController.getGradesOverview);

// @route   GET /api/dashboard/performance
// @desc    Get performance history
// @access  Protected (Student)
router.get('/performance', dashboardController.getPerformanceHistory);

// @route   GET /api/dashboard/module-progress
// @desc    Get module progress
// @access  Protected (Student)
router.get('/module-progress', dashboardController.getModuleProgress);

// @route   GET /api/dashboard/study-time
// @desc    Get study time statistics
// @access  Protected (Student)
router.get('/study-time', dashboardController.getStudyTimeStats);

// @route   GET /api/dashboard/streak
// @desc    Get activity streak
// @access  Protected (Student)
router.get('/streak', dashboardController.getActivityStreak);

module.exports = router;