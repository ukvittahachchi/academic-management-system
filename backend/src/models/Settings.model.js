const database = require('../config/mysql');
const { AppError } = require('../utils/errors');

class Settings {
    // ======================
    // GET ALL SETTINGS
    // ======================
    static async getAll() {
        try {
            const sql = `SELECT setting_key, setting_value, description FROM system_settings`;
            const settings = await database.query(sql);

            // Convert array to object for easier frontend consumption
            const settingsMap = {};
            if (settings) {
                settings.forEach(s => {
                    // Parse boolean/number values
                    let value = s.setting_value;
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else if (!isNaN(Number(value))) {
                        // Keep academic year as string if it contains hyphen
                        if (!value.includes('-')) value = Number(value);
                    }

                    settingsMap[s.setting_key] = value;
                });
            }
            return settingsMap;
        } catch (error) {
            console.error('Get All Settings Error:', error);
            throw new AppError('Failed to retrieve settings', 500);
        }
    }

    // ======================
    // UPDATE SETTINGS
    // ======================
    static async updateBatch(settingsData) {
        try {
            const updates = [];
            const params = [];

            // We need to execute multiple updates, one for each key
            // Since MySQL doesn't support easy batch updates in one statement for different values easily without CASE
            // We'll iterate and run individual updates or a CASE statement.
            // For safety and simplicity given low volume, we'll do individual updates in a transaction/loop.
            // But database.query doesn't expose transaction methods easily on the pool wrapper we have.
            // So we'll just await them concurrently.

            const promises = Object.entries(settingsData).map(async ([key, value]) => {
                const sql = `
          INSERT INTO system_settings (setting_key, setting_value) 
          VALUES (?, ?) 
          ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP
        `;
                // Convert value back to string
                const stringValue = String(value);
                return database.query(sql, [key, stringValue]);
            });

            await Promise.all(promises);
            return true;
        } catch (error) {
            console.error('Update Settings Error:', error);
            throw new AppError('Failed to update settings', 500);
        }
    }

    // ======================
    // GET SINGLE SETTING
    // ======================
    static async get(key, defaultValue = null) {
        try {
            const sql = `SELECT setting_value FROM system_settings WHERE setting_key = ?`;
            const result = await database.query(sql, [key]);
            if (result && result.length > 0) {
                return result[0].setting_value;
            }
            return defaultValue;
        } catch (error) {
            console.error(`Get Setting ${key} Error:`, error);
            return defaultValue;
        }
    }
}

module.exports = Settings;
