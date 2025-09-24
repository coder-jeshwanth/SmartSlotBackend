const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const config = require('./config/config');
const database = require('./config/database');
const { respondWithSuccess, respondWithError } = require('./utils/responseHelper');
const DateUtils = require('./utils/dateUtils');

// Import middleware
const { 
  errorHandler, 
  notFound, 
  timeoutHandler, 
  memoryMonitor, 
  dbErrorHandler, 
  errorLogger,
  rateLimitHandler 
} = require('./middleware/errorHandler');
const corsMiddleware = require('./middleware/cors');
const { sanitizeInput } = require('./middleware/validation');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customer');
const bookingRoutes = require('./routes/booking');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false // Disable CSP for API
    }));

    // CORS configuration with custom middleware
    this.app.use(corsMiddleware);

    // Request timeout
    this.app.use(timeoutHandler);

    // Memory monitoring (development only)
    if (config.env === 'development') {
      this.app.use(memoryMonitor);
    }

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: rateLimitHandler
    });
    this.app.use(limiter);

    // Compression
    this.app.use(compression());

    // HTTP request logger
    if (config.env === 'development') {
      this.app.use(morgan('combined'));
    } else {
      this.app.use(morgan('combined', {
        skip: (req, res) => res.statusCode < 400
      }));
    }

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf);
        } catch (e) {
          throw new Error('Invalid JSON');
        }
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Input sanitization
    this.app.use(sanitizeInput);

    // Add request metadata
    this.app.use((req, res, next) => {
      req.requestId = Math.random().toString(36).substr(2, 9);
      req.startTime = Date.now();
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      respondWithSuccess(res, 'SmartSlot API is running', {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.env,
        version: '1.0.0',
        database: database.isConnected() ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    // API status endpoint
    this.app.get('/api/status', (req, res) => {
      const businessHours = DateUtils.getBusinessHoursStatus();
      
      respondWithSuccess(res, 'API status retrieved', {
        api: {
          status: 'operational',
          version: '1.0.0',
          environment: config.env
        },
        database: {
          status: database.isConnected() ? 'connected' : 'disconnected',
          connectionState: database.getConnectionStatus()
        },
        businessHours,
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          platform: process.platform,
          nodeVersion: process.version
        }
      });
    });

    // Calendar endpoint for public access
    this.app.get('/api/calendar/:month/:year', require('./routes/customer').stack.find(layer => 
      layer.route && layer.route.path === '/calendar/:month/:year'
    ).route.stack[0].handle);

    // Email validation endpoint
    this.app.post('/api/validate/email', (req, res) => {
      const { email } = req.body;
      const Validators = require('./utils/validators');
      const validation = Validators.validateEmail(email);
      
      respondWithSuccess(res, 'Email validation completed', {
        email: validation.email || email,
        isValid: validation.isValid,
        message: validation.message
      });
    });

    // Phone validation endpoint
    this.app.post('/api/validate/phone', (req, res) => {
      const { phone } = req.body;
      const Validators = require('./utils/validators');
      const validation = Validators.validatePhone(phone);
      
      respondWithSuccess(res, 'Phone validation completed', {
        phone: validation.phone || phone,
        isValid: validation.isValid,
        message: validation.message
      });
    });

    // API routes
    this.app.use(`${config.api.prefix}/auth`, authRoutes);
    this.app.use(`${config.api.prefix}/admin`, adminRoutes);
    this.app.use(`${config.api.prefix}/customer`, customerRoutes);
    this.app.use(`${config.api.prefix}/booking`, bookingRoutes);

    // API documentation route (placeholder)
    this.app.get('/api/docs', (req, res) => {
      res.json({
        message: 'SmartSlot API Documentation',
        version: '1.0.0',
        endpoints: {
          authentication: {
            'POST /api/auth/register': 'Register new admin user',
            'POST /api/auth/login': 'Login user',
            'POST /api/auth/logout': 'Logout user',
            'GET /api/auth/verify': 'Verify JWT token',
            'POST /api/auth/refresh': 'Refresh JWT token'
          },
          admin: {
            'GET /api/admin/dashboard': 'Get dashboard statistics',
            'GET /api/admin/dates': 'Get all available dates',
            'GET /api/admin/dates/simple': 'Get all available dates (date and ID only)',
            'GET /api/admin/dates/timings': 'Get all available dates with timing details',
            'POST /api/admin/dates': 'Create new available date',
            'POST /api/admin/dates/bulk': 'Create multiple available dates in bulk',
            'PUT /api/admin/dates/:id': 'Update available date',
            'DELETE /api/admin/dates/:id': 'Delete available date',
            'GET /api/admin/bookings': 'Get all bookings',
            'GET /api/admin/bookings/dates': 'Get all booked dates (today and future)',
            'GET /api/admin/bookings/:date': 'Get bookings for specific date',
            'PUT /api/admin/bookings/:id': 'Update booking status',
            'DELETE /api/admin/bookings/:id': 'Cancel booking',
            'GET /api/admin/analytics': 'Get booking analytics'
          },
          customer: {
            'GET /api/customer/dates': 'Get available dates for booking',
            'GET /api/customer/slots/:date': 'Get available time slots for date',
            'GET /api/customer/calendar/:month/:year': 'Get calendar data for month'
          },
          booking: {
            'POST /api/booking': 'Create new booking',
            'POST /api/booking/simple': 'Create simple booking with basic details',
            'GET /api/booking/:ref': 'Get booking by reference',
            'PUT /api/booking/:ref': 'Update customer booking',
            'DELETE /api/booking/:ref': 'Cancel customer booking'
          },
          general: {
            'GET /health': 'Health check endpoint',
            'GET /api/status': 'API status endpoint',
            'POST /api/validate/email': 'Email validation',
            'POST /api/validate/phone': 'Phone validation'
          }
        }
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      respondWithSuccess(res, 'Welcome to SmartSlot API', {
        message: 'SmartSlot Booking Management System API',
        version: '1.0.0',
        documentation: '/api/docs',
        health: '/health',
        status: '/api/status'
      });
    });
  }

  setupErrorHandling() {
    // Database error handler
    this.app.use(dbErrorHandler);

    // Error logger
    this.app.use(errorLogger);

    // 404 handler for undefined routes
    this.app.use(notFound);

    // Global error handler (must be last)
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Connect to database
      await database.connect();

      // Start server
      const server = this.app.listen(config.port, () => {
        console.log(`🚀 SmartSlot API Server running on port ${config.port}`);
        console.log(`📖 Environment: ${config.env}`);
        console.log(`📋 API Documentation: http://localhost:${config.port}/api/docs`);
        console.log(`❤️  Health Check: http://localhost:${config.port}/health`);
        
        if (config.env === 'development') {
          console.log(`🔧 Development mode - detailed logging enabled`);
        }
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('🔄 SIGTERM received, shutting down gracefully...');
        server.close(async () => {
          await database.disconnect();
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('🔄 SIGINT received, shutting down gracefully...');
        server.close(async () => {
          await database.disconnect();
          process.exit(0);
        });
      });

      return server;
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  }

  getApp() {
    return this.app;
  }
}

module.exports = App;