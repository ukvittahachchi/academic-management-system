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
      keepAliveInitialDelay: 0
    };
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected && this.pool) {
        return this.pool;
      }

      console.log('🔌 Connecting to MySQL...');
      this.pool = mysql.createPool(this.config);

      // Test connection
      const connection = await this.pool.getConnection();
      console.log('✅ MySQL Connected Successfully!');
      console.log(`   Database: ${this.config.database}`);
      console.log(`   Host: ${this.config.host}:${this.config.port}`);

      connection.release();
      this.isConnected = true;
      return this.pool;
    } catch (error) {
      console.error('❌ MySQL Connection Failed:', error.message);
      console.error('💡 Troubleshooting:');
      console.error('   1. Make sure XAMPP MySQL is running');
      console.error('   2. Check if database "academic_system" exists');
      console.error('   3. Try: CREATE DATABASE academic_system;');
      throw error;
    }
  }

  async query(sql, params = []) {
    let processedParams = [];
    try {
      if (!this.pool || !this.isConnected) {
        await this.connect();
      }
      console.log(`📊 Executing SQL: ${sql.substring(0, 100)}...`);
      // Convert JSON objects to strings for MySQL
      processedParams = params.map(param => {
        if (typeof param === 'object' && param !== null) {
          return JSON.stringify(param);
        }
        return param;
      });
      const [results] = await this.pool.execute(sql, processedParams);
      return results;
    } catch (error) {
      console.error('❌ Database Query Error:', error.message);
      console.error('   SQL:', sql);
      console.error('   Params:', processedParams);
      throw error;
    }
  }

  async execute(sql, params = []) {
    return this.query(sql, params);
  }


  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ MySQL Connection Closed');
    }
  }
}

// Create singleton instance
const database = new Database();

// Export the instance
module.exports = database;