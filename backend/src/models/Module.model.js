const database = require('../config/mysql');
const { AppError, NotFoundError } = require('../utils/errors');

class Module {
  // ======================
  // CREATE MODULE (Admin Only)
  // ======================
  static async create(moduleData) {
    const {
      school_id,
      module_name,
      description,
      grade_level,
      subject = 'ICT',
      created_by
    } = moduleData;

    // Validate required fields
    if (!school_id || !module_name || !grade_level || !created_by) {
      throw new AppError('Missing required fields: school_id, module_name, grade_level, created_by', 400);
    }

    const sql = `
      INSERT INTO modules (
        school_id, module_name, description, 
        grade_level, subject, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      school_id, module_name, description,
      grade_level, subject, created_by
    ];

    try {
      const result = await database.query(sql, params);
      return this.findById(result.insertId);
    } catch (error) {
      console.error('Create Module Error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('Module with this name already exists for this grade level', 409);
      }

      throw new AppError('Failed to create module', 500);
    }
  }

  // ======================
  // GET MODULE BY ID
  // ======================
  static async findById(moduleId) {
    try {
      const sql = `
        SELECT 
          m.*,
          u.full_name as created_by_name,
          COUNT(DISTINCT u2.unit_id) as unit_count,
          COUNT(DISTINCT lp.part_id) as content_count
        FROM modules m
        LEFT JOIN users u ON m.created_by = u.user_id
        LEFT JOIN units u2 ON m.module_id = u2.module_id
        LEFT JOIN learning_parts lp ON u2.unit_id = lp.unit_id
        WHERE m.module_id = ?
        GROUP BY m.module_id
      `;
      const modules = await database.query(sql, [moduleId]);

      if (modules.length === 0) {
        throw new NotFoundError('Module');
      }

      return modules[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Find Module By ID Error:', error);
      throw new AppError('Failed to find module', 500);
    }
  }

  // ======================
  // GET ALL MODULES FOR SCHOOL
  // ======================
  static async findAllBySchool(schoolId, filters = {}) {
    try {
      let sql = `
        SELECT 
          m.*,
          u.full_name as created_by_name,
          COUNT(DISTINCT u2.unit_id) as unit_count,
          COUNT(DISTINCT lp.part_id) as content_count,
          (
            SELECT COUNT(*) 
            FROM student_progress sp 
            JOIN learning_parts lp2 ON sp.part_id = lp2.part_id
            JOIN units u3 ON lp2.unit_id = u3.unit_id
            WHERE u3.module_id = m.module_id 
              AND sp.status = 'completed'
          ) as completed_by_count
        FROM modules m
        LEFT JOIN users u ON m.created_by = u.user_id
        LEFT JOIN units u2 ON m.module_id = u2.module_id
        LEFT JOIN learning_parts lp ON u2.unit_id = lp.unit_id
        WHERE m.school_id = ?
      `;

      const params = [schoolId];
      const conditions = [];

      // Apply filters
      if (filters.grade_level) {
        conditions.push('m.grade_level = ?');
        params.push(filters.grade_level);
      }

      if (filters.subject) {
        conditions.push('m.subject = ?');
        params.push(filters.subject);
      }

      if (filters.is_published !== undefined) {
        conditions.push('m.is_published = ?');
        params.push(filters.is_published);
      }

      if (conditions.length > 0) {
        sql += ` AND ${conditions.join(' AND ')}`;
      }

      sql += ` GROUP BY m.module_id ORDER BY m.created_at DESC`;

      const modules = await database.query(sql, params);
      return modules;
    } catch (error) {
      console.error('Find All Modules Error:', error);
      throw new AppError('Failed to fetch modules', 500);
    }
  }

  // ======================
  // GET MODULES FOR STUDENT (FIXED)
  // ======================
  static async findForStudent(schoolId, gradeLevel, studentId = null) {
    try {
      let sql = `
        SELECT 
          m.*,
          u.full_name as created_by_name,
          COUNT(DISTINCT u2.unit_id) as unit_count,
          COUNT(DISTINCT lp.part_id) as content_count,
          (
            SELECT COUNT(*) 
            FROM student_progress sp 
            JOIN learning_parts lp2 ON sp.part_id = lp2.part_id
            JOIN units u3 ON lp2.unit_id = u3.unit_id
            WHERE u3.module_id = m.module_id 
              AND sp.student_id = ?
              AND sp.status = 'completed'
          ) as student_completed_count
        FROM modules m
        LEFT JOIN users u ON m.created_by = u.user_id
        LEFT JOIN units u2 ON m.module_id = u2.module_id
        LEFT JOIN learning_parts lp ON u2.unit_id = lp.unit_id
        WHERE m.school_id = ? 
          AND m.grade_level = ?
          AND m.is_published = TRUE
        GROUP BY m.module_id
        ORDER BY m.created_at ASC
      `;

      const modules = await database.query(sql, [studentId, schoolId, gradeLevel]);

      // Calculate progress percentage for each module
      return modules.map(module => ({
        ...module,
        progress_percentage: module.content_count > 0
          ? Math.round((module.student_completed_count / module.content_count) * 100)
          : 0
      }));
    } catch (error) {
      console.error('Find Modules For Student Error:', error);
      throw new AppError('Failed to fetch student modules', 500);
    }
  }

  // ======================
  // UPDATE MODULE
  // ======================
  static async update(moduleId, updateData) {
    try {
      // First check if module exists
      const module = await this.findById(moduleId);
      if (!module) {
        throw new NotFoundError('Module');
      }

      const allowedFields = [
        'module_name', 'description', 'grade_level',
        'subject', 'is_published'
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
        return module; // Nothing to update
      }

      params.push(moduleId);

      const sql = `
        UPDATE modules 
        SET ${updates.join(', ')}
        WHERE module_id = ?
      `;

      await database.query(sql, params);

      // Return updated module
      return this.findById(moduleId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Update Module Error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('Module with this name already exists for this grade level', 409);
      }

      throw new AppError('Failed to update module', 500);
    }
  }

  // ======================
  // DELETE MODULE
  // ======================
  static async delete(moduleId) {
    try {
      // Check if module exists
      const module = await this.findById(moduleId);
      if (!module) {
        throw new NotFoundError('Module');
      }

      // Check if module has units (prevent accidental deletion)
      const units = await database.query(
        'SELECT COUNT(*) as unit_count FROM units WHERE module_id = ?',
        [moduleId]
      );

      if (units[0].unit_count > 0) {
        throw new AppError('Cannot delete module that contains units. Delete units first.', 400);
      }

      const sql = 'DELETE FROM modules WHERE module_id = ?';
      await database.query(sql, [moduleId]);

      return { success: true, message: 'Module deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      console.error('Delete Module Error:', error);
      throw new AppError('Failed to delete module', 500);
    }
  }

  // ======================
  // PUBLISH/UNPUBLISH MODULE
  // ======================
  static async togglePublish(moduleId, publishStatus) {
    try {
      const sql = 'UPDATE modules SET is_published = ? WHERE module_id = ?';
      const result = await database.query(sql, [publishStatus, moduleId]);

      if (result.affectedRows === 0) {
        throw new NotFoundError('Module');
      }

      return this.findById(moduleId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Toggle Publish Error:', error);
      throw new AppError('Failed to update module status', 500);
    }
  }

  // ======================
  // GET MODULE STATISTICS
  // ======================
  static async getStatistics(schoolId) {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_modules,
          SUM(is_published) as published_modules,
          COUNT(DISTINCT grade_level) as grade_levels,
          COUNT(DISTINCT subject) as subjects,
          (
            SELECT COUNT(*) 
            FROM units u 
            JOIN modules m2 ON u.module_id = m2.module_id 
            WHERE m2.school_id = ?
          ) as total_units,
          (
            SELECT COUNT(*) 
            FROM learning_parts lp
            JOIN units u2 ON lp.unit_id = u2.unit_id
            JOIN modules m3 ON u2.module_id = m3.module_id
            WHERE m3.school_id = ?
          ) as total_content_items
        FROM modules 
        WHERE school_id = ?
      `;

      const stats = await database.query(sql, [schoolId, schoolId, schoolId]);
      return stats[0];
    } catch (error) {
      console.error('Get Module Statistics Error:', error);
      throw new AppError('Failed to fetch module statistics', 500);
    }
  }

  // ======================
  // VALIDATE MODULE DATA
  // ======================
  static validateModuleData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.module_name !== undefined) {
      if (!data.module_name || data.module_name.trim().length < 3) {
        errors.push('Module name must be at least 3 characters');
      }

      if (data.module_name && data.module_name.length > 100) {
        errors.push('Module name must not exceed 100 characters');
      }
    }

    if (!isUpdate || data.grade_level !== undefined) {
      if (!data.grade_level) {
        errors.push('Grade level is required');
      }

      // Validate grade level format (e.g., "Grade 6", "Class 7")
      if (data.grade_level && !/^(Grade|Class|Year)\s+\d+$/i.test(data.grade_level)) {
        errors.push('Grade level should be in format "Grade X" or "Class X"');
      }
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description must not exceed 500 characters');
    }

    if (data.subject && data.subject.length > 50) {
      errors.push('Subject must not exceed 50 characters');
    }

    return errors;
  }
}

module.exports = Module;