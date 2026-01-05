const db = require('../config/mysql');

class ContentModel {
    // Get content metadata for a learning part
    static async getContentMetadata(partId) {
        const query = `
            SELECT 
                lp.part_id,
                lp.title,
                lp.part_type,
                lp.content_url,
                lp.content_type,
                lp.file_size,
                lp.thumbnail_url,
                lp.video_duration,
                lp.pages_count,
                lp.is_downloadable,
                lp.preview_enabled,
                cm.file_name,
                cm.mime_type,
                cm.file_size_bytes,
                cm.storage_path,
                cm.storage_provider,
                cm.upload_date
            FROM learning_parts lp
            LEFT JOIN content_metadata cm ON lp.part_id = cm.part_id
            WHERE lp.part_id = ?
        `;

        const rows = await db.execute(query, [partId]);
        return rows[0] || null;
    }

    // Log content access
    static async logContentAccess(userId, partId, actionType, deviceInfo = null, ipAddress = null) {
        const query = `
            INSERT INTO content_access_logs 
            (user_id, part_id, action_type, device_info, ip_address)
            VALUES (?, ?, ?, ?, ?)
        `;

        await db.execute(query, [userId, partId, actionType, deviceInfo, ipAddress]);

        // Update access count in content_metadata
        if (actionType === 'view' || actionType === 'download') {
            await db.execute(
                'UPDATE content_metadata SET access_count = access_count + 1, last_accessed = NOW() WHERE part_id = ?',
                [partId]
            );
        }
    }

    // Get student's content progress
    static async getContentProgress(studentId, partId) {
        const query = `
            SELECT 
                sp.progress_id,
                sp.status,
                sp.started_at,
                sp.completed_at,
                sp.time_spent_seconds,
                sp.score,
                sp.total_marks
            FROM student_progress sp
            WHERE sp.student_id = ? AND sp.part_id = ?
        `;

        const rows = await db.execute(query, [studentId, partId]);
        return rows[0] || null;
    }

    // Update content progress
    static async updateContentProgress(studentId, partId, status, timeSpent = 0) {
        const existing = await this.getContentProgress(studentId, partId);

        if (existing) {
            const query = `
                UPDATE student_progress 
                SET 
                    status = ?,
                    time_spent_seconds = time_spent_seconds + ?,
                    last_accessed = NOW(),
                    updated_at = NOW()
                WHERE student_id = ? AND part_id = ?
            `;
            await db.execute(query, [status, timeSpent, studentId, partId]);
        } else {
            const query = `
                INSERT INTO student_progress 
                (student_id, part_id, status, started_at, time_spent_seconds)
                VALUES (?, ?, ?, NOW(), ?)
            `;
            await db.execute(query, [studentId, partId, status, timeSpent]);
        }
    }

    // Mark content as completed
    static async markAsCompleted(studentId, partId) {
        const query = `
            UPDATE student_progress 
            SET 
                status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE student_id = ? AND part_id = ?
        `;
        await db.execute(query, [studentId, partId]);
    }

    // Get downloadable content list for student
    static async getDownloadableContent(studentId, moduleId = null) {
        let query = `
            SELECT 
                lp.part_id,
                lp.title,
                lp.part_type,
                lp.content_url,
                lp.content_type,
                lp.file_size,
                lp.is_downloadable,
                cm.file_name,
                cm.mime_type,
                cm.file_size_bytes,
                u.unit_name,
                m.module_name
            FROM learning_parts lp
            JOIN units u ON lp.unit_id = u.unit_id
            JOIN modules m ON u.module_id = m.module_id
            LEFT JOIN content_metadata cm ON lp.part_id = cm.part_id
            WHERE lp.is_downloadable = TRUE
            AND lp.content_url IS NOT NULL
            AND m.is_published = TRUE
        `;

        const params = [];

        if (moduleId) {
            query += ' AND m.module_id = ?';
            params.push(moduleId);
        }

        query += ' ORDER BY m.module_name, u.unit_order, lp.display_order';

        const rows = await db.execute(query, params);
        return rows;
    }
}

module.exports = ContentModel;