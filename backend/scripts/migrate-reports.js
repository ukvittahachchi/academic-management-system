const db = require('../src/config/mysql');

async function migrate() {
    try {
        console.log('🚀 Starting Database Migration...');

        // Create reports table
        const createReportsTable = `
            CREATE TABLE IF NOT EXISTS reports (
                report_id INT AUTO_INCREMENT PRIMARY KEY,
                school_id INT NOT NULL,
                report_type VARCHAR(50) NOT NULL,
                report_name VARCHAR(255) NOT NULL,
                generated_by INT NOT NULL,
                parameters_json TEXT,
                file_path VARCHAR(512) NOT NULL,
                file_size_bytes BIGINT NOT NULL,
                download_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NULL,
                FOREIGN KEY (generated_by) REFERENCES users(user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        // Create report_items table
        const createReportItemsTable = `
            CREATE TABLE IF NOT EXISTS report_items (
                item_id INT AUTO_INCREMENT PRIMARY KEY,
                report_type VARCHAR(50) NOT NULL,
                column_name VARCHAR(100) NOT NULL,
                column_label VARCHAR(100) NOT NULL,
                data_type ENUM('string', 'number', 'date', 'percentage', 'boolean') DEFAULT 'string',
                sort_order INT DEFAULT 0,
                is_visible BOOLEAN DEFAULT TRUE,
                formula TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;

        await db.query(createReportsTable);
        console.log('✅ Table "reports" created successfully.');

        await db.query(createReportItemsTable);
        console.log('✅ Table "report_items" created successfully.');

        // Add some default report items if they don't exist
        const insertDefaultItems = `
            INSERT IGNORE INTO report_items (report_type, column_name, column_label, data_type, sort_order) VALUES
            ('student_performance', 'student_name', 'Student Name', 'string', 1),
            ('student_performance', 'username', 'Username', 'string', 2),
            ('student_performance', 'class_grade', 'Grade/Class', 'string', 3),
            ('student_performance', 'module_name', 'Module', 'string', 4),
            ('student_performance', 'average_score', 'Avg Score', 'number', 5),
            ('student_performance', 'assignments_completed', 'Assignments Done', 'number', 6),
            
            ('class_summary', 'class_grade', 'Class', 'string', 1),
            ('class_summary', 'total_students', 'Total Students', 'number', 2),
            ('class_summary', 'active_students', 'Active Students', 'number', 3),
            ('class_summary', 'avg_score', 'Avg Score', 'number', 4),
            ('class_summary', 'avg_completion_rate', 'Avg Completion %', 'percentage', 5),
            
            ('module_analytics', 'module_name', 'Module Name', 'string', 1),
            ('module_analytics', 'grade_level', 'Grade Level', 'string', 2),
            ('module_analytics', 'total_students_started', 'Students Started', 'number', 3),
            ('module_analytics', 'completions', 'Completions', 'number', 4),
            ('module_analytics', 'avg_score', 'Avg Score', 'number', 5);
        `;

        await db.query(insertDefaultItems);
        console.log('✅ Default report items inserted.');

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
