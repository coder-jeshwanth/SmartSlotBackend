const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { respondWithSuccess, respondWithError, respondWithCreated } = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
  /**
   * Register new admin user
   */
  static register = asyncHandler(async (req, res) => {
    const { username, email, password, role = 'admin' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return respondWithError(res, 'User with this email or username already exists', 409);
    }

    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      role
    });

    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    respondWithCreated(res, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token,
      refreshToken
    }, 'User registered successfully');
  });

  /**
   * Login user
   */
  static login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier);

    if (!user) {
      return respondWithError(res, 'Invalid credentials', 401);
    }

    // Check if account is locked
    if (user.isLocked) {
      return respondWithError(res, 'Account is temporarily locked due to too many failed login attempts', 423);
    }

    // Check if account is active
    if (!user.isActive) {
      return respondWithError(res, 'Account is deactivated', 401);
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      // Increment failed login attempts
      await user.incLoginAttempts();
      return respondWithError(res, 'Invalid credentials', 401);
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    respondWithSuccess(res, 'Login successful', {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      },
      token,
      refreshToken
    });
  });

  /**
   * Logout user
   */
  static logout = asyncHandler(async (req, res) => {
    // In a real-world application, you might want to:
    // 1. Add the token to a blacklist
    // 2. Clear refresh tokens from database
    // 3. Log the logout event

    respondWithSuccess(res, 'Logout successful');
  });

  /**
   * Verify JWT token
   */
  static verifyToken = asyncHandler(async (req, res) => {
    // User is already attached to req by auth middleware
    const user = req.user;

    respondWithSuccess(res, 'Token is valid', {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  });

  /**
   * Refresh JWT token
   */
  static refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return respondWithError(res, 'Refresh token is required', 400);
    }

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Find user
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return respondWithError(res, 'User not found', 404);
      }

      if (!user.isActive) {
        return respondWithError(res, 'Account is deactivated', 401);
      }

      if (user.isLocked) {
        return respondWithError(res, 'Account is locked', 423);
      }

      // Generate new tokens
      const newToken = generateToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      respondWithSuccess(res, 'Token refreshed successfully', {
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      return respondWithError(res, 'Invalid refresh token', 401);
    }
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return respondWithError(res, 'Current password and new password are required', 400);
    }

    // Find user with password
    const user = await User.findById(userId).select('+password');

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);

    if (!isValidPassword) {
      return respondWithError(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    respondWithSuccess(res, 'Password changed successfully');
  });

  /**
   * Update profile
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const { username, email } = req.body;
    const userId = req.user._id;

    const updateData = {};
    
    if (username) {
      // Check if username is already taken by another user
      const existingUser = await User.findOne({
        username,
        _id: { $ne: userId }
      });

      if (existingUser) {
        return respondWithError(res, 'Username is already taken', 409);
      }

      updateData.username = username;
    }

    if (email) {
      const normalizedEmail = email.toLowerCase();
      
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId }
      });

      if (existingUser) {
        return respondWithError(res, 'Email is already registered', 409);
      }

      updateData.email = normalizedEmail;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    respondWithSuccess(res, 'Profile updated successfully', {
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  });

  /**
   * Get current user profile
   */
  static getProfile = asyncHandler(async (req, res) => {
    const user = req.user;

    respondWithSuccess(res, 'Profile retrieved successfully', {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  });

  /**
   * Deactivate account
   */
  static deactivateAccount = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, { isActive: false });

    respondWithSuccess(res, 'Account deactivated successfully');
  });

  /**
   * Check if username is available
   */
  static checkUsername = asyncHandler(async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return respondWithError(res, 'Username is required', 400);
    }

    const existingUser = await User.findOne({ username });

    respondWithSuccess(res, 'Username availability checked', {
      username,
      available: !existingUser
    });
  });

  /**
   * Check if email is available
   */
  static checkEmail = asyncHandler(async (req, res) => {
    const { email } = req.query;

    if (!email) {
      return respondWithError(res, 'Email is required', 400);
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    respondWithSuccess(res, 'Email availability checked', {
      email: normalizedEmail,
      available: !existingUser
    });
  });
}

module.exports = AuthController;