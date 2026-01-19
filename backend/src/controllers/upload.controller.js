const path = require('path');
const fs = require('fs');

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Return file info
        // We return a relative path that can be stored in the DB
        // and a convenient URL for the frontend if needed immediately
        const relativePath = req.file.path.replace(/\\/g, '/'); // Ensure forward slashes
        const fullUrl = `${req.protocol}://${req.get('host')}/${relativePath}`;

        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: relativePath,
                url: fullUrl
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'File upload failed',
            error: error.message
        });
    }
};

exports.uploadMultipleFiles = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const files = req.files.map(file => {
            const relativePath = file.path.replace(/\\/g, '/');
            return {
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: relativePath,
                url: `${req.protocol}://${req.get('host')}/${relativePath}`
            };
        });

        res.status(200).json({
            success: true,
            message: 'Files uploaded successfully',
            files: files
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Files upload failed',
            error: error.message
        });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const { filename } = req.params;

        // Prevent directory traversal attacks
        const safeFilename = path.basename(filename);
        const filePath = path.join('uploads', safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Delete file
        fs.unlinkSync(filePath);

        res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'File deletion failed',
            error: error.message
        });
    }
};
