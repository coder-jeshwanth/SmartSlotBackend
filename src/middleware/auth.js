const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { respondWithError, respondWithSuccess } = require('../utils/responseHelper');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return respondWithError(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return respondWithError(res, 'Token is not valid. User not found.', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return respondWithError(res, 'Account is deactivated.', 401);
    }

    // Check if account is locked
    if (user.isLocked) {
      return respondWithError(res, 'Account is temporarily locked.', 423);
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return respondWithError(res, 'Invalid token.', 401);
    } else if (error.name === 'TokenExpiredError') {
      return respondWithError(res, 'Token expired.', 401);
    }
    
    console.error('Auth middleware error:', error);
    return respondWithError(res, 'Authentication failed.', 500);
  }
};

const adminAuth = async (req, res, next) => {
  try {
    // First run the basic auth middleware
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return respondWithError(res, 'Access denied. Admin privileges required.', 403);
    }

    next();
  } catch (error) {
    // If auth middleware already sent a response, don't send another
    if (!res.headersSent) {
      return respondWithError(res, 'Authentication failed.', 401);
    }
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (tokenError) {
      // Invalid or expired token, continue without user
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expire }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpire }
  );
};

const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  auth,
  adminAuth,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};