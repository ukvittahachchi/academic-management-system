const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'academic_system',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    };
  }

  async connect() {
    if (this.pool) {
      console.log('✅ MySQL already connected');
      return this.pool;
    }

    try {
      this.pool = mysql.createPool(this.config);

      // Test connection
      const connection = await this.pool.getConnection();
      console.log('✅ MySQL Connected Successfully!');
      console.log(`   Database: ${this.config.database}`);
      console.log(`   Host: ${this.config.host}:${this.config.port}`);

      connection.release();
      return this.pool;
    } catch (error) {
      console.error('❌ MySQL Connection Failed:', error.message);
      console.error('💡 Troubleshooting:');
      console.error('   1. Start XAMPP / MySQL');
      console.error('   2. Check DB credentials in .env');
      console.error('   3. Make sure database exists');
      throw error;
    }
  }

  async query(sql, params = []) {
    if (!this.pool) {
      await this.connect();
    }

    try {
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      console.error('❌ MySQL Query Error:', error.message);
      console.error('   SQL:', sql);
      console.error('   Params:', params);
      throw error;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('✅ MySQL Connection Closed');
    }
  }
}

// Singleton instance
const database = new Database();

module.exports = database;
