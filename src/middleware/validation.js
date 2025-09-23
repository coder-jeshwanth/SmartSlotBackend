const { body, param, query, validationResult } = require('express-validator');
const { respondWithError } = require('../utils/responseHelper');

// Validation rules for different endpoints
const validationRules = {
  // User registration validation
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ],

  // User login validation
  login: [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Email or username is required'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Available date validation
  availableDate: [
    body('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date < today) {
          throw new Error('Date cannot be in the past');
        }
        return true;
      }),
    
    body('startTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format'),
    
    body('endTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format')
      .custom((value, { req }) => {
        const startTime = req.body.startTime;
        if (startTime) {
          const start = startTime.split(':').map(Number);
          const end = value.split(':').map(Number);
          
          const startMinutes = start[0] * 60 + start[1];
          const endMinutes = end[0] * 60 + end[1];
          
          if (endMinutes <= startMinutes) {
            throw new Error('End time must be after start time');
          }
        }
        return true;
      }),
    
    body('slotDuration')
      .optional()
      .isInt({ min: 15, max: 120 })
      .withMessage('Slot duration must be between 15 and 120 minutes'),
    
    body('notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],

  // Bulk available dates validation
  bulkAvailableDates: [
    body('dates')
      .isArray({ min: 1 })
      .withMessage('Dates must be an array with at least one date object'),
    
    body('dates.*.date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Each date must be in YYYY-MM-DD format')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date < today) {
          throw new Error('Dates cannot be in the past');
        }
        return true;
      }),
    
    body('dates.*.startTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format'),
    
    body('dates.*.endTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format')
      .custom((value, { req, path }) => {
        // Extract the array index from the path
        const pathParts = path.split('.');
        const index = pathParts[1];
        const startTime = req.body.dates[index]?.startTime;
        
        if (startTime) {
          const start = startTime.split(':').map(Number);
          const end = value.split(':').map(Number);
          
          const startMinutes = start[0] * 60 + start[1];
          const endMinutes = end[0] * 60 + end[1];
          
          if (endMinutes <= startMinutes) {
            throw new Error(`End time must be after start time for date ${req.body.dates[index]?.date}`);
          }
        }
        return true;
      }),
    
    body('dates.*.slotDuration')
      .optional()
      .isInt({ min: 15, max: 120 })
      .withMessage('Slot duration must be between 15 and 120 minutes'),
    
    body('dates.*.notes')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters')
  ],

  // Booking validation
  booking: [
    body('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date < today) {
          throw new Error('Cannot book dates in the past');
        }
        return true;
      }),
    
    body('timeSlot')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time slot must be in HH:MM format'),
    
    body('customer.name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Customer name must be between 2 and 100 characters'),
    
    body('customer.email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('customer.phone')
      .trim()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
    
    body('customer.notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ],

  // Simple booking validation
  simpleBooking: [
    body('username')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Username must be between 2 and 100 characters'),
    
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('phone')
      .trim()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
    
    body('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format')
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (date < today) {
          throw new Error('Cannot book dates in the past');
        }
        return true;
      }),
    
    body('time')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time must be in HH:MM format'),
    
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ],

  // Update booking status validation
  updateBookingStatus: [
    body('status')
      .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no-show'])
      .withMessage('Invalid status value'),
    
    body('cancellationReason')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason cannot exceed 500 characters')
  ],

  // Date parameter validation
  dateParam: [
    param('date')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date parameter must be in YYYY-MM-DD format')
  ],

  // MongoDB ObjectId validation
  objectId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format')
  ],

  // Booking reference validation
  bookingReference: [
    param('ref')
      .matches(/^[A-Z]{2}\d+$/)
      .withMessage('Invalid booking reference format')
  ],

  // Query parameter validations
  queryValidation: {
    dateRange: [
      query('startDate')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('Start date must be in YYYY-MM-DD format'),
      
      query('endDate')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('End date must be in YYYY-MM-DD format')
        .custom((value, { req }) => {
          if (req.query.startDate && value) {
            if (new Date(value) < new Date(req.query.startDate)) {
              throw new Error('End date must be after start date');
            }
          }
          return true;
        }),
      
      query('status')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no-show'])
        .withMessage('Invalid status value'),
      
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
    ],

    calendar: [
      param('month')
        .isInt({ min: 1, max: 12 })
        .withMessage('Month must be between 1 and 12'),
      
      param('year')
        .isInt({ min: 2020, max: 2030 })
        .withMessage('Year must be between 2020 and 2030')
    ]
  }
};

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return respondWithError(res, 'Validation failed', 400, {
      errors: errorMessages
    });
  }
  
  next();
};

// Custom validation middleware creator
const validate = (rules) => {
  return [...rules, handleValidationErrors];
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS from string inputs
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) {
    sanitizeObject(req.body);
  }

  if (req.query) {
    sanitizeObject(req.query);
  }

  next();
};

module.exports = {
  validationRules,
  validate,
  handleValidationErrors,
  sanitizeInput
};