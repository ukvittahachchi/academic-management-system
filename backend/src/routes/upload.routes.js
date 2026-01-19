const express = require('express');
const router = express.Router();
const uploadConfig = require('../config/upload.config');
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Upload single file
router.post('/single', authenticate, uploadConfig.single('file'), uploadController.uploadFile);

// Upload multiple files
router.post('/multiple', authenticate, uploadConfig.array('files', 5), uploadController.uploadMultipleFiles);

// Delete file
router.delete('/:filename', authenticate, uploadController.deleteFile);

module.exports = router;
