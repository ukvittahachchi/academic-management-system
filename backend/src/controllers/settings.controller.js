const Settings = require('../models/Settings.model');
const { AppError } = require('../utils/errors');

class SettingsController {
    // Get all settings
    static async getSettings(req, res, next) {
        try {
            const settings = await Settings.getAll();

            res.status(200).json({
                success: true,
                data: settings
            });
        } catch (error) {
            next(error);
        }
    }

    // Update settings
    static async updateSettings(req, res, next) {
        try {
            const updates = req.body;

            if (!updates || Object.keys(updates).length === 0) {
                throw new AppError('No settings provided to update', 400);
            }

            await Settings.updateBatch(updates);

            // Return updated settings
            const settings = await Settings.getAll();

            res.status(200).json({
                success: true,
                message: 'Settings updated successfully',
                data: settings
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = SettingsController;
