const User = require('../models/User.model');
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../utils/errors');
const database = require('../config/mysql');

// Helper to map DB user to API user
const mapUser = (u) => {
    if (!u) return null;
    return {
        user_id: u.user_id,
        school_id: u.school_id,
        username: u.username,
        full_name: u.full_name,
        role: u.role,
        class_grade: u.class_grade,
        roll_number: u.roll_number,
        subject: u.subject,
        is_active: u.is_active === 1 || u.is_active === true,
        last_login: u.last_login,
        created_at: u.created_at,
        profile_picture_url: u.profile_picture_url,
        date_of_birth: u.date_of_birth,
        parent_contact: u.parent_contact,
        must_change_password: u.must_change_password === 1 || u.must_change_password === true
    };
};

class UserController {
    /**
     * Get all users with pagination and filtering
     */
    getUsers = asyncHandler(async (req, res) => {
        // Only admins should access this
        if (req.user?.role !== 'admin') {
            throw new AppError('Forbidden: Admin access required', 403);
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const { role, search } = req.query;
        const school_id = req.user.schoolId; // Ensure admin only sees users from their school

        const users = await User.findAll({ page, limit, role, search, school_id });
        const total = await User.count({ role, search, school_id });

        // Map to camelCase
        const mappedUsers = users.map(mapUser);

        res.status(200).json({
            success: true,
            data: {
                users: mappedUsers,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    });

    /**
     * Get single user by ID
     */
    getUser = asyncHandler(async (req, res) => {
        if (req.user?.role !== 'admin') {
            throw new AppError('Forbidden: Admin access required', 403);
        }

        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Ensure admin belongs to same school (basic multi-tenancy check)
        if (user.school_id !== req.user.schoolId) {
            throw new AppError('User not found in this school', 404);
        }

        // Remove sensitive data
        delete user.password_hash;
        delete user.password_reset_token;

        res.status(200).json({
            success: true,
            data: mapUser(user)
        });
    });

    /**
     * Create new user
     */
    createUser = asyncHandler(async (req, res) => {
        if (req.user?.role !== 'admin') {
            throw new AppError('Forbidden: Admin access required', 403);
        }

        const userData = {
            ...req.body,
            school_id: req.user.schoolId // Force school ID to match admin's
        };

        // Basic validation is handled in Model, but we can add more here if needed

        const newUser = await User.create(userData);

        // Log the creation
        await User.logAuthActivity(req.user.userId, 'create_user', req.ip, req.get('user-agent'), {
            created_user_id: newUser.user_id,
            created_username: newUser.username
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: mapUser(newUser)
        });
    });

    /**
     * Update existing user
     */
    updateUser = asyncHandler(async (req, res) => {
        if (req.user?.role !== 'admin') {
            throw new AppError('Forbidden: Admin access required', 403);
        }

        const userId = req.params.id;
        const updateData = req.body;

        // Check if user exists and belongs to school
        const existingUser = await User.findById(userId);
        if (!existingUser || existingUser.school_id !== req.user.schoolId) {
            throw new AppError('User not found', 404);
        }

        // Prevent password changes if user has already set their own (must_change_password is false)
        if (updateData.password && !existingUser.must_change_password) {
            throw new AppError('Cannot change password for users who have already confirmed their account. Ask the user to reset it themselves.', 403);
        }

        await User.update(userId, updateData);

        const updatedUser = await User.findById(userId);

        // Log the update
        await User.logAuthActivity(req.user.userId, 'update_user', req.ip, req.get('user-agent'), {
            updated_user_id: userId,
            changes: Object.keys(updateData)
        });

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: mapUser(updatedUser)
        });
    });

    /**
     * Delete user (soft delete)
     */
    deleteUser = asyncHandler(async (req, res) => {
        if (req.user?.role !== 'admin') {
            throw new AppError('Forbidden: Admin access required', 403);
        }

        const userId = req.params.id;

        // Check if user exists
        const existingUser = await User.findById(userId);
        if (!existingUser || existingUser.school_id !== req.user.schoolId) {
            throw new AppError('User not found', 404);
        }

        // Prevent self-deletion
        if (existingUser.user_id === req.user.userId) {
            throw new AppError('Cannot delete your own account', 400);
        }

        await User.delete(userId);

        // Log the deletion
        await User.logAuthActivity(req.user.userId, 'delete_user', req.ip, req.get('user-agent'), {
            deleted_user_id: userId,
            deleted_username: existingUser.username
        });

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    });

    /**
     * Get Audit Logs
     */
    getAuditLogs = asyncHandler(async (req, res) => {
        if (req.user?.role !== 'admin') {
            throw new AppError('Forbidden: Admin access required', 403);
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const logs = await User.getAuditLogs({ page, limit, school_id: req.user.schoolId });
        const total = await User.countAuditLogs();

        res.status(200).json({
            success: true,
            data: {
                logs,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    });
}

module.exports = new UserController();
