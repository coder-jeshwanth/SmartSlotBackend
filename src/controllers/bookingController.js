const Booking = require('../models/Booking');
const AvailableDate = require('../models/AvailableDate');
const DateUtils = require('../utils/dateUtils');
const Validators = require('../utils/validators');
const { respondWithSuccess, respondWithError, respondWithCreated, respondWithUpdated, formatBookingResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');

class BookingController {
  /**
   * Create new booking
   */
  static createBooking = asyncHandler(async (req, res) => {
    const { date, timeSlot, customer } = req.body;

    // Validate customer data
    const customerValidation = Validators.validateCustomer(customer);
    if (!customerValidation.isValid) {
      return respondWithError(res, 'Customer validation failed', 400, {
        errors: customerValidation.errors
      });
    }

    // Check if date is in the past
    if (DateUtils.isPastDate(date)) {
      return respondWithError(res, 'Cannot book dates in the past', 400);
    }

    // Check if time slot is in the past for today
    if (DateUtils.isPastTimeSlot(date, timeSlot)) {
      return respondWithError(res, 'Cannot book past time slots', 400);
    }

    // Check if date is within booking limit
    if (!DateUtils.isWithinBookingLimit(date)) {
      return respondWithError(res, 'Date is beyond the maximum advance booking period', 400);
    }

    // Check if date is available
    const availableDate = await AvailableDate.findOne({ date, isActive: true });
    if (!availableDate) {
      return respondWithError(res, 'Selected date is not available for booking', 400);
    }

    // Validate time slot for this date
    if (!availableDate.isValidTimeSlot(timeSlot)) {
      return respondWithError(res, 'Invalid time slot for the selected date', 400);
    }

    // Check if slot is already booked
    const existingBooking = await Booking.findOne({
      date,
      timeSlot,
      status: { $nin: ['cancelled'] }
    });

    if (existingBooking) {
      return respondWithError(res, 'This time slot is already booked', 409);
    }

    // Create booking
    const booking = new Booking({
      date,
      timeSlot,
      customer: customerValidation.customer,
      status: 'confirmed',
      source: 'online',
      createdBy: req.user ? req.user._id : null
    });

    await booking.save();

    respondWithCreated(res, formatBookingResponse(booking), 'Booking created successfully');
  });

  /**
   * Get booking by reference
   */
  static getBookingByReference = asyncHandler(async (req, res) => {
    const { ref } = req.params;

    const booking = await Booking.findOne({ bookingReference: ref });
    if (!booking) {
      return respondWithError(res, 'Booking not found', 404);
    }

    respondWithSuccess(res, 'Booking retrieved successfully', formatBookingResponse(booking));
  });

  /**
   * Get bookings by customer email or phone
   */
  static getBookingsByCustomer = asyncHandler(async (req, res) => {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return respondWithError(res, 'Email or phone number is required', 400);
    }

    let query = {};
    if (email) {
      query['customer.email'] = email.toLowerCase();
    }
    if (phone) {
      query['customer.phone'] = phone;
    }

    // If both provided, use OR query
    if (email && phone) {
      query = {
        $or: [
          { 'customer.email': email.toLowerCase() },
          { 'customer.phone': phone }
        ]
      };
    }

    const bookings = await Booking.find(query)
      .sort({ date: -1, timeSlot: -1 });

    const formattedBookings = bookings.map(formatBookingResponse);

    respondWithSuccess(res, 'Customer bookings retrieved successfully', {
      bookings: formattedBookings,
      count: formattedBookings.length
    });
  });

  /**
   * Update booking (customer can update their own booking)
   */
  static updateBooking = asyncHandler(async (req, res) => {
    const { ref } = req.params;
    const { customer, notes } = req.body;

    const booking = await Booking.findOne({ bookingReference: ref });
    if (!booking) {
      return respondWithError(res, 'Booking not found', 404);
    }

    // Check if booking can be modified
    if (booking.status === 'cancelled') {
      return respondWithError(res, 'Cannot modify cancelled booking', 400);
    }

    if (booking.status === 'completed') {
      return respondWithError(res, 'Cannot modify completed booking', 400);
    }

    // Check if booking is in the past
    if (DateUtils.isPastTimeSlot(booking.date, booking.timeSlot)) {
      return respondWithError(res, 'Cannot modify past bookings', 400);
    }

    // Update customer information if provided
    if (customer) {
      const customerValidation = Validators.validateCustomer(customer);
      if (!customerValidation.isValid) {
        return respondWithError(res, 'Customer validation failed', 400, {
          errors: customerValidation.errors
        });
      }
      booking.customer = { ...booking.customer, ...customerValidation.customer };
    }

    // Update notes if provided
    if (notes !== undefined) {
      const notesValidation = Validators.validateNotes(notes);
      if (!notesValidation.isValid) {
        return respondWithError(res, notesValidation.message, 400);
      }
      booking.customer.notes = notesValidation.notes;
    }

    await booking.save();

    respondWithUpdated(res, formatBookingResponse(booking), 'Booking updated successfully');
  });

  /**
   * Cancel booking (customer can cancel their own booking)
   */
  static cancelBooking = asyncHandler(async (req, res) => {
    const { ref } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({ bookingReference: ref });
    if (!booking) {
      return respondWithError(res, 'Booking not found', 404);
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return respondWithError(res, 'Booking is already cancelled', 400);
    }

    // Check if booking is completed
    if (booking.status === 'completed') {
      return respondWithError(res, 'Cannot cancel completed booking', 400);
    }

    // Check cancellation policy (e.g., can't cancel within 2 hours)
    const bookingDateTime = new Date(`${booking.date}T${booking.timeSlot}:00`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilBooking < 2 && hoursUntilBooking > 0) {
      return respondWithError(res, 'Cannot cancel booking within 2 hours of appointment time', 400);
    }

    // Cancel booking
    await booking.cancel(reason);

    respondWithSuccess(res, 'Booking cancelled successfully', formatBookingResponse(booking));
  });

  /**
   * Reschedule booking
   */
  static rescheduleBooking = asyncHandler(async (req, res) => {
    const { ref } = req.params;
    const { newDate, newTimeSlot, reason } = req.body;

    const booking = await Booking.findOne({ bookingReference: ref });
    if (!booking) {
      return respondWithError(res, 'Booking not found', 404);
    }

    // Check if booking can be rescheduled
    if (booking.status === 'cancelled') {
      return respondWithError(res, 'Cannot reschedule cancelled booking', 400);
    }

    if (booking.status === 'completed') {
      return respondWithError(res, 'Cannot reschedule completed booking', 400);
    }

    // Validate new date and time
    if (DateUtils.isPastDate(newDate)) {
      return respondWithError(res, 'Cannot reschedule to a past date', 400);
    }

    if (DateUtils.isPastTimeSlot(newDate, newTimeSlot)) {
      return respondWithError(res, 'Cannot reschedule to a past time slot', 400);
    }

    // Check if new slot is available
    const newAvailableDate = await AvailableDate.findOne({ date: newDate, isActive: true });
    if (!newAvailableDate) {
      return respondWithError(res, 'New date is not available for booking', 400);
    }

    if (!newAvailableDate.isValidTimeSlot(newTimeSlot)) {
      return respondWithError(res, 'Invalid time slot for the new date', 400);
    }

    // Check if new slot is already booked
    const conflictingBooking = await Booking.findOne({
      date: newDate,
      timeSlot: newTimeSlot,
      status: { $nin: ['cancelled'] },
      _id: { $ne: booking._id }
    });

    if (conflictingBooking) {
      return respondWithError(res, 'New time slot is already booked', 409);
    }

    // Update booking
    const oldDate = booking.date;
    const oldTimeSlot = booking.timeSlot;

    booking.date = newDate;
    booking.timeSlot = newTimeSlot;
    
    if (reason) {
      booking.customer.notes = booking.customer.notes 
        ? `${booking.customer.notes}\n\nRescheduled from ${oldDate} ${oldTimeSlot}: ${reason}`
        : `Rescheduled from ${oldDate} ${oldTimeSlot}: ${reason}`;
    }

    await booking.save();

    respondWithUpdated(res, formatBookingResponse(booking), 
      `Booking rescheduled from ${oldDate} ${oldTimeSlot} to ${newDate} ${newTimeSlot}`);
  });

  /**
   * Check-in for booking
   */
  static checkInBooking = asyncHandler(async (req, res) => {
    const { ref } = req.params;

    const booking = await Booking.findOne({ bookingReference: ref });
    if (!booking) {
      return respondWithError(res, 'Booking not found', 404);
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return respondWithError(res, 'Only confirmed bookings can be checked in', 400);
    }

    // Check if booking is for today
    const today = DateUtils.getCurrentDate();
    if (booking.date !== today) {
      return respondWithError(res, 'Can only check in for today\'s bookings', 400);
    }

    // Check if it's close to booking time (within 30 minutes before or after)
    const currentTime = DateUtils.getCurrentTime();
    const bookingTime = booking.timeSlot;
    
    const currentMinutes = currentTime.split(':').reduce((acc, time) => acc * 60 + parseInt(time), 0);
    const bookingMinutes = bookingTime.split(':').reduce((acc, time) => acc * 60 + parseInt(time), 0);
    
    const timeDifference = Math.abs(currentMinutes - bookingMinutes);
    
    if (timeDifference > 30) {
      return respondWithError(res, 'Can only check in within 30 minutes of booking time', 400);
    }

    // Check in
    await booking.checkIn();

    respondWithSuccess(res, 'Checked in successfully', formatBookingResponse(booking));
  });

  /**
   * Get booking statistics for customer
   */
  static getBookingStats = asyncHandler(async (req, res) => {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return respondWithError(res, 'Email or phone number is required', 400);
    }

    let query = {};
    if (email && phone) {
      query = {
        $or: [
          { 'customer.email': email.toLowerCase() },
          { 'customer.phone': phone }
        ]
      };
    } else if (email) {
      query['customer.email'] = email.toLowerCase();
    } else {
      query['customer.phone'] = phone;
    }

    const stats = await Booking.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          upcomingBookings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$date', DateUtils.getCurrentDate()] },
                    { $in: ['$status', ['confirmed', 'pending']] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const bookingStats = stats[0] || {
      totalBookings: 0,
      confirmedBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      upcomingBookings: 0
    };

    respondWithSuccess(res, 'Booking statistics retrieved successfully', bookingStats);
  });

  /**
   * Validate booking data before submission
   */
  static validateBookingData = asyncHandler(async (req, res) => {
    const { date, timeSlot, customer } = req.body;

    const errors = [];

    // Validate date
    if (!DateUtils.isValidDateFormat(date)) {
      errors.push({ field: 'date', message: 'Invalid date format. Use YYYY-MM-DD' });
    } else {
      if (DateUtils.isPastDate(date)) {
        errors.push({ field: 'date', message: 'Cannot book dates in the past' });
      }
      if (!DateUtils.isWithinBookingLimit(date)) {
        errors.push({ field: 'date', message: 'Date is beyond the maximum advance booking period' });
      }
    }

    // Validate time slot
    if (!DateUtils.isValidTimeFormat(timeSlot)) {
      errors.push({ field: 'timeSlot', message: 'Invalid time format. Use HH:MM' });
    } else if (DateUtils.isPastTimeSlot(date, timeSlot)) {
      errors.push({ field: 'timeSlot', message: 'Cannot book past time slots' });
    }

    // Validate customer
    if (customer) {
      const customerValidation = Validators.validateCustomer(customer);
      if (!customerValidation.isValid) {
        errors.push(...customerValidation.errors);
      }
    }

    // Check availability if no basic validation errors
    if (errors.length === 0) {
      const availableDate = await AvailableDate.findOne({ date, isActive: true });
      if (!availableDate) {
        errors.push({ field: 'date', message: 'Selected date is not available for booking' });
      } else {
        if (!availableDate.isValidTimeSlot(timeSlot)) {
          errors.push({ field: 'timeSlot', message: 'Invalid time slot for the selected date' });
        }

        const existingBooking = await Booking.findOne({
          date,
          timeSlot,
          status: { $nin: ['cancelled'] }
        });

        if (existingBooking) {
          errors.push({ field: 'timeSlot', message: 'This time slot is already booked' });
        }
      }
    }

    const isValid = errors.length === 0;

    respondWithSuccess(res, 'Booking validation completed', {
      isValid,
      errors: isValid ? [] : errors
    });
  });

  /**
   * Create simple booking with basic details
   */
  static createSimpleBooking = asyncHandler(async (req, res) => {
    const { username, email, phone, notes, date, time } = req.body;

    // Basic validation
    if (!username || !email || !phone || !date || !time) {
      return respondWithError(res, 'Username, email, phone, date, and time are required', 400);
    }

    // Validate email format
    const emailValidation = Validators.validateEmail(email);
    if (!emailValidation.isValid) {
      return respondWithError(res, 'Invalid email format', 400);
    }

    // Validate phone format
    const phoneValidation = Validators.validatePhone(phone);
    if (!phoneValidation.isValid) {
      return respondWithError(res, 'Invalid phone number format', 400);
    }

    // Validate date format (YYYY-MM-DD)
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return respondWithError(res, 'Date must be in YYYY-MM-DD format', 400);
    }

    // Validate time format (HH:MM)
    if (!time.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      return respondWithError(res, 'Time must be in HH:MM format', 400);
    }

    // Check if date is in the past
    if (DateUtils.isPastDate(date)) {
      return respondWithError(res, 'Cannot book dates in the past', 400);
    }

    // Check if time slot is in the past for today
    if (DateUtils.isPastTimeSlot(date, time)) {
      return respondWithError(res, 'Cannot book past time slots', 400);
    }

    // Check if date is within booking limit
    if (!DateUtils.isWithinBookingLimit(date)) {
      return respondWithError(res, 'Date is beyond the maximum advance booking period', 400);
    }

    // Check if date is available
    const availableDate = await AvailableDate.findOne({ date, isActive: true });
    if (!availableDate) {
      return respondWithError(res, 'Selected date is not available for booking', 400);
    }

    // Validate time slot for this date
    if (!availableDate.isValidTimeSlot(time)) {
      return respondWithError(res, 'Invalid time slot for the selected date', 400);
    }

    // Check if slot is already booked
    const existingBooking = await Booking.findOne({
      date,
      timeSlot: time,
      status: { $nin: ['cancelled'] }
    });

    if (existingBooking) {
      return respondWithError(res, 'This time slot is already booked', 409);
    }

    // Create booking with simple structure
    const booking = new Booking({
      date,
      timeSlot: time,
      customer: {
        name: username.trim(),
        email: emailValidation.email,
        phone: phoneValidation.phone,
        notes: notes ? notes.trim() : ''
      },
      status: 'confirmed',
      source: 'admin',
      paymentStatus: 'not-required'
    });

    await booking.save();

    // Format response
    const response = {
      id: booking._id,
      bookingReference: booking.bookingReference,
      date: booking.date,
      timeSlot: booking.timeSlot,
      customer: {
        name: booking.customer.name,
        email: booking.customer.email,
        phone: booking.customer.phone,
        notes: booking.customer.notes
      },
      status: booking.status,
      createdAt: booking.createdAt
    };

    respondWithCreated(res, response, 'Booking created successfully');
  });
}

module.exports = BookingController;