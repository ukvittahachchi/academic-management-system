const express = require('express');
const router = express.Router();
const contentController = require('../controllers/content.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');

const adminContentController = require('../controllers/admin.content.controller');
const { adminOnly } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// ======================
// ADMIN ROUTES
// ======================

// Reorder units
router.post('/units/reorder',
    adminOnly,
    adminContentController.reorderUnits
);

// Create Unit
router.post('/units/create',
    adminOnly,
    adminContentController.createUnit
);

// Update Unit
router.put('/units/:unitId',
    adminOnly,
    adminContentController.updateUnit
);

// Delete Unit
router.delete('/units/:unitId',
    adminOnly,
    adminContentController.deleteUnit
);

// Create Assignment (Transaction)
router.post('/assignments/create',
    adminOnly,
    adminContentController.createAssignment
);

// Delete Assignment (Reset)
router.delete('/assignments/:partId',
    adminOnly,
    adminContentController.deleteAssignment
);

// Get Assignment Details (Admin)
router.get('/assignments/:partId',
    adminOnly,
    adminContentController.getAssignmentByPart
);

// Update Learning Part
router.put('/parts/:partId',
    adminOnly,
    adminContentController.updateLearningPart
);

// Delete Learning Part
router.delete('/parts/:partId',
    adminOnly,
    adminContentController.deleteLearningPart
);

// Create Learning Part
router.post('/parts',
    adminOnly,
    adminContentController.createLearningPart
);

// Delete Question
router.delete('/questions/:questionId',
    adminOnly,
    adminContentController.deleteQuestion
);

// Get content details
router.get('/:partId',
    validationMiddleware.validateParam('partId'),
    contentController.getContentDetails
);

// Mark content as completed
router.post('/:partId/complete',
    validationMiddleware.validateParam('partId'),
    contentController.markContentCompleted
);

// Get download URL
router.get('/:partId/download-url',
    validationMiddleware.validateParam('partId'),
    contentController.getDownloadUrl
);

// Handle file download (with token verification)
router.get('/download/:partId',
    authMiddleware.authenticate,
    contentController.handleDownload
);

// Get all downloadable content for student
router.get('/downloads/list',
    contentController.getDownloadableContent
);

// Update content access time
router.post('/:partId/access-time',
    validationMiddleware.validateParam('partId'),
    validationMiddleware.validateBody(['timeSpent']),
    contentController.updateAccessTime
);

module.exports = router;