const mongoose = require('mongoose');
require('dotenv').config();

class MongoDB {
  constructor() {
    this.isConnected = false;
    this.uri = process.env.MONGODB_URI;
  }

  async connect() {
    if (this.isConnected) {
      console.log('✅ MongoDB already connected');
      return;
    }

    if (!this.uri) {
      throw new Error('MONGODB_URI is missing in .env file');
    }

    try {
      // 🔹 Remove unsupported options
      await mongoose.connect(this.uri);

      this.isConnected = true;
      console.log('✅ MongoDB Atlas Connected Successfully!');

      // Log cluster name safely
      const uriParts = this.uri.split('@');
      if (uriParts.length > 1) {
        console.log(`   Cluster: ${uriParts[1].split('.')[0]}`);
      }

      // Connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB Connection Error:', err.message);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB Disconnected');
        this.isConnected = false;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('✅ MongoDB Connection Closed');
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ MongoDB Connection Failed:', error.message);
      console.error('💡 Troubleshooting:');
      console.error('   1. Check MONGODB_URI in .env');
      console.error('   2. Check Atlas IP whitelist');
      console.error('   3. Check internet connection');
      throw error;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ MongoDB Disconnected');
    }
  }
}

// Singleton instance
const mongoDB = new MongoDB();

module.exports = mongoDB;
