const mongoose = require('mongoose');
const config = require('../src/config/config');

// Import the Express app components directly
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import routes
const authRoutes = require('../src/routes/auth');
const adminRoutes = require('../src/routes/admin');
const customerRoutes = require('../src/routes/customer');
const bookingRoutes = require('../src/routes/booking');

// Import middleware
const { errorHandler, notFound } = require('../src/middleware/errorHandler');
const { respondWithSuccess } = require('../src/utils/responseHelper');

let app;
let isConnected = false;

const initializeApp = async () => {
  if (app) return app;

  // Connect to database if not already connected
  if (!isConnected) {
    try {
      await mongoose.connect(config.database.uri, config.database.options);
      isConnected = true;
      console.log('✅ MongoDB connected in serverless function');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  // Create Express app
  app = express();

  // Basic middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    respondWithSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.env
    }, 'SmartSlot API is running');
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/customer', customerRoutes);
  app.use('/api/booking', bookingRoutes);

  // Error handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

const handler = async (req, res) => {
  try {
    const expressApp = await initializeApp();
    expressApp(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = handler;