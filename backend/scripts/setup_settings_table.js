const database = require('../src/config/mysql');

const setupSettingsTable = async () => {
    try {
        console.log('🔌 Connecting to database...');
        const pool = await database.connect();

        console.log('🛠 Creating system_settings table...');

        // Create Table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        console.log('✅ Table system_settings checked/created.');

        // Seed Default Settings
        const defaultSettings = [
            { key: 'school_name', value: 'Future Academy', desc: 'Name of the school' },
            { key: 'academic_year', value: '2025-2026', desc: 'Current academic year' },
            { key: 'current_term', value: 'Term 1', desc: 'Current active term' },
            { key: 'maintenance_mode', value: 'false', desc: 'System maintenance mode status' },
            { key: 'allow_registration', value: 'true', desc: 'Allow new user registrations' },
            { key: 'email_notifications', value: 'true', desc: 'Enable email notifications' }
        ];

        console.log('🌱 Seeding default settings...');

        for (const setting of defaultSettings) {
            // Insert if not exists
            await pool.query(`
        INSERT IGNORE INTO system_settings (setting_key, setting_value, description)
        VALUES (?, ?, ?)
      `, [setting.key, setting.value, setting.desc]);
        }

        console.log('✅ Default settings seeded.');
        console.log('✨ Setup complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
};

setupSettingsTable();
