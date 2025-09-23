const mongoose = require('mongoose');
const config = require('./config');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      console.log('🔄 Connecting to MongoDB...');
      
      this.connection = await mongoose.connect(config.database.uri, config.database.options);
      
      console.log(`✅ MongoDB connected successfully to: ${this.connection.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error.message);
    }
  }

  getConnectionStatus() {
    return mongoose.connection.readyState;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();