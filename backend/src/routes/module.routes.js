const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/module.controller');
const { authenticate, adminOnly, teacherOnly } = require('../middlewares/auth.middleware');

// ======================
// PUBLIC ROUTES (None - all require auth)
// ======================

// ======================
// PROTECTED ROUTES (All roles)
// ======================

// @route   GET /api/modules
// @desc    Get all modules (filtered by role)
// @access  Protected
router.get('/', authenticate, moduleController.getAllModules);

// @route   GET /api/modules/search
// @desc    Search modules
// @access  Protected
router.get('/search', authenticate, moduleController.searchModules);

// @route   GET /api/modules/grade-levels
// @desc    Get available grade levels
// @access  Protected
router.get('/grade-levels', authenticate, moduleController.getGradeLevels);

// ✅ MOVED UP: Specific routes must be defined BEFORE the dynamic :id route
// @route   GET /api/modules/statistics
// @desc    Get module statistics
// @access  Admin & Teacher only
router.get('/statistics', authenticate, moduleController.getModuleStatistics);

// 🔻 DYNAMIC ROUTE: This catches everything else, so it must stay below specific routes
// @route   GET /api/modules/:id
// @desc    Get single module by ID
// @access  Protected
router.get('/:id', authenticate, moduleController.getModule);

// ======================
// ADMIN-ONLY ROUTES
// ======================

// @route   POST /api/modules
// @desc    Create new module
// @access  Admin only
router.post('/', authenticate, adminOnly, moduleController.createModule);

// @route   PUT /api/modules/:id
// @desc    Update module
// @access  Admin only
router.put('/:id', authenticate, adminOnly, moduleController.updateModule);

// @route   DELETE /api/modules/:id
// @desc    Delete module
// @access  Admin only
router.delete('/:id', authenticate, adminOnly, moduleController.deleteModule);

// @route   PATCH /api/modules/:id/publish
// @desc    Publish/Unpublish module
// @access  Admin only
router.patch('/:id/publish', authenticate, adminOnly, moduleController.togglePublishModule);

module.exports = router;