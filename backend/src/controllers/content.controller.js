const ContentModel = require('../models/Content.model');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');

class ContentController {
    // Get content details and metadata
    getContentDetails = asyncHandler(async (req, res) => {
        const { partId } = req.params;
        const userId = req.user.userId;

        if (!partId) {
            throw new AppError('Part ID is required', 400);
        }

        // Get content metadata
        const content = await ContentModel.getContentMetadata(partId);

        if (!content) {
            throw new AppError('Content not found', 404);
        }

        // Log the view access
        await ContentModel.logContentAccess(
            userId,
            partId,
            'view',
            req.headers['user-agent'],
            req.ip
        );

        // Update progress to 'in_progress'
        await ContentModel.updateContentProgress(userId, partId, 'in_progress');

        // Get user's progress for this content
        const progress = await ContentModel.getContentProgress(userId, partId);

        res.json({
            success: true,
            data: {
                content,
                progress,
                viewer_config: this.getViewerConfig(content.part_type, content.content_type)
            }
        });
    });

    // Get viewer configuration based on content type
    getViewerConfig(partType, contentType) {
        const config = {
            can_preview: true,
            can_download: true,
            supported_formats: [],
            viewer_type: 'default'
        };

        switch (partType) {
            case 'reading':
                config.viewer_type = 'pdf';
                config.supported_formats = ['application/pdf', 'text/plain', 'application/msword'];
                config.features = ['zoom', 'search', 'print', 'bookmarks'];
                break;

            case 'presentation':
                config.viewer_type = 'presentation';
                config.supported_formats = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
                config.features = ['slides', 'notes', 'fullscreen'];
                break;

            case 'video':
                config.viewer_type = 'video';
                config.supported_formats = ['video/mp4', 'video/webm', 'video/ogg'];
                config.features = ['playback_speed', 'quality', 'subtitles', 'fullscreen'];
                break;

            case 'assignment':
                config.viewer_type = 'assignment';
                config.can_download = false;
                config.features = ['timer', 'submit', 'review'];
                break;
        }

        return config;
    }

    // Mark content as completed
    markContentCompleted = asyncHandler(async (req, res) => {
        const { partId } = req.params;
        const userId = req.user.userId;

        if (!partId) {
            throw new AppError('Part ID is required', 400);
        }

        await ContentModel.markAsCompleted(userId, partId);

        // Log completion
        await ContentModel.logContentAccess(
            userId,
            partId,
            'complete',
            req.headers['user-agent'],
            req.ip
        );

        res.json({
            success: true,
            message: 'Content marked as completed'
        });
    });

    // Get download URL (secured)
    getDownloadUrl = asyncHandler(async (req, res) => {
        const { partId } = req.params;
        const userId = req.user.userId;

        if (!partId) {
            throw new AppError('Part ID is required', 400);
        }

        const content = await ContentModel.getContentMetadata(partId);

        if (!content) {
            throw new AppError('Content not found', 404);
        }

        if (!content.is_downloadable) {
            throw new AppError('This content is not available for download', 403);
        }

        // Log download access
        await ContentModel.logContentAccess(
            userId,
            partId,
            'download',
            req.headers['user-agent'],
            req.ip
        );

        // Generate secure download token (valid for 5 minutes)
        const downloadToken = this.generateDownloadToken(userId, partId);

        // Construct download URL
        const downloadUrl = `${process.env.BASE_URL}/api/content/download/${partId}?token=${downloadToken}`;

        res.json({
            success: true,
            data: {
                download_url: downloadUrl,
                file_name: content.file_name || content.title,
                file_size: content.file_size_bytes,
                expires_in: 300 // 5 minutes
            }
        });
    });

    // Generate secure download token
    generateDownloadToken(userId, partId) {
        const crypto = require('crypto');
        const payload = `${userId}:${partId}:${Date.now()}`;
        const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
        hmac.update(payload);
        return hmac.digest('hex');
    }

    // Verify download token
    verifyDownloadToken(token, userId, partId) {
        const crypto = require('crypto');
        // Token is valid for 5 minutes
        const timestamp = Date.now();

        for (let i = 0; i < 5; i++) {
            const checkTime = timestamp - (i * 60000); // Check last 5 minutes
            const payload = `${userId}:${partId}:${checkTime}`;
            const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
            hmac.update(payload);
            const checkToken = hmac.digest('hex');

            if (checkToken === token) {
                return true;
            }
        }

        return false;
    }

    // Handle file download
    handleDownload = asyncHandler(async (req, res) => {
        const { partId } = req.params;
        const { token } = req.query;
        const userId = req.user.userId;

        if (!token || !this.verifyDownloadToken(token, userId, partId)) {
            throw new AppError('Invalid or expired download token', 403);
        }

        const content = await ContentModel.getContentMetadata(partId);

        if (!content) {
            throw new AppError('Content not found', 404);
        }

        // Forward request to company server
        // This is a proxy to the actual file server
        const downloadUrl = `${process.env.COMPANY_STORAGE_URL}/download/${content.storage_path}`;

        // Set headers for download
        res.set({
            'Content-Type': content.mime_type,
            'Content-Disposition': `attachment; filename="${content.file_name}"`,
            'Content-Length': content.file_size_bytes,
            'X-File-Name': encodeURIComponent(content.file_name)
        });

        // Proxy the download (or redirect if company server supports direct downloads)
        res.json({
            success: true,
            download_url: downloadUrl,
            direct_download: true // Set to false if you need to proxy
        });
    });

    // Get all downloadable content for student
    getDownloadableContent = asyncHandler(async (req, res) => {
        const userId = req.user.userId;
        const { moduleId } = req.query;

        const content = await ContentModel.getDownloadableContent(userId, moduleId);

        res.json({
            success: true,
            data: content
        });
    });

    // Update content access time (for tracking time spent)
    updateAccessTime = asyncHandler(async (req, res) => {
        const { partId } = req.params;
        const { timeSpent } = req.body; // in seconds
        const userId = req.user.userId;

        if (!partId || !timeSpent) {
            throw new AppError('Part ID and time spent are required', 400);
        }

        await ContentModel.updateContentProgress(userId, partId, 'in_progress', parseInt(timeSpent));

        res.json({
            success: true,
            message: 'Access time updated'
        });
    });
}

module.exports = new ContentController();