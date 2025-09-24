const express = require('express');
const emailService = require('../utils/emailService');
const { respondWithSuccess, respondWithError } = require('../utils/responseHelper');

const router = express.Router();

/**
 * Test email connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const isConnected = await emailService.testConnection();
    if (isConnected) {
      respondWithSuccess(res, 'Email service connection successful');
    } else {
      respondWithError(res, 'Email service connection failed', 500);
    }
  } catch (error) {
    respondWithError(res, 'Email service connection error', 500, { error: error.message });
  }
});

/**
 * Send test email
 */
router.post('/test-send', async (req, res) => {
  try {
    const { email = 'preethijawaiy@gmail.com' } = req.body;
    
    // Create a test booking object
    const testBooking = {
      bookingReference: 'TEST' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      timeSlot: '10:00',
      status: 'confirmed',
      createdAt: new Date(),
      customer: {
        name: 'Test User',
        email: email,
        phone: '+1234567890',
        notes: 'This is a test booking'
      }
    };

    await emailService.sendBookingEmails(testBooking);
    respondWithSuccess(res, 'Test emails sent successfully');
  } catch (error) {
    respondWithError(res, 'Failed to send test emails', 500, { error: error.message });
  }
});

module.exports = router;