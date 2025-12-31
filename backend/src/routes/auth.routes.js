const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, tryAuthenticate, studentOnly, teacherOnly, adminOnly } = require('../middlewares/auth.middleware');

// ======================
// PUBLIC ROUTES
// ======================

// @route   GET /api/auth/status
// @desc    Get authentication system status
// @access  Public
router.get('/status', authController.getStatus);

// @route   POST /api/auth/login
// @desc    User login (sets HTTP-only cookies)
// @access  Public
router.post('/login', authController.login);

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token cookie
// @access  Public (requires refresh token cookie)
router.post('/refresh', authController.refreshToken);

// @route   GET /api/auth/check
// @desc    Check authentication status
// @access  Public (returns auth status)
router.get('/check', tryAuthenticate, authController.checkAuth);

// ======================
// PROTECTED ROUTES
// ======================

// @route   POST /api/auth/logout
// @desc    User logout (clears cookies)
// @access  Protected
router.post('/logout', authenticate, authController.logout);

// @route   GET /api/auth/me
// @desc    Get current user data
// @access  Protected
router.get('/me', authenticate, authController.getCurrentUser);

// @route   GET /api/auth/role-info
// @desc    Get role-specific information
// @access  Protected
router.get('/role-info', authenticate, authController.getRoleInfo);

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Protected
router.post('/change-password', authenticate, authController.changePassword);

// ======================
// ROLE-SPECIFIC ROUTES
// ======================

// @route   GET /api/auth/dashboard/student
// @desc    Get student dashboard data
// @access  Student only
router.get('/dashboard/student', authenticate, studentOnly, (req, res) => {
  res.json({
    success: true,
    message: 'Student dashboard data',
    dashboard: {
      role: 'student',
      welcomeMessage: `Welcome back, ${req.user.fullName}!`,
      stats: {
        modulesCompleted: 2,
        assignmentsPending: 1,
        averageScore: 85,
        totalModules: 5
      },
      recentActivity: [
        { type: 'assignment', title: 'Computer Basics Quiz', score: 90, date: '2024-01-15' },
        { type: 'module', title: 'Introduction to Computers', status: 'completed', date: '2024-01-14' },
        { type: 'video', title: 'How Computers Work', status: 'watched', date: '2024-01-13' }
      ],
      upcomingAssignments: [
        { title: 'MS Word Basics', dueDate: '2024-01-20', module: 'Using MS Word' },
        { title: 'Internet Safety Quiz', dueDate: '2024-01-25', module: 'Internet Safety' }
      ]
    }
  });
});

// @route   GET /api/auth/dashboard/teacher
// @desc    Get teacher dashboard data
// @access  Teacher only
router.get('/dashboard/teacher', authenticate, teacherOnly, (req, res) => {
  res.json({
    success: true,
    message: 'Teacher dashboard data',
    dashboard: {
      role: 'teacher',
      welcomeMessage: `Welcome, ${req.user.fullName}!`,
      stats: {
        totalStudents: 35,
        averageClassScore: 78,
        assignmentsGraded: 42,
        pendingReviews: 3
      },
      classPerformance: [
        { className: 'Grade 6A', averageScore: 82, topPerformer: 'Kamal Silva (95%)' },
        { className: 'Grade 6B', averageScore: 76, topPerformer: 'Nimali Fernando (88%)' },
        { className: 'Grade 6C', averageScore: 80, topPerformer: 'Saman Kumara (92%)' }
      ],
      recentSubmissions: [
        { student: 'Kamal Silva', assignment: 'Computer Basics', score: 95, submitted: '2 hours ago' },
        { student: 'Nimali Fernando', assignment: 'Computer Basics', score: 88, submitted: '5 hours ago' },
        { student: 'Saman Kumara', assignment: 'Computer Basics', score: 92, submitted: '1 day ago' }
      ],
      alerts: [
        { type: 'warning', message: '2 students have not submitted Assignment 1', priority: 'medium' },
        { type: 'info', message: 'Class average improved by 5% this week', priority: 'low' }
      ]
    }
  });
});

// @route   GET /api/auth/dashboard/admin
// @desc    Get admin dashboard data
// @access  Admin only
router.get('/dashboard/admin', authenticate, adminOnly, (req, res) => {
  res.json({
    success: true,
    message: 'Admin dashboard data',
    dashboard: {
      role: 'admin',
      welcomeMessage: `Welcome, Administrator ${req.user.fullName}!`,
      systemStats: {
        totalUsers: 42,
        activeModules: 3,
        totalAssignments: 15,
        storageUsed: '2.4 GB',
        uptime: '99.8%'
      },
      recentActivity: [
        { type: 'user', action: 'New student registered', details: 'John Doe (Grade 6A)', time: '2 hours ago' },
        { type: 'module', action: 'Module updated', details: 'Internet Safety - Video added', time: '5 hours ago' },
        { type: 'system', action: 'Backup completed', details: 'Daily backup successful', time: '1 day ago' }
      ],
      systemHealth: {
        database: { status: 'healthy', responseTime: '45ms' },
        storage: { status: 'healthy', freeSpace: '85%' },
        api: { status: 'healthy', uptime: '99.9%' }
      },
      pendingTasks: [
        { task: 'Review new teacher registration', priority: 'high', assignedTo: 'Admin' },
        { task: 'Update ICT curriculum for next term', priority: 'medium', assignedTo: 'Admin' },
        { task: 'System maintenance scheduled', priority: 'low', assignedTo: 'System' }
      ]
    }
  });
});

module.exports = router;