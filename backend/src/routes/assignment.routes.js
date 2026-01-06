const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

// Get assignment details
router.get('/:partId/details',
    validationMiddleware.validateParam('partId'),
    assignmentController.getAssignmentDetails
);

// Start new attempt
router.post('/:partId/start',
    validationMiddleware.validateParam('partId'),
    assignmentController.startAttempt
);

// Save progress
router.post('/attempt/:attemptId/progress',
    validationMiddleware.validateParam('attemptId'),
    assignmentController.saveProgress
);

// Auto-save progress (for timer)
router.post('/attempt/:attemptId/auto-save',
    validationMiddleware.validateParam('attemptId'),
    assignmentController.autoSaveProgress
);

// Submit assignment
router.post('/attempt/:attemptId/submit',
    validationMiddleware.validateParam('attemptId'),
    validationMiddleware.validateBody(['answers']),
    assignmentController.submitAssignment
);

// Get submission review
router.get('/submission/:submissionId/review',
    validationMiddleware.validateParam('submissionId'),
    assignmentController.getSubmissionReview
);

// Get assignment history
router.get('/:assignmentId/history',
    validationMiddleware.validateParam('assignmentId'),
    assignmentController.getAssignmentHistory
);

// Get all assignments for student
router.get('/student/all',
    assignmentController.getStudentAssignments
);

module.exports = router;