const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { validate, validationRules } = require('../middleware/validation');

// Dashboard
router.get('/dashboard', AdminController.getDashboard);
router.get('/analytics', validate(validationRules.queryValidation.dateRange), AdminController.getAnalytics);
router.get('/user-stats', AdminController.getUserStats);

// Available Dates Management
router.get('/dates', validate(validationRules.queryValidation.dateRange), AdminController.getAvailableDates);
router.get('/dates/simple', AdminController.getAvailableDatesSimple);
router.get('/dates/timings', AdminController.getAvailableDatesWithTimings);
router.post('/dates', validate(validationRules.availableDate), AdminController.createAvailableDate);
router.post('/dates/bulk', validate(validationRules.bulkAvailableDates), AdminController.createBulkAvailableDates);
router.put('/dates/:id', validate(validationRules.objectId), AdminController.updateAvailableDate);
router.delete('/dates/:id', validate(validationRules.objectId), AdminController.deleteAvailableDate);

// Bookings Management
router.get('/bookings', validate(validationRules.queryValidation.dateRange), AdminController.getAllBookings);
router.get('/bookings/dates', AdminController.getBookedDates);
router.get('/bookings/:date', validate(validationRules.dateParam), AdminController.getBookingsByDate);
router.put('/bookings/:id', [
  ...validate(validationRules.objectId),
  ...validate(validationRules.updateBookingStatus)
], AdminController.updateBookingStatus);
router.delete('/bookings/:id', validate(validationRules.objectId), AdminController.deleteBooking);

// Bulk operations
router.post('/bookings/bulk', AdminController.bulkUpdateBookings);

module.exports = router;