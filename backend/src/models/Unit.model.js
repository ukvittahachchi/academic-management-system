const database = require('../config/mysql');
const { AppError, NotFoundError } = require('../utils/errors');

class Unit {
  // ======================
  // CREATE UNIT (Admin Only)
  // ======================
  static async create(unitData) {
    const {
      module_id,
      unit_name,
      unit_order,
      description,
      learning_objectives,
      estimated_time_minutes
    } = unitData;

    // Validate required fields
    if (!module_id || !unit_name) {
      throw new AppError('Missing required fields: module_id and unit_name', 400);
    }

    // Get next order if not provided
    let order = unit_order;
    if (!order) {
      const result = await database.query(
        'SELECT COALESCE(MAX(unit_order), 0) + 1 as next_order FROM units WHERE module_id = ?',
        [module_id]
      );
      // Safe extraction: handle if result is [rows, fields] or just rows
      const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
      order = rows[0]?.next_order || 1;
    }

    const sql = `
      INSERT INTO units (
        module_id, unit_name, unit_order, description,
        learning_objectives, estimated_time_minutes
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      module_id, unit_name, order, description,
      learning_objectives, estimated_time_minutes || 30
    ];

    try {
      const result = await database.query(sql, params);
      
      // Handle insertId extraction safely
      let insertId;
      if (Array.isArray(result)) {
        // If result is [OkPacket, fields] or [OkPacket]
        insertId = result[0]?.insertId || result.insertId;
      } else {
        insertId = result.insertId;
      }

      return this.findById(insertId);
    } catch (error) {
      console.error('Create Unit Error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('Unit with this name already exists in this module', 409);
      }

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new AppError('Referenced module does not exist', 404);
      }

      throw new AppError('Failed to create unit', 500);
    }
  }

  // ======================
  // GET UNIT BY ID
  // ======================
  static async findById(unitId) {
    try {
      const sql = `
        SELECT 
          u.*,
          m.module_name,
          m.grade_level,
          COUNT(DISTINCT lp.part_id) as part_count,
          SUM(CASE WHEN lp.requires_completion = TRUE THEN 1 ELSE 0 END) as required_parts
        FROM units u
        JOIN modules m ON u.module_id = m.module_id
        LEFT JOIN learning_parts lp ON u.unit_id = lp.unit_id AND lp.is_active = TRUE
        WHERE u.unit_id = ?
        GROUP BY u.unit_id
      `;
      
      const result = await database.query(sql, [unitId]);
      
      // FIX: Handle both [rows, fields] and direct rows array
      const units = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

      if (!units || units.length === 0) {
        throw new NotFoundError('Unit');
      }

      return units[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Find Unit By ID Error:', error);
      throw new AppError('Failed to find unit', 500);
    }
  }

  // ======================
  // GET ALL UNITS FOR MODULE
  // ======================
  static async findByModule(moduleId, studentId = null) {
    try {
      let sql = `
        SELECT 
          u.*,
          COUNT(DISTINCT lp.part_id) as total_parts,
          COUNT(DISTINCT CASE WHEN lp.requires_completion = TRUE THEN lp.part_id END) as required_parts
      `;

      // Add student progress if studentId provided
      if (studentId) {
        sql += `,
          COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN lp.part_id END) as completed_parts,
          COUNT(DISTINCT CASE WHEN sp.status = 'in_progress' THEN lp.part_id END) as in_progress_parts,
          COALESCE(MIN(CASE WHEN sp.status = 'in_progress' THEN lp.part_id END), 
                   MIN(CASE WHEN sp.status = 'not_started' THEN lp.part_id END)) as next_part_id
        `;
      }

      sql += `
        FROM units u
        LEFT JOIN learning_parts lp ON u.unit_id = lp.unit_id AND lp.is_active = TRUE
      `;

      if (studentId) {
        sql += `
          LEFT JOIN student_progress sp ON lp.part_id = sp.part_id AND sp.student_id = ?
        `;
      }

      sql += `
        WHERE u.module_id = ?
        GROUP BY u.unit_id
        ORDER BY u.unit_order
      `;

      const params = studentId ? [studentId, moduleId] : [moduleId];
      
      const result = await database.query(sql, params);

      // FIX: This was the specific cause of your crash.
      // We check if result[0] is an array (implying [rows, fields] structure). 
      // If so, we use result[0]. If not, we use result itself.
      const units = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

      // Defensive check to ensure units is an array before mapping
      if (!Array.isArray(units)) {
        return [];
      }

      // Calculate progress percentage for each unit
      return units.map(unit => {
        if (studentId && unit.total_parts > 0) {
          unit.progress_percentage = Math.round((unit.completed_parts / unit.total_parts) * 100);
          unit.has_in_progress = unit.in_progress_parts > 0;
          unit.next_part_id = unit.next_part_id;
        }
        return unit;
      });
    } catch (error) {
      console.error('Find Units By Module Error:', error);
      throw new AppError('Failed to fetch units', 500);
    }
  }

  // ======================
  // UPDATE UNIT
  // ======================
  static async update(unitId, updateData) {
    try {
      // First check if unit exists
      const unit = await this.findById(unitId);
      if (!unit) {
        throw new NotFoundError('Unit');
      }

      const allowedFields = [
        'unit_name', 'unit_order', 'description',
        'learning_objectives', 'estimated_time_minutes'
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
        return unit; // Nothing to update
      }

      params.push(unitId);

      const sql = `
        UPDATE units 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE unit_id = ?
      `;

      await database.query(sql, params);

      // Return updated unit
      return this.findById(unitId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error('Update Unit Error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('Unit with this name already exists in this module', 409);
      }

      throw new AppError('Failed to update unit', 500);
    }
  }

  // ======================
  // DELETE UNIT
  // ======================
  static async delete(unitId) {
    try {
      // Check if unit exists
      const unit = await this.findById(unitId);
      if (!unit) {
        throw new NotFoundError('Unit');
      }

      // Check if unit has learning parts
      const result = await database.query(
        'SELECT COUNT(*) as part_count FROM learning_parts WHERE unit_id = ?',
        [unitId]
      );
      
      const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

      if (rows[0].part_count > 0) {
        throw new AppError('Cannot delete unit that contains learning parts. Delete parts first.', 400);
      }

      const sql = 'DELETE FROM units WHERE unit_id = ?';
      await database.query(sql, [unitId]);

      return { success: true, message: 'Unit deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      console.error('Delete Unit Error:', error);
      throw new AppError('Failed to delete unit', 500);
    }
  }

  // ======================
  // REORDER UNITS
  // ======================
  static async reorderUnits(moduleId, unitOrders) {
    try {
      await database.query('START TRANSACTION');

      for (const { unit_id, unit_order } of unitOrders) {
        await database.query(
          'UPDATE units SET unit_order = ? WHERE unit_id = ? AND module_id = ?',
          [unit_order, unit_id, moduleId]
        );
      }

      await database.query('COMMIT');

      return { success: true, message: 'Units reordered successfully' };
    } catch (error) {
      await database.query('ROLLBACK');
      console.error('Reorder Units Error:', error);
      throw new AppError('Failed to reorder units', 500);
    }
  }

  // ======================
  // GET NEXT UNIT
  // ======================
  static async getNextUnit(currentUnitId, studentId = null) {
    try {
      const currentUnit = await this.findById(currentUnitId);

      const sql = `
        SELECT unit_id, unit_name, unit_order
        FROM units 
        WHERE module_id = ? AND unit_order > ?
        ORDER BY unit_order
        LIMIT 1
      `;

      const result = await database.query(sql, [currentUnit.module_id, currentUnit.unit_order]);
      
      // FIX: Consistent result extraction
      const nextUnits = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

      if (nextUnits && nextUnits.length > 0) {
        return nextUnits[0];
      }

      // No next unit in this module
      return null;
    } catch (error) {
      console.error('Get Next Unit Error:', error);
      return null;
    }
  }

  // ======================
  // VALIDATE UNIT DATA
  // ======================
  static validateUnitData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.unit_name !== undefined) {
      if (!data.unit_name || data.unit_name.trim().length < 3) {
        errors.push('Unit name must be at least 3 characters');
      }

      if (data.unit_name && data.unit_name.length > 100) {
        errors.push('Unit name must not exceed 100 characters');
      }
    }

    if (!isUpdate || data.module_id !== undefined) {
      if (!data.module_id) {
        errors.push('Module ID is required');
      }
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Description must not exceed 1000 characters');
    }

    if (data.learning_objectives && data.learning_objectives.length > 2000) {
      errors.push('Learning objectives must not exceed 2000 characters');
    }

    if (data.estimated_time_minutes && (data.estimated_time_minutes < 5 || data.estimated_time_minutes > 480)) {
      errors.push('Estimated time must be between 5 and 480 minutes');
    }

    return errors;
  }
}

module.exports = Unit;