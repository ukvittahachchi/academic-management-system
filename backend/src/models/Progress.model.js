const database = require('../config/mysql');
const { AppError } = require('../utils/errors');

class Progress {
  // ======================
  // GET STUDENT'S MODULE PROGRESS
  // ======================
  static async getModuleProgress(studentId, moduleId) {
    try {
      const sql = `
        SELECT 
          m.module_id,
          m.module_name,
          COUNT(DISTINCT lp.part_id) as total_parts,
          COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN lp.part_id END) as completed_parts,
          COUNT(DISTINCT CASE WHEN sp.status = 'in_progress' THEN lp.part_id END) as in_progress_parts,
          SUM(CASE WHEN sp.time_spent_seconds IS NOT NULL THEN sp.time_spent_seconds ELSE 0 END) as total_time_seconds,
          AVG(CASE WHEN sp.score IS NOT NULL THEN sp.score END) as average_score
        FROM modules m
        LEFT JOIN units u ON m.module_id = u.module_id
        LEFT JOIN learning_parts lp ON u.unit_id = lp.unit_id AND lp.is_active = TRUE
        LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = ?
        WHERE m.module_id = ?
        GROUP BY m.module_id
      `;
      
      const result = await database.query(sql, [studentId, moduleId]);
      
      // FIX: Safe extraction of rows
      const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
      
      if (!rows || rows.length === 0) {
        throw new AppError('Module not found', 404);
      }
      
      const data = rows[0];
      
      // Safety check for data integrity
      if (!data) {
         throw new AppError('Module data unavailable', 500);
      }

      data.progress_percentage = data.total_parts > 0 
        ? Math.round((data.completed_parts / data.total_parts) * 100)
        : 0;
      
      // Format time
      data.total_time_formatted = this.formatTime(data.total_time_seconds);
      
      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Get Module Progress Error:', error);
      throw new AppError('Failed to fetch module progress', 500);
    }
  }

  // ======================
  // GET STUDENT'S OVERALL PROGRESS
  // ======================
  static async getOverallProgress(studentId) {
    try {
      const sql = `
        SELECT 
          COUNT(DISTINCT m.module_id) as total_modules,
          COUNT(DISTINCT u.unit_id) as total_units,
          COUNT(DISTINCT lp.part_id) as total_parts,
          COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN lp.part_id END) as completed_parts,
          SUM(CASE WHEN sp.time_spent_seconds IS NOT NULL THEN sp.time_spent_seconds ELSE 0 END) as total_time_seconds,
          AVG(CASE WHEN sp.score IS NOT NULL THEN sp.score END) as average_score
        FROM modules m
        LEFT JOIN units u ON m.module_id = u.module_id
        LEFT JOIN learning_parts lp ON u.unit_id = lp.unit_id AND lp.is_active = TRUE
        LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = ?
        WHERE m.is_published = TRUE
      `;
      
      const result = await database.query(sql, [studentId]);
      
      // FIX: Safe extraction
      const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
      
      const data = rows[0] || {};

      data.progress_percentage = data.total_parts > 0 
        ? Math.round((data.completed_parts / data.total_parts) * 100)
        : 0;
      
      // Format time
      data.total_time_formatted = this.formatTime(data.total_time_seconds);
      
      // Get recently accessed modules
      const recentResult = await database.query(`
        SELECT 
          m.module_id,
          m.module_name,
          MAX(sp.last_accessed) as last_accessed
        FROM modules m
        JOIN units u ON m.module_id = u.module_id
        JOIN learning_parts lp ON u.unit_id = lp.unit_id
        JOIN student_progress sp ON lp.part_id = sp.part_id
        WHERE sp.student_id = ? AND sp.last_accessed IS NOT NULL
        GROUP BY m.module_id
        ORDER BY MAX(sp.last_accessed) DESC
        LIMIT 3
      `, [studentId]);
      
      // FIX: Safe extraction for recent modules
      const recentModules = (Array.isArray(recentResult) && Array.isArray(recentResult[0])) ? recentResult[0] : recentResult;
      
      data.recent_modules = recentModules;
      
      return data;
    } catch (error) {
      console.error('Get Overall Progress Error:', error);
      throw new AppError('Failed to fetch overall progress', 500);
    }
  }

  // ======================
  // GET RECENT ACTIVITY
  // ======================
  static async getRecentActivity(studentId, limit = 10) {
    try {
      const sql = `
        SELECT 
          sp.*,
          lp.title as part_title,
          lp.part_type,
          u.unit_name,
          m.module_name,
          CASE 
            WHEN sp.status = 'completed' THEN 'Completed'
            WHEN sp.status = 'in_progress' THEN 'Started'
            ELSE 'Viewed'
          END as activity_type
        FROM student_progress sp
        JOIN learning_parts lp ON sp.part_id = lp.part_id
        JOIN units u ON lp.unit_id = u.unit_id
        JOIN modules m ON u.module_id = m.module_id
        WHERE sp.student_id = ? 
          AND sp.last_accessed IS NOT NULL
        ORDER BY sp.last_accessed DESC
        LIMIT ?
      `;
      
      const result = await database.query(sql, [studentId, limit]);

      // FIX: Safe extraction
      const activities = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
      
      // Format dates for display
      return activities.map(activity => ({
        ...activity,
        time_ago: this.formatTimeAgo(activity.last_accessed),
        formatted_date: this.formatDate(activity.last_accessed)
      }));
    } catch (error) {
      console.error('Get Recent Activity Error:', error);
      throw new AppError('Failed to fetch recent activity', 500);
    }
  }

  // ======================
  // GET STUDENT'S BOOKMARKS
  // ======================
  static async getBookmarks(studentId) {
    try {
      const sql = `
        SELECT 
          b.*,
          lp.title as part_title,
          lp.part_type,
          u.unit_name,
          u.unit_id,
          m.module_name,
          m.module_id,
          sp.status as progress_status
        FROM student_bookmarks b
        JOIN learning_parts lp ON b.part_id = lp.part_id
        JOIN units u ON lp.unit_id = u.unit_id
        JOIN modules m ON u.module_id = m.module_id
        LEFT JOIN student_progress sp ON b.part_id = sp.part_id AND sp.student_id = b.student_id
        WHERE b.student_id = ?
        ORDER BY b.created_at DESC
      `;
      
      const result = await database.query(sql, [studentId]);

      // FIX: Safe extraction
      const bookmarks = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

      return bookmarks;
    } catch (error) {
      console.error('Get Bookmarks Error:', error);
      throw new AppError('Failed to fetch bookmarks', 500);
    }
  }

  // ======================
  // ADD BOOKMARK
  // ======================
  static async addBookmark(studentId, bookmarkData) {
    try {
      const { module_id, unit_id, part_id, notes } = bookmarkData;
      
      // Check if bookmark already exists
      const checkResult = await database.query(
        'SELECT bookmark_id FROM student_bookmarks WHERE student_id = ? AND part_id = ?',
        [studentId, part_id]
      );

      // FIX: Safe extraction
      const existing = (Array.isArray(checkResult) && Array.isArray(checkResult[0])) ? checkResult[0] : checkResult;
      
      if (existing.length > 0) {
        throw new AppError('Bookmark already exists', 409);
      }
      
      const sql = `
        INSERT INTO student_bookmarks (student_id, module_id, unit_id, part_id, notes)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const result = await database.query(sql, [
        studentId, module_id, unit_id, part_id, notes || null
      ]);

      // FIX: Safe Insert ID extraction
      let insertId;
      if (Array.isArray(result)) {
        insertId = result[0]?.insertId || result.insertId;
      } else {
        insertId = result.insertId;
      }
      
      return { 
        success: true, 
        message: 'Bookmark added successfully',
        bookmark_id: insertId 
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Add Bookmark Error:', error);
      throw new AppError('Failed to add bookmark', 500);
    }
  }

  // ======================
  // REMOVE BOOKMARK
  // ======================
  static async removeBookmark(studentId, bookmarkId) {
    try {
      const sql = 'DELETE FROM student_bookmarks WHERE student_id = ? AND bookmark_id = ?';
      const result = await database.query(sql, [studentId, bookmarkId]);
      
      // FIX: Safe affectedRows extraction
      let affectedRows;
      if (Array.isArray(result)) {
          // If result is [OkPacket, Fields] or [OkPacket]
          affectedRows = result[0]?.affectedRows || result.affectedRows; 
      } else {
          affectedRows = result.affectedRows;
      }

      if (affectedRows === 0) {
        throw new AppError('Bookmark not found', 404);
      }
      
      return { success: true, message: 'Bookmark removed successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Remove Bookmark Error:', error);
      throw new AppError('Failed to remove bookmark', 500);
    }
  }

  // ======================
  // GET RESUME POINT
  // ======================
  static async getResumePoint(studentId) {
    try {
      // Get the most recent in-progress part
      const sql = `
        SELECT 
          sp.*,
          lp.title as part_title,
          lp.part_type,
          u.unit_name,
          u.unit_id,
          m.module_name,
          m.module_id
        FROM student_progress sp
        JOIN learning_parts lp ON sp.part_id = lp.part_id
        JOIN units u ON lp.unit_id = u.unit_id
        JOIN modules m ON u.module_id = m.module_id
        WHERE sp.student_id = ? 
          AND sp.status = 'in_progress'
        ORDER BY sp.last_accessed DESC
        LIMIT 1
      `;
      
      const result = await database.query(sql, [studentId]);

      // FIX: Safe extraction
      const resumePoints = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
      
      if (resumePoints.length > 0) {
        return resumePoints[0];
      }
      
      // If no in-progress, get the most recent completed part
      const completedResult = await database.query(`
        SELECT 
          sp.*,
          lp.title as part_title,
          lp.part_type,
          u.unit_name,
          u.unit_id,
          m.module_name,
          m.module_id,
          lp_next.part_id as next_part_id,
          lp_next.title as next_part_title
        FROM student_progress sp
        JOIN learning_parts lp ON sp.part_id = lp.part_id
        JOIN units u ON lp.unit_id = u.unit_id
        JOIN modules m ON u.module_id = m.module_id
        LEFT JOIN learning_parts lp_next ON lp.unit_id = lp_next.unit_id 
          AND lp_next.display_order > lp.display_order
          AND lp_next.is_active = TRUE
        WHERE sp.student_id = ? 
          AND sp.status = 'completed'
        ORDER BY sp.completed_at DESC
        LIMIT 1
      `, [studentId]);

      // FIX: Safe extraction
      const recentCompleted = (Array.isArray(completedResult) && Array.isArray(completedResult[0])) ? completedResult[0] : completedResult;
      
      return recentCompleted[0] || null;
    } catch (error) {
      console.error('Get Resume Point Error:', error);
      return null;
    }
  }

  // ======================
  // HELPER: FORMAT TIME
  // ======================
  static formatTime(seconds) {
    if (!seconds) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // ======================
  // HELPER: FORMAT TIME AGO
  // ======================
  static formatTimeAgo(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }

  // ======================
  // HELPER: FORMAT DATE
  // ======================
  static formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

module.exports = Progress;