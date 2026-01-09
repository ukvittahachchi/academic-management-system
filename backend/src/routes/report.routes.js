const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Generate report (Admin & Teacher)
router.post('/generate',
    authorize('admin', 'teacher'),
    reportController.generateReport
);

// Get all reports (with role-based filtering)
router.get('/', reportController.getReports);

// Get report configurations
router.get('/configurations', reportController.getReportConfigurations);

// Download report
router.get('/download/:reportId', reportController.downloadReport);

// Delete report (Admin & Creator)
router.delete('/:reportId', reportController.deleteReport);

// Schedule report (Admin & Teacher)
router.post('/schedule',
    authorize('admin', 'teacher'),
    reportController.scheduleReport
);

module.exports = router;