const express = require('express');
const router = express.Router();
const contentController = require('../controllers/content.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');

// All routes require authentication
router.use(authMiddleware.authenticate);

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