const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/bookingController');
const { optionalAuth } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');

// Apply optional authentication
router.use(optionalAuth);

// Create new booking
router.post('/', validate(validationRules.booking), BookingController.createBooking);

// Create simple booking
router.post('/simple', validate(validationRules.simpleBooking), BookingController.createSimpleBooking);

// Validate booking data before submission
router.post('/validate', validate(validationRules.booking), BookingController.validateBookingData);

// Get booking by reference
router.get('/:ref', validate(validationRules.bookingReference), BookingController.getBookingByReference);

// Get bookings by customer
router.get('/customer/search', BookingController.getBookingsByCustomer);

// Get customer booking statistics
router.get('/customer/stats', BookingController.getBookingStats);

// Update booking
router.put('/:ref', validate(validationRules.bookingReference), BookingController.updateBooking);

// Cancel booking
router.delete('/:ref', validate(validationRules.bookingReference), BookingController.cancelBooking);

// Reschedule booking
router.put('/:ref/reschedule', validate(validationRules.bookingReference), BookingController.rescheduleBooking);

// Check-in for booking
router.post('/:ref/checkin', validate(validationRules.bookingReference), BookingController.checkInBooking);

module.exports = router;