const Unit = require('../models/Unit.model');
const LearningPart = require('../models/LearningPart.model');
const Assignment = require('../models/Assignment.model');
const Question = require('../models/Question.model');
const { AppError } = require('../utils/errors');

exports.reorderUnits = async (req, res) => {
    try {
        const { moduleId, unitOrders } = req.body;

        if (!moduleId || !Array.isArray(unitOrders)) {
            throw new AppError('Module ID and unitOrders array are required', 400);
        }

        const result = await Unit.reorderUnits(moduleId, unitOrders);

        res.status(200).json({
            success: true,
            message: 'Units reordered successfully'
        });
    } catch (error) {
        console.error('Reorder Units Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to reorder units'
        });
    }
};

exports.createUnit = async (req, res) => {
    try {
        const unitData = req.body;

        // Basic validation
        if (!unitData.module_id || !unitData.unit_name) {
            throw new AppError('Missing required fields: module_id, unit_name', 400);
        }

        const newUnit = await Unit.create(unitData);

        res.status(201).json({
            success: true,
            message: 'Unit created successfully',
            data: newUnit
        });
    } catch (error) {
        console.error('Create Unit Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to create unit'
        });
    }
};

exports.updateUnit = async (req, res) => {
    try {
        const { unitId } = req.params;
        const updateData = req.body;

        const updatedUnit = await Unit.update(unitId, updateData);

        res.status(200).json({
            success: true,
            message: 'Unit updated successfully',
            data: updatedUnit
        });
    } catch (error) {
        console.error('Update Unit Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to update unit'
        });
    }
};

exports.deleteUnit = async (req, res) => {
    try {
        const { unitId } = req.params;

        await Unit.delete(unitId);

        res.status(200).json({
            success: true,
            message: 'Unit deleted successfully'
        });
    } catch (error) {
        console.error('Delete Unit Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to delete unit'
        });
    }
};

exports.createLearningPart = async (req, res) => {
    try {
        const partData = req.body;

        // Basic validation happens in Model, but we can check critical fields here if needed
        if (!partData.unit_id || !partData.part_type || !partData.title) {
            throw new AppError('Missing required fields: unit_id, part_type, title', 400);
        }

        const newPart = await LearningPart.create(partData);

        res.status(201).json({
            success: true,
            message: 'Learning part created successfully',
            data: newPart
        });
    } catch (error) {
        console.error('Create Part Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to create learning part'
        });
    }
};

exports.updateLearningPart = async (req, res) => {
    try {
        const { partId } = req.params;
        const updateData = req.body;

        const updatedPart = await LearningPart.update(partId, updateData);

        res.status(200).json({
            success: true,
            message: 'Learning part updated successfully',
            data: updatedPart
        });
    } catch (error) {
        console.error('Update Part Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to update learning part'
        });
    }
};

exports.deleteLearningPart = async (req, res) => {
    try {
        const { partId } = req.params;

        await LearningPart.delete(partId);

        res.status(200).json({
            success: true,
            message: 'Learning part deleted successfully'
        });
    } catch (error) {
        console.error('Delete Part Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to delete learning part'
        });
    }
};

exports.createAssignment = async (req, res) => {
    try {
        const { assignment, questions } = req.body;

        if (!assignment || !questions || !Array.isArray(questions)) {
            throw new AppError('Assignment data and questions array are required', 400);
        }

        if (questions.length === 0) {
            throw new AppError('At least one question is required', 400);
        }

        // Get learning part to check title
        const learningPart = await LearningPart.findById(assignment.part_id);

        // Determine Effective Title
        let effectiveTitle = assignment.title;
        const isGenericTitle = !assignment.title ||
            assignment.title.trim() === '' ||
            assignment.title === 'Unit Assignment';

        if (isGenericTitle) {
            effectiveTitle = learningPart.title;
        }

        // Apply effective title to assignment object
        assignment.title = effectiveTitle;

        // Sync: Update Learning Part Title if it differs (and is not empty)
        if (effectiveTitle && effectiveTitle !== learningPart.title) {
            console.log(`DEBUG: Syncing Learning Part Title to: ${effectiveTitle}`);
            await LearningPart.update(assignment.part_id, { title: effectiveTitle });
        }

        // Check if assignment already exists for this part
        const existingAssignment = await Assignment.getAssignmentByPartId(assignment.part_id);

        let result;
        if (existingAssignment) {
            console.log('DEBUG: Updating existing assignment:', existingAssignment.assignment_id);
            result = await Assignment.updateAssignmentWithQuestions(existingAssignment.assignment_id, assignment, questions);
        } else {
            console.log('DEBUG: Creating new assignment');
            result = await Assignment.createAssignmentWithQuestions(assignment, questions);
        }

        res.status(201).json({
            success: true,
            message: existingAssignment ? 'Assignment updated successfully' : 'Assignment created successfully',
            data: { assignmentId: result.assignment_id, syncedTitle: effectiveTitle }
        });
    } catch (error) {
        console.error('Create/Update Assignment Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to save assignment'
        });
    }
};

exports.deleteAssignment = async (req, res) => {
    try {
        const { partId } = req.params;

        // Find assignment by part ID
        const assignment = await Assignment.getAssignmentByPartId(partId);

        if (!assignment) {
            throw new AppError('Assignment not found', 404);
        }

        await Assignment.deleteAssignment(assignment.assignment_id);

        res.status(200).json({
            success: true,
            message: 'Assignment deleted successfully'
        });
    } catch (error) {
        console.error('Delete Assignment Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to delete assignment'
        });
    }
};

exports.getAssignmentByPart = async (req, res) => {
    try {
        const { partId } = req.params;
        const assignment = await Assignment.getAssignmentByPartId(partId);

        if (!assignment) {
            return res.status(200).json({
                success: true,
                data: null
            });
        }

        const questions = await Assignment.getQuestions(assignment.assignment_id, false);

        res.status(200).json({
            success: true,
            data: {
                assignment,
                questions
            }
        });
    } catch (error) {
        console.error('Get Assignment Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to get assignment'
        });
    }
};

exports.deleteQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        await Question.delete(questionId);

        res.status(200).json({
            success: true,
            message: 'Question deleted successfully'
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
};
