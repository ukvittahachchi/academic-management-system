const database = require('../config/mysql');
const { AppError, NotFoundError } = require('../utils/errors');

class LearningPart {
  // ======================
  // CREATE LEARNING PART (Admin Only)
  // ======================
  static async create(partData) {
    const {
      unit_id,
      part_type,
      title,
      content_url,
      content_data,
      display_order,
      duration_minutes,
      requires_completion,
      unlock_next
    } = partData;

    // Validate required fields
    if (!unit_id || !part_type || !title) {
      throw new AppError('Missing required fields: unit_id, part_type, and title', 400);
    }

    // Validate part type
    const validTypes = ['reading', 'presentation', 'video', 'assignment'];
    if (!validTypes.includes(part_type)) {
      throw new AppError(`Invalid part type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Get next order if not provided
    let order = display_order;
    if (!order) {
      const result = await database.query(
        'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM learning_parts WHERE unit_id = ?',
        [unit_id]
      );
      const maxOrder = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
      order = maxOrder[0].next_order;
    }

    const sql = `
      INSERT INTO learning_parts (
        unit_id, part_type, title, content_url, content_data,
        display_order, duration_minutes, requires_completion, unlock_next
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      unit_id, part_type, title, content_url || null, content_data || null,
      order, duration_minutes || 10,
      requires_completion !== undefined ? requires_completion : true,
      unlock_next !== undefined ? unlock_next : true
    ];

    try {
      const result = await database.query(sql, params);

      let insertId;
      if (Array.isArray(result) && Array.isArray(result[0])) {
        insertId = result[0]?.insertId || result.insertId;
      } else {
        insertId = result.insertId;
      }

      return this.findById(insertId);
    } catch (error) {
      console.error('Create Learning Part Error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('Learning part with this title already exists in this unit', 409);
      }

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new AppError('Referenced unit does not exist', 404);
      }

      throw new AppError('Failed to create learning part', 500);
    }
  }

  // ======================
  // GET LEARNING PART BY ID
  // ======================
  static async findById(partId, studentId = null) {
    try {
      let sql = `
        SELECT 
          lp.*,
          u.unit_id,
          u.unit_name,
          u.unit_order,
          m.module_id,
          m.module_name,
          m.grade_level
      `;

      // Add student progress if studentId provided
      if (studentId) {
        sql += `,
          sp.status as student_status,
          sp.started_at,
          sp.completed_at,
          sp.time_spent_seconds,
          sp.score,
          sp.total_marks,
          sp.attempts,
          sp.data_json
        `;
      }

      sql += `
        FROM learning_parts lp
        JOIN units u ON lp.unit_id = u.unit_id
        JOIN modules m ON u.module_id = m.module_id
      `;

      if (studentId) {
        sql += `
          LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = ?
          WHERE lp.part_id = ?
        `;
      } else {
        sql += ` WHERE lp.part_id = ?`;
      }

      const params = studentId ? [studentId, partId] : [partId];
      const result = await database.query(sql, params);
      const parts = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

      if (parts.length === 0) {
        throw new NotFoundError('Learning part');
      }

      const part = parts[0];

      // Get next part in sequence
      const nextResult = await database.query(`
        SELECT part_id, title, part_type
        FROM learning_parts 
        WHERE unit_id = ? AND display_order > ?
        ORDER BY display_order
        LIMIT 1
      `, [part.unit_id, part.display_order]);

      const nextParts = (Array.isArray(nextResult) && Array.isArray(nextResult[0])) ? nextResult[0] : nextResult;
      part.next_part = nextParts[0] || null;

      // Get previous part
      const prevResult = await database.query(`
        SELECT part_id, title, part_type
        FROM learning_parts 
        WHERE unit_id = ? AND display_order < ?
        ORDER BY display_order DESC
        LIMIT 1
      `, [part.unit_id, part.display_order]);

      const prevParts = (Array.isArray(prevResult) && Array.isArray(prevResult[0])) ? prevResult[0] : prevResult;
      part.previous_part = prevParts[0] || null;

      return part;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Find Learning Part By ID Error:', error);
      throw new AppError('Failed to find learning part', 500);
    }
  }

  // ======================
  // GET ALL PARTS FOR UNIT
  // ======================
  static async findByUnit(unitId, studentId = null) {
    try {
      let sql = `
        SELECT 
          lp.*,
          m.module_id,
          m.module_name
      `;

      // Add student progress if studentId provided
      if (studentId) {
        sql += `,
          sp.status as student_status,
          sp.started_at,
          sp.completed_at,
          sp.score,
          sp.total_marks,
          sp.attempts
        `;
      }

      sql += `
        FROM learning_parts lp
        JOIN units u ON lp.unit_id = u.unit_id
        JOIN modules m ON u.module_id = m.module_id
      `;

      if (studentId) {
        sql += `
          LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = ?
          WHERE lp.unit_id = ? AND lp.is_active = TRUE
        `;
      } else {
        sql += ` WHERE lp.unit_id = ? AND lp.is_active = TRUE`;
      }

      sql += ` ORDER BY lp.display_order`;

      const params = studentId ? [studentId, unitId] : [unitId];
      const parts = await database.query(sql, params);

      return parts;
    } catch (error) {
      console.error('Find Learning Parts By Unit Error:', error);
      throw new AppError('Failed to fetch learning parts', 500);
    }
  }

  // ======================
  // GET ALL PARTS FOR MODULE
  // ======================
  static async findByModule(moduleId, studentId = null) {
    try {
      let sql = `
        SELECT 
          lp.*,
          u.unit_id,
          u.unit_order,
          m.module_id,
          m.module_name
      `;

      // Add student progress if studentId provided
      if (studentId) {
        sql += `,
          sp.status as student_status,
          sp.started_at,
          sp.completed_at,
          sp.score,
          sp.total_marks,
          sp.attempts
        `;
      }

      sql += `
        FROM learning_parts lp
        JOIN units u ON lp.unit_id = u.unit_id
        JOIN modules m ON u.module_id = m.module_id
      `;

      if (studentId) {
        sql += `
          LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = ?
          WHERE m.module_id = ? AND lp.is_active = TRUE
        `;
      } else {
        sql += ` WHERE m.module_id = ? AND lp.is_active = TRUE`;
      }

      sql += ` ORDER BY u.unit_order, lp.display_order`;

      const params = studentId ? [studentId, moduleId] : [moduleId];
      const parts = await database.query(sql, params);

      return parts;
    } catch (error) {
      console.error('Find Learning Parts By Module Error:', error);
      throw new AppError('Failed to fetch module learning parts', 500);
    }
  }

  // ======================
  // GET STUDENT PROGRESS FOR PART
  // ======================
  static async getStudentProgress(partId, studentId) {
    try {
      const sql = `
        SELECT 
          sp.*,
          lp.title,
          lp.part_type,
          u.unit_name,
          m.module_name
        FROM student_progress sp
        JOIN learning_parts lp ON sp.part_id = lp.part_id
        JOIN units u ON lp.unit_id = u.unit_id
        JOIN modules m ON u.module_id = m.module_id
        WHERE sp.part_id = ? AND sp.student_id = ?
      `;

      const result = await database.query(sql, [partId, studentId]);
      const progress = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
      return progress[0] || null;
    } catch (error) {
      console.error('Get Student Progress Error:', error);
      return null;
    }
  }

  // ======================
  // UPDATE LEARNING PART
  // ======================
  static async update(partId, updateData) {
    try {
      // First check if part exists
      const part = await this.findById(partId);
      if (!part) {
        throw new NotFoundError('Learning part');
      }

      const allowedFields = [
        'title', 'content_url', 'content_data', 'display_order',
        'duration_minutes', 'is_active', 'requires_completion', 'unlock_next'
      ];

      const updates = [];
      const params = [];

      // Build dynamic update query
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(updateData[field]);
        }
      }

      if (updates.length === 0) {
        return part; // Nothing to update
      }

      params.push(partId);

      const sql = `
        UPDATE learning_parts 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE part_id = ?
      `;

      await database.query(sql, params);

      // Return updated part
      return this.findById(partId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Update Learning Part Error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('Learning part with this title already exists in this unit', 409);
      }

      throw new AppError('Failed to update learning part', 500);
    }
  }

  // ======================
  // DELETE LEARNING PART
  // ======================
  static async delete(partId) {
    try {
      // Check if part exists
      const part = await this.findById(partId);
      if (!part) {
        throw new NotFoundError('Learning part');
      }

      // 1. Delete associated student progress and logs
      await database.query('DELETE FROM student_progress WHERE part_id = ?', [partId]);
      await database.query('DELETE FROM content_access_logs WHERE part_id = ?', [partId]);
      await database.query('DELETE FROM content_metadata WHERE part_id = ?', [partId]);

      // 2. Check and delete associated assignment if it exists
      // We start by checking if there is an assignment linked to this part
      const assignQuery = 'SELECT assignment_id FROM assignments WHERE part_id = ?';
      const assignResult = await database.query(assignQuery, [partId]);

      // Handle the result format which depends on the mysql wrapper
      let assignments = [];
      if (Array.isArray(assignResult) && Array.isArray(assignResult[0])) {
        // Wrapper returns [rows, fields]
        assignments = assignResult[0];
      } else if (Array.isArray(assignResult)) {
        // Wrapper returns rows directly
        assignments = assignResult;
      }

      if (assignments.length > 0) {
        const AssignmentModel = require('./Assignment.model');
        for (const assignment of assignments) {
          await AssignmentModel.deleteAssignment(assignment.assignment_id);
        }
      }

      // 3. Delete the learning part
      const sql = 'DELETE FROM learning_parts WHERE part_id = ?';
      await database.query(sql, [partId]);

      return { success: true, message: 'Learning part deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      console.error('Delete Learning Part Error:', error);
      throw new AppError('Failed to delete learning part', 500);
    }
  }

  // ======================
  // UPDATE STUDENT PROGRESS
  // ======================
  static async updateStudentProgress(studentId, partId, progressData) {
    try {
      const {
        status,
        time_spent_seconds = 0,
        score = null,
        total_marks = null,
        data_json = null
      } = progressData;

      // Check if progress record exists
      const existingProgress = await this.getStudentProgress(partId, studentId);

      let sql, params;

      if (existingProgress) {
        // Update existing progress
        sql = `
          UPDATE student_progress 
          SET 
            status = COALESCE(?, status),
            time_spent_seconds = time_spent_seconds + ?,
            score = ?,
            total_marks = ?,
            data_json = ?,
            last_accessed = CURRENT_TIMESTAMP,
            ${status === 'completed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
            ${status === 'in_progress' && !existingProgress.started_at ? 'started_at = CURRENT_TIMESTAMP,' : ''}
            attempts = CASE WHEN ? = 'completed' AND status != 'completed' THEN attempts + 1 ELSE attempts END,
            updated_at = CURRENT_TIMESTAMP
          WHERE student_id = ? AND part_id = ?
        `;

        params = [
          status, time_spent_seconds, score, total_marks, data_json,
          status, studentId, partId
        ];
      } else {
        // Insert new progress record
        sql = `
          INSERT INTO student_progress (
            student_id, part_id, status, started_at, 
            time_spent_seconds, score, total_marks, data_json,
            last_accessed, attempts
          ) VALUES (?, ?, ?, 
            CASE WHEN ? IN ('in_progress', 'completed') THEN CURRENT_TIMESTAMP ELSE NULL END,
            ?, ?, ?, ?, CURRENT_TIMESTAMP, 
            CASE WHEN ? = 'completed' THEN 1 ELSE 0 END
          )
        `;

        params = [
          studentId, partId, status, status,
          time_spent_seconds, score, total_marks, data_json,
          status
        ];
      }

      await database.query(sql, params);

      // Return updated progress
      return this.getStudentProgress(partId, studentId);
    } catch (error) {
      console.error('Update Student Progress Error:', error);
      throw new AppError('Failed to update progress', 500);
    }
  }

  // ======================
  // GET STUDENT'S NEXT PART
  // ======================
  static async getNextPartForStudent(moduleId, studentId) {
    try {
      // Get the next part that student should work on
      const sql = `
        SELECT 
          lp.part_id,
          lp.title,
          lp.part_type,
          lp.display_order,
          u.unit_id,
          u.unit_name,
          u.unit_order,
          m.module_id,
          m.module_name,
          sp.status
        FROM modules m
        JOIN units u ON m.module_id = u.module_id
        JOIN learning_parts lp ON u.unit_id = lp.unit_id AND lp.is_active = TRUE
        LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = ?
        WHERE m.module_id = ? AND (sp.status IS NULL OR sp.status != 'completed')
        ORDER BY u.unit_order, lp.display_order
        LIMIT 1
      `;

      const result = await database.query(sql, [studentId, moduleId]);
      const nextParts = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;
      return nextParts[0] || null;
    } catch (error) {
      console.error('Get Next Part For Student Error:', error);
      return null;
    }
  }

  // ======================
  // VALIDATE LEARNING PART DATA
  // ======================
  static validateLearningPartData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.title !== undefined) {
      if (!data.title || data.title.trim().length < 3) {
        errors.push('Title must be at least 3 characters');
      }

      if (data.title && data.title.length > 200) {
        errors.push('Title must not exceed 200 characters');
      }
    }

    if (!isUpdate || data.part_type !== undefined) {
      if (!data.part_type) {
        errors.push('Part type is required');
      } else if (!['reading', 'presentation', 'video', 'assignment'].includes(data.part_type)) {
        errors.push('Part type must be one of: reading, presentation, video, assignment');
      }
    }

    if (!isUpdate || data.unit_id !== undefined) {
      if (!data.unit_id) {
        errors.push('Unit ID is required');
      }
    }

    if (data.duration_minutes && (data.duration_minutes < 1 || data.duration_minutes > 480)) {
      errors.push('Duration must be between 1 and 480 minutes');
    }

    if (data.content_url && data.content_url.length > 500) {
      errors.push('Content URL must not exceed 500 characters');
    }

    return errors;
  }
}

module.exports = LearningPart;