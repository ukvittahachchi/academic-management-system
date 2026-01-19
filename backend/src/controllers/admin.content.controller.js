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

exports.createAssignment = async (req, res) => {
    try {
        const { assignment, questions } = req.body;

        if (!assignment || !questions || !Array.isArray(questions)) {
            throw new AppError('Assignment data and questions array are required', 400);
        }

        if (questions.length === 0) {
            throw new AppError('At least one question is required', 400);
        }

        const result = await Assignment.createAssignmentWithQuestions(assignment, questions);

        res.status(201).json({
            success: true,
            message: 'Assignment created successfully',
            data: { assignmentId: result.assignment_id }
        });
    } catch (error) {
        console.error('Create Assignment Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to create assignment'
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
