const express = require('express');
const router = express.Router();
const CustomerController = require('../controllers/customerController');
const { optionalAuth } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');

// Apply optional authentication (allows both authenticated and anonymous access)
router.use(optionalAuth);

// Get available dates
router.get('/dates', CustomerController.getAvailableDates);

// Get available time slots for a specific date
router.get('/slots/:date', validate(validationRules.dateParam), CustomerController.getAvailableSlots);

// Get calendar data
router.get('/calendar/:month/:year', validate(validationRules.queryValidation.calendar), CustomerController.getCalendar);

// Check slot availability
router.get('/check-availability', CustomerController.checkSlotAvailability);

// Get next available slots
router.get('/next-slots', CustomerController.getNextAvailableSlots);

// Get popular time slots
router.get('/popular-slots', CustomerController.getPopularTimeSlots);

module.exports = router;