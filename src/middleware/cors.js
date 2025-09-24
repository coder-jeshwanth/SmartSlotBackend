const config = require('../config/config');

/**
 * Custom CORS middleware with specific origin validation
 * Allows requests from whitelisted origins and requests with no origin (like Postman)
 */
const corsMiddleware = (req, res, next) => {
  const requestOrigin = req.headers.origin;
  
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!requestOrigin) {
    return next();
  }

  // Get allowed origins from config
  // This will be an array from our config that already handles the comma-separated string
  const allowedOrigins = Array.isArray(config.cors.origin) 
    ? config.cors.origin 
    : [config.cors.origin];

  // Check if the request origin is in our whitelist
  if (allowedOrigins.includes(requestOrigin)) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    return next();
  }

  // If origin is not allowed, send error
  return res.status(403).json({
    success: false,
    message: 'CORS Error: This origin is not allowed',
    error: {
      origin: requestOrigin,
      allowedOrigins
    }
  });
};

module.exports = corsMiddleware;