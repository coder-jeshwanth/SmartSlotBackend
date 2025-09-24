const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const config = {
  // Server Configuration
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smartslot',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expire: process.env.JWT_EXPIRE || '24h',
    refreshExpire: '7d'
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : ['http://localhost:3000'],
    credentials: true
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },
  
  // Security
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  },

  // Email Configuration
  email: {
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'preethijawaiy@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || 'asiq lbqu disk uosw'
      }
    },
    from: process.env.EMAIL_FROM || 'preethijawaiy@gmail.com',
    adminEmail: process.env.ADMIN_EMAIL || 'preethijawaiy@gmail.com'
  },

  // API Configuration
  api: {
    version: process.env.API_VERSION || 'v1',
    prefix: '/api'
  },
  
  // Business Rules
  business: {
    slotDuration: 30, // minutes
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    bookingReferencePrefix: 'SM',
    maxAdvanceBookingDays: 365
  }
};

module.exports = config;