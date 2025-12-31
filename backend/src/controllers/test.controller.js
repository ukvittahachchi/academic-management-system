const database = require('../config/mysql');

class TestController {
  // Test database connection
  async testDatabase(req, res) {
    try {
      const result = await database.query('SELECT 1 + 1 AS solution');

      res.status(200).json({
        success: true,
        message: 'Database connection test successful',
        data: {
          solution: result[0].solution,
          timestamp: new Date().toISOString(),
          database: process.env.DB_NAME
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: error.message
      });
    }
  }

  // Get system info
  async getSystemInfo(req, res) {
    try {
      // Get MySQL version
      const mysqlVersion = await database.query('SELECT VERSION() as version');

      // Get table counts
      const tables = await database.query(`
        SELECT TABLE_NAME, TABLE_ROWS 
        FROM information_schema.tables 
        WHERE table_schema = ?
        ORDER BY TABLE_NAME
      `, [process.env.DB_NAME]);

      res.status(200).json({
        success: true,
        data: {
          system: {
            name: 'Academic Management System',
            version: '1.0.0',
            environment: process.env.NODE_ENV
          },
          database: {
            mysqlVersion: mysqlVersion[0].version,
            databaseName: process.env.DB_NAME,
            tables: tables
          },
          server: {
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime()
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get system info',
        error: error.message
      });
    }
  }
}

module.exports = new TestController();