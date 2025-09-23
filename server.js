#!/usr/bin/env node

/**
 * SmartSlot Backend Server
 * 
 * Professional REST API for SmartSlot booking management system
 * Built with Node.js, Express.js, and MongoDB
 * 
 * Features:
 * - Complete CRUD operations for slot booking
 * - Admin panel management
 * - Customer booking interface
 * - JWT authentication & authorization
 * - Input validation & sanitization
 * - Rate limiting & security
 * - Error handling & logging
 * - Database connection management
 * 
 * Author: SmartSlot Team
 * Version: 1.0.0
 */

const App = require('./src/app');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  console.log('🔄 Shutting down due to uncaught exception...');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('💥 Unhandled Promise Rejection at:', promise);
  console.error('Reason:', err);
  console.log('🔄 Shutting down due to unhandled promise rejection...');
  process.exit(1);
});

// Handle warning events
process.on('warning', (warning) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Warning:', warning.name);
    console.warn('Message:', warning.message);
    console.warn('Stack:', warning.stack);
  }
});

async function startServer() {
  try {
    console.log('🔄 Starting SmartSlot API Server...');
    console.log('=======================================');
    
    // Create and start the application
    const app = new App();
    await app.start();
    
    console.log('=======================================');
    console.log('✅ SmartSlot API Server started successfully!');
    
  } catch (error) {
    console.error('❌ Failed to start SmartSlot API Server:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Start the server
startServer();