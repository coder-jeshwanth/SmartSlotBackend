const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');

// Public routes
router.post('/register', validate(validationRules.register), AuthController.register);
router.post('/login', validate(validationRules.login), AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// Public availability checks
router.get('/check-username', AuthController.checkUsername);
router.get('/check-email', AuthController.checkEmail);

// Protected routes
router.use(auth); // Apply auth middleware to all routes below

router.post('/logout', AuthController.logout);
router.get('/verify', AuthController.verifyToken);
router.get('/profile', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);
router.post('/change-password', AuthController.changePassword);
router.post('/deactivate', AuthController.deactivateAccount);

module.exports = router;