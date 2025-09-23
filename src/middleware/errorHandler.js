const config = require('../config/config');
const { respondWithError } = require('../utils/responseHelper');

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    return respondWithError(res, message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let field = Object.keys(err.keyValue)[0];
    let value = err.keyValue[field];
    
    // Handle specific duplicate errors
    let message = `Duplicate field value: ${field}`;
    
    if (field === 'email') {
      message = 'Email address is already registered';
    } else if (field === 'username') {
      message = 'Username is already taken';
    } else if (field === 'bookingReference') {
      message = 'Booking reference already exists';
    } else if (err.keyValue.date && err.keyValue.timeSlot) {
      message = 'This time slot is already booked';
    }
    
    return respondWithError(res, message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    
    return respondWithError(res, 'Validation Error', 400, { errors });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return respondWithError(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return respondWithError(res, 'Token expired', 401);
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError') {
    return respondWithError(res, 'Database connection failed', 503);
  }

  if (err.name === 'MongoTimeoutError') {
    return respondWithError(res, 'Database operation timed out', 504);
  }

  // Handle specific business logic errors
  if (err.message && typeof err.message === 'string') {
    if (err.message.includes('already booked')) {
      return respondWithError(res, 'This time slot is already booked', 409);
    }
    
    if (err.message.includes('not available')) {
      return respondWithError(res, 'Selected time slot is not available', 400);
    }
    
    if (err.message.includes('past date')) {
      return respondWithError(res, 'Cannot book dates in the past', 400);
    }
  }

  // Default error
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || err.message || 'Internal Server Error';

  // Don't expose internal errors in production
  const finalMessage = config.env === 'production' && statusCode === 500 
    ? 'Something went wrong' 
    : message;

  return respondWithError(res, finalMessage, statusCode);
};

// 404 handler for undefined routes
const notFound = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  return respondWithError(res, message, 404);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Rate limiting error handler
const rateLimitHandler = (req, res) => {
  return respondWithError(res, 'Too many requests, please try again later', 429);
};

// CORS error handler
const corsErrorHandler = (err, req, res, next) => {
  if (err.message.includes('CORS')) {
    return respondWithError(res, 'CORS policy violation', 403);
  }
  next(err);
};

// Request timeout handler
const timeoutHandler = (req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      return respondWithError(res, 'Request timeout', 408);
    }
  }, 30000); // 30 seconds

  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
};

// Memory usage monitor
const memoryMonitor = (req, res, next) => {
  if (config.env === 'development') {
    const memUsage = process.memoryUsage();
    const memInMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (memInMB > 500) { // Warning if heap usage > 500MB
      console.warn(`⚠️ High memory usage: ${memInMB}MB`);
    }
  }
  next();
};

// Database error specific handler
const dbErrorHandler = (err, req, res, next) => {
  // Handle specific MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    console.error('Database Error:', err);
    
    switch (err.code) {
      case 11000: // Duplicate key
        return next(err); // Let the main error handler deal with it
      case 121: // Document validation failure
        return respondWithError(res, 'Data validation failed', 400);
      case 50: // Exceeded time limit
        return respondWithError(res, 'Database operation timed out', 504);
      default:
        return respondWithError(res, 'Database error occurred', 500);
    }
  }
  
  next(err);
};

// Error logger middleware
const errorLogger = (err, req, res, next) => {
  // Create error log object
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user._id : null,
    error: {
      name: err.name,
      message: err.message,
      stack: config.env === 'development' ? err.stack : undefined
    }
  };

  // Log to console (in production, you might want to use a proper logging service)
  console.error('Error Log:', JSON.stringify(errorLog, null, 2));

  // In production, you could send this to a logging service like:
  // - Winston
  // - Bunyan
  // - ELK Stack
  // - CloudWatch
  // - Sentry

  next(err);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  rateLimitHandler,
  corsErrorHandler,
  timeoutHandler,
  memoryMonitor,
  dbErrorHandler,
  errorLogger
};