const Module = require('../models/Module.model');
const asyncHandler = require('../utils/asyncHandler');
const { AppError, ValidationError } = require('../utils/errors');

class ModuleController {
  // ======================
  // CREATE MODULE (Admin Only)
  // ======================
  createModule = asyncHandler(async (req, res) => {
    const { school_id, module_name, description, grade_level, subject } = req.body;
    const created_by = req.user.userId;

    // Validate input data
    const validationErrors = Module.validateModuleData(req.body);
    if (validationErrors.length > 0) {
      throw new ValidationError('Module validation failed', validationErrors);
    }

    const moduleData = {
      school_id: school_id || req.user.schoolId,
      module_name,
      description,
      grade_level,
      subject: subject || 'ICT',
      created_by
    };

    const module = await Module.create(moduleData);

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      data: module
    });
  });

  // ======================
  // GET ALL MODULES
  // ======================
  getAllModules = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { grade_level, subject, is_published } = req.query;

    const filters = {};
    if (grade_level) filters.grade_level = grade_level;
    if (subject) filters.subject = subject;
    if (is_published !== undefined) {
      filters.is_published = is_published === 'true';
    }

    let modules;

    // Different data for different roles
    if (req.user.role === 'student') {
      modules = await Module.findForStudent(
        schoolId,
        req.user.classGrade,
        req.user.userId
      );
    } else {
      modules = await Module.findAllBySchool(schoolId, filters);
    }

    res.status(200).json({
      success: true,
      count: modules.length,
      data: modules
    });
  });

  // ======================
  // GET SINGLE MODULE
  // ======================
  getModule = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const module = await Module.findById(id);

    // Check school access (except admin)
    if (req.user.role !== 'admin' && module.school_id !== req.user.schoolId) {
      throw new AppError('Access denied to this module', 403);
    }

    // Check if module is published for students
    if (req.user.role === 'student' && !module.is_published) {
      throw new AppError('This module is not available yet', 404);
    }

    res.status(200).json({
      success: true,
      data: module
    });
  });

  // ======================
  // UPDATE MODULE (Admin Only)
  // ======================
  updateModule = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate input data
    const validationErrors = Module.validateModuleData(req.body, true);
    if (validationErrors.length > 0) {
      throw new ValidationError('Module validation failed', validationErrors);
    }

    const updatedModule = await Module.update(id, req.body);

    res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      data: updatedModule
    });
  });

  // ======================
  // DELETE MODULE (Admin Only)
  // ======================
  deleteModule = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await Module.delete(id);

    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  // ======================
  // PUBLISH/UNPUBLISH MODULE (Admin Only)
  // ======================
  togglePublishModule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { publish } = req.body;

    if (typeof publish !== 'boolean') {
      throw new AppError('Publish status must be a boolean', 400);
    }

    const updatedModule = await Module.togglePublish(id, publish);

    res.status(200).json({
      success: true,
      message: `Module ${publish ? 'published' : 'unpublished'} successfully`,
      data: updatedModule
    });
  });

  // ======================
  // GET MODULE STATISTICS
  // ======================
  getModuleStatistics = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;

    const statistics = await Module.getStatistics(schoolId);

    res.status(200).json({
      success: true,
      data: statistics
    });
  });

  // ======================
  // GET GRADE LEVELS
  // ======================
  getGradeLevels = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;

    const sql = `
      SELECT DISTINCT grade_level 
      FROM modules 
      WHERE school_id = ? 
      ORDER BY grade_level
    `;

    const database = require('../config/mysql');
    const gradeLevels = await database.query(sql, [schoolId]);

    res.status(200).json({
      success: true,
      data: gradeLevels.map(g => g.grade_level)
    });
  });

  // ======================
  // SEARCH MODULES
  // ======================
  searchModules = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      throw new AppError('Search query must be at least 2 characters', 400);
    }

    const searchTerm = `%${query}%`;
    const sql = `
      SELECT 
        m.*,
        u.full_name as created_by_name,
        COUNT(DISTINCT u2.unit_id) as unit_count
      FROM modules m
      LEFT JOIN users u ON m.created_by = u.user_id
      LEFT JOIN units u2 ON m.module_id = u2.module_id
      WHERE m.school_id = ? 
        AND (
          m.module_name LIKE ? 
          OR m.description LIKE ? 
          OR m.grade_level LIKE ?
        )
        AND (m.is_published = TRUE OR ? = TRUE)  -- Admin sees all, others see published only
      GROUP BY m.module_id
      ORDER BY m.created_at DESC
      LIMIT 20
    `;

    const database = require('../config/mysql');
    const modules = await database.query(sql, [
      schoolId,
      searchTerm,
      searchTerm,
      searchTerm,
      req.user.role === 'admin' || req.user.role === 'teacher'
    ]);

    res.status(200).json({
      success: true,
      count: modules.length,
      data: modules
    });
  });
}

module.exports = new ModuleController();