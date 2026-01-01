const express = require('express');
const router = express.Router();
const navigationController = require('../controllers/navigation.controller');
const { authenticate, studentOnly } = require('../middlewares/auth.middleware');

// ======================
// MODULE NAVIGATION
// ======================

// @route   GET /api/navigation/modules/:id/hierarchy
// @desc    Get complete module hierarchy with progress
// @access  Protected (Student, Teacher, Admin)
router.get('/modules/:id/hierarchy', authenticate, navigationController.getModuleHierarchy);

// @route   GET /api/navigation/units/:id
// @desc    Get unit details with all learning parts
// @access  Protected
router.get('/units/:id', authenticate, navigationController.getUnitDetails);

// @route   GET /api/navigation/parts/:id
// @desc    Get learning part details with navigation
// @access  Protected
router.get('/parts/:id', authenticate, navigationController.getLearningPart);

// @route   POST /api/navigation/parts/:id/progress
// @desc    Update student progress for a learning part
// @access  Protected (Student only)
router.post('/parts/:id/progress', authenticate, studentOnly, navigationController.updateProgress);

// ======================
// STUDENT PROGRESS & BOOKMARKS
// ======================

// @route   GET /api/navigation/progress/overview
// @desc    Get student's overall progress overview
// @access  Protected (Student only)
router.get('/progress/overview', authenticate, studentOnly, navigationController.getProgressOverview);

// @route   GET /api/navigation/resume
// @desc    Get student's resume point (where to continue)
// @access  Protected (Student only)
router.get('/resume', authenticate, studentOnly, navigationController.getResume);

// @route   POST /api/navigation/bookmarks
// @desc    Add a bookmark
// @access  Protected (Student only)
router.post('/bookmarks', authenticate, studentOnly, navigationController.addBookmark);

// @route   DELETE /api/navigation/bookmarks/:id
// @desc    Remove a bookmark
// @access  Protected (Student only)
router.delete('/bookmarks/:id', authenticate, studentOnly, navigationController.removeBookmark);

// ======================
// SEARCH
// ======================

// @route   GET /api/navigation/modules/:id/search
// @desc    Search within a module (units and parts)
// @access  Protected
router.get('/modules/:id/search', authenticate, navigationController.searchInModule);

module.exports = router;