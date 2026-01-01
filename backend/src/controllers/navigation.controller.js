const Module = require('../models/Module.model');
const Unit = require('../models/Unit.model');
const LearningPart = require('../models/LearningPart.model');
const Progress = require('../models/Progress.model');
const asyncHandler = require('../utils/asyncHandler');
const { AppError, ValidationError } = require('../utils/errors');

class NavigationController {
  // ======================
  // GET MODULE HIERARCHY
  // ======================
  getModuleHierarchy = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const studentId = req.user.userId;
    
    // Get module details
    const module = await Module.findById(id);
    
    // Check access
    if (req.user.role === 'student' && !module.is_published) {
      throw new AppError('This module is not available yet', 404);
    }
    
    // Get all units with progress
    const units = await Unit.findByModule(id, studentId);
    
    // Get module progress
    const moduleProgress = await Progress.getModuleProgress(studentId, id);
    
    // Get resume point
    const resumePoint = await Progress.getResumePoint(studentId);
    
    res.status(200).json({
      success: true,
      data: {
        module: {
          ...module,
          progress: moduleProgress
        },
        units,
        resume_point: resumePoint && resumePoint.module_id == id ? resumePoint : null,
        hierarchy: {
          module: module.module_name,
          unit_count: units.length,
          total_parts: units.reduce((sum, unit) => sum + unit.total_parts, 0)
        }
      }
    });
  });

  // ======================
  // GET UNIT DETAILS WITH PARTS
  // ======================
  getUnitDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const studentId = req.user.userId;
    
    // Get unit details
    const unit = await Unit.findById(id);
    
    // Get all learning parts with student progress
    const parts = await LearningPart.findByUnit(id, studentId);
    
    // Calculate unit progress
    const totalParts = parts.length;
    const completedParts = parts.filter(p => p.student_status === 'completed').length;
    const progressPercentage = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;
    
    // Get next unit
    const nextUnit = await Unit.getNextUnit(id, studentId);
    
    res.status(200).json({
      success: true,
      data: {
        unit: {
          ...unit,
          progress_percentage: progressPercentage,
          completed_parts: completedParts,
          total_parts: totalParts
        },
        parts,
        next_unit: nextUnit,
        navigation: {
          previous_unit: null, // Will implement if needed
          current_unit: unit.unit_name,
          next_unit: nextUnit?.unit_name
        }
      }
    });
  });

  // ======================
  // GET LEARNING PART DETAILS
  // ======================
  getLearningPart = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const studentId = req.user.userId;
    
    // Get part details with student progress
    const part = await LearningPart.findById(id, studentId);
    
    // Get unit hierarchy
    const unit = await Unit.findById(part.unit_id);
    const module = await Module.findById(part.module_id);
    
    // Check if student can access this part
    if (req.user.role === 'student') {
      // Check if module is published
      if (!module.is_published) {
        throw new AppError('This content is not available', 404);
      }
      
      // Check if previous part needs completion (if required)
      if (part.display_order > 1 && part.requires_completion) {
        const previousParts = await LearningPart.findByUnit(part.unit_id, studentId);
        const previousPart = previousParts.find(p => p.display_order === part.display_order - 1);
        
        if (previousPart && previousPart.requires_completion && previousPart.student_status !== 'completed') {
          throw new AppError('Complete the previous lesson first', 403);
        }
      }
    }
    
    // Update student's last accessed time
    await LearningPart.updateStudentProgress(studentId, id, {
      status: part.student_status || 'in_progress',
      time_spent_seconds: 0
    });
    
    // Get updated progress
    const updatedProgress = await LearningPart.getStudentProgress(id, studentId);
    
    res.status(200).json({
      success: true,
      data: {
        part: {
          ...part,
          student_progress: updatedProgress
        },
        hierarchy: {
          module: {
            id: module.module_id,
            name: module.module_name,
            grade_level: module.grade_level
          },
          unit: {
            id: unit.unit_id,
            name: unit.unit_name,
            order: unit.unit_order
          },
          current_part: {
            id: part.part_id,
            title: part.title,
            type: part.part_type,
            order: part.display_order
          }
        },
        navigation: {
          previous: part.previous_part,
          next: part.next_part
        }
      }
    });
  });

  // ======================
  // UPDATE PROGRESS
  // ======================
  updateProgress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const studentId = req.user.userId;
    const { status, time_spent_seconds, score, total_marks, data_json } = req.body;
    
    // Validate status
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }
    
    // Update progress
    const updatedProgress = await LearningPart.updateStudentProgress(studentId, id, {
      status,
      time_spent_seconds: time_spent_seconds || 0,
      score,
      total_marks,
      data_json
    });
    
    // Get part details for response
    const part = await LearningPart.findById(id);
    
    res.status(200).json({
      success: true,
      message: `Progress updated to ${status}`,
      data: {
        progress: updatedProgress,
        part: {
          id: part.part_id,
          title: part.title,
          type: part.part_type
        }
      }
    });
  });

  // ======================
  // GET STUDENT PROGRESS OVERVIEW
  // ======================
  getProgressOverview = asyncHandler(async (req, res) => {
    const studentId = req.user.userId;
    
    // Get overall progress
    const overallProgress = await Progress.getOverallProgress(studentId);
    
    // Get recent activity
    const recentActivity = await Progress.getRecentActivity(studentId, 5);
    
    // Get bookmarks
    const bookmarks = await Progress.getBookmarks(studentId);
    
    // Get resume point
    const resumePoint = await Progress.getResumePoint(studentId);
    
    res.status(200).json({
      success: true,
      data: {
        overall_progress: overallProgress,
        recent_activity: recentActivity,
        bookmarks,
        resume_point: resumePoint
      }
    });
  });

  // ======================
  // MANAGE BOOKMARKS
  // ======================
  addBookmark = asyncHandler(async (req, res) => {
    const studentId = req.user.userId;
    const { module_id, unit_id, part_id, notes } = req.body;
    
    // Validate required fields
    if (!part_id) {
      throw new AppError('Part ID is required', 400);
    }
    
    const result = await Progress.addBookmark(studentId, {
      module_id,
      unit_id,
      part_id,
      notes
    });
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        bookmark_id: result.bookmark_id
      }
    });
  });

  removeBookmark = asyncHandler(async (req, res) => {
    const studentId = req.user.userId;
    const { id } = req.params;
    
    const result = await Progress.removeBookmark(studentId, id);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  });

  // ======================
  // GET RESUME POINT
  // ======================
  getResume = asyncHandler(async (req, res) => {
    const studentId = req.user.userId;
    
    const resumePoint = await Progress.getResumePoint(studentId);
    
    if (!resumePoint) {
      // Get first available module/unit/part
      const [firstModule] = await database.query(`
        SELECT m.module_id, m.module_name
        FROM modules m
        WHERE m.is_published = TRUE
        ORDER BY m.created_at
        LIMIT 1
      `);
      
      if (firstModule.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No content available',
          data: null
        });
      }
      
      const nextPart = await LearningPart.getNextPartForStudent(firstModule[0].module_id, studentId);
      
      return res.status(200).json({
        success: true,
        message: 'Start your learning journey',
        data: {
          type: 'start',
          module: firstModule[0],
          part: nextPart
        }
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Resume point found',
      data: {
        type: 'resume',
        ...resumePoint
      }
    });
  });

  // ======================
  // SEARCH WITHIN MODULE
  // ======================
  searchInModule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      throw new AppError('Search query must be at least 2 characters', 400);
    }
    
    const searchTerm = `%${query}%`;
    
    const sql = `
      SELECT 
        'unit' as type,
        u.unit_id as id,
        u.unit_name as title,
        u.description,
        u.unit_order as 'order',
        NULL as part_type
      FROM units u
      WHERE u.module_id = ? 
        AND (u.unit_name LIKE ? OR u.description LIKE ?)
      
      UNION ALL
      
      SELECT 
        'part' as type,
        lp.part_id as id,
        lp.title,
        NULL as description,
        lp.display_order as 'order',
        lp.part_type
      FROM learning_parts lp
      JOIN units u ON lp.unit_id = u.unit_id
      WHERE u.module_id = ? 
        AND lp.title LIKE ?
        AND lp.is_active = TRUE
      
      ORDER BY type, 'order'
      LIMIT 20
    `;
    
    const database = require('../config/mysql');
    const [results] = await database.query(sql, [
      id, searchTerm, searchTerm,
      id, searchTerm
    ]);
    
    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  });
}

module.exports = new NavigationController();