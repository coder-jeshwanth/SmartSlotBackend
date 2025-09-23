const AvailableDate = require('../models/AvailableDate');
const Booking = require('../models/Booking');
const User = require('../models/User');
const DateUtils = require('../utils/dateUtils');
const ResponseHelper = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');

// Destructure for easier use
const {
  respondWithSuccess,
  respondWithError,
  respondWithCreated,
  respondWithUpdated,
  respondWithDeleted,
  respondWithPagination,
  formatDashboardStats,
  formatAvailableDateResponse,
  formatBookingResponse
} = ResponseHelper;

class AdminController {
  /**
   * Get dashboard statistics
   */
  static getDashboard = asyncHandler(async (req, res) => {
    const today = DateUtils.getCurrentDate();
    const { startDate: weekStart, endDate: weekEnd } = DateUtils.getWeekRange();
    const { startDate: monthStart, endDate: monthEnd } = DateUtils.getMonthRange(
      new Date().getMonth() + 1,
      new Date().getFullYear()
    );

    // Get various statistics
    const [
      totalAvailableDates,
      totalBookings,
      todayBookings,
      thisWeekBookings,
      thisMonthBookings,
      bookingStats,
      recentBookings,
      upcomingBookings,
      upcomingDates
    ] = await Promise.all([
      AvailableDate.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ date: today }),
      Booking.countDocuments({ date: { $gte: weekStart, $lte: weekEnd } }),
      Booking.countDocuments({ date: { $gte: monthStart, $lte: monthEnd } }),
      Booking.getStats(),
      Booking.find().sort({ createdAt: -1 }).limit(5),
      Booking.find({ 
        date: { $gte: today },
        status: { $in: ['confirmed', 'pending'] }
      }).sort({ date: 1, timeSlot: 1 }).limit(10),
      AvailableDate.findAvailableForBooking().limit(10)
    ]);

    const dashboardData = {
      totalAvailableDates,
      totalBookings,
      todayBookings,
      thisWeekBookings,
      thisMonthBookings,
      ...bookingStats,
      recentBookings: recentBookings.map(formatBookingResponse),
      upcomingBookings: upcomingBookings.map(formatBookingResponse),
      upcomingDates: upcomingDates.map(formatAvailableDateResponse)
    };

    respondWithSuccess(res, 'Dashboard data retrieved successfully', formatDashboardStats(dashboardData));
  });

  /**
   * Get all available dates
   */
  static getAvailableDates = asyncHandler(async (req, res) => {
    const { page, limit, startDate, endDate, status } = req.query;
    
    const filter = {};
    
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }

    if (status !== undefined) {
      filter.isActive = status === 'active';
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [dates, total] = await Promise.all([
      AvailableDate.find(filter)
        .populate('createdBy', 'username email')
        .sort({ date: 1 })
        .skip(skip)
        .limit(limitNum),
      AvailableDate.countDocuments(filter)
    ]);

    const formattedDates = dates.map(formatAvailableDateResponse);

    respondWithPagination(res, formattedDates, {
      page: pageNum,
      limit: limitNum,
      total
    }, 'Available dates retrieved successfully');
  });

  /**
   * Create new available date
   */
  static createAvailableDate = asyncHandler(async (req, res) => {
    const { date, startTime, endTime, slotDuration, notes } = req.body;
    const createdBy = req.user?._id || null;

    // Check if date already exists
    const existingDate = await AvailableDate.findOne({ date });
    if (existingDate) {
      return respondWithError(res, 'Please select another date to continue', 409);
    }

    // Create new available date
    const availableDate = new AvailableDate({
      date,
      startTime,
      endTime,
      slotDuration: slotDuration || 30,
      notes,
      createdBy
    });

    await availableDate.save();
    if (createdBy) {
      await availableDate.populate('createdBy', 'username email');
    }

    respondWithCreated(res, formatAvailableDateResponse(availableDate), 'Available date created successfully');
  });

  /**
   * Create multiple available dates in bulk
   */
  static createBulkAvailableDates = asyncHandler(async (req, res) => {
    const { dates, skipExisting } = req.body;
    const createdBy = req.user?._id || null;

    // Check for existing dates
    const dateStrings = dates.map(d => d.date);
    const existingDates = await AvailableDate.find({
      date: { $in: dateStrings }
    }).select('date');
    
    if (existingDates.length > 0) {
      return respondWithError(res, 'Please select another date', 409, {
        existingDates: existingDates.map(d => d.date)
      });
    }

    const results = {
      created: [],
      errors: []
    };

    // Process each date
    for (const dateConfig of dates) {
      try {
        const { date, startTime, endTime, slotDuration, notes } = dateConfig;

        // Create new available date
        const availableDate = new AvailableDate({
          date,
          startTime,
          endTime,
          slotDuration: slotDuration || 30,
          notes: notes || '',
          createdBy
        });

        await availableDate.save();
        if (createdBy) {
          await availableDate.populate('createdBy', 'username email');
        }

        results.created.push(formatAvailableDateResponse(availableDate));

      } catch (error) {
        results.errors.push({
          date: dateConfig.date,
          reason: error.message
        });
      }
    }

    const summary = {
      totalRequested: dates.length,
      created: results.created.length,
      errors: results.errors.length
    };

    const message = `Successfully created ${summary.created} dates`;

    respondWithSuccess(res, message, {
      summary,
      results
    });
  });

  /**
   * Update available date
   */
  static updateAvailableDate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { startTime, endTime, slotDuration, isActive, notes } = req.body;

    const availableDate = await AvailableDate.findById(id);
    if (!availableDate) {
      return respondWithError(res, 'Available date not found', 404);
    }

    // Check if there are existing bookings for this date before making changes
    if (startTime || endTime || slotDuration !== undefined) {
      const existingBookings = await Booking.countDocuments({
        date: availableDate.date,
        status: { $nin: ['cancelled'] }
      });

      if (existingBookings > 0) {
        return respondWithError(res, 'Cannot modify time settings when there are existing bookings', 400);
      }
    }

    // Update fields
    if (startTime) availableDate.startTime = startTime;
    if (endTime) availableDate.endTime = endTime;
    if (slotDuration !== undefined) availableDate.slotDuration = slotDuration;
    if (isActive !== undefined) availableDate.isActive = isActive;
    if (notes !== undefined) availableDate.notes = notes;

    await availableDate.save();
    await availableDate.populate('createdBy', 'username email');

    respondWithUpdated(res, formatAvailableDateResponse(availableDate), 'Available date updated successfully');
  });

  /**
   * Delete available date
   */
  static deleteAvailableDate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const availableDate = await AvailableDate.findById(id);
    if (!availableDate) {
      return respondWithError(res, 'Available date not found', 404);
    }

    // Check if there are existing bookings for this date
    const existingBookings = await Booking.countDocuments({
      date: availableDate.date,
      status: { $nin: ['cancelled'] }
    });

    if (existingBookings > 0) {
      return respondWithError(res, 'Cannot delete date with existing bookings. Cancel bookings first.', 400);
    }

    await AvailableDate.findByIdAndDelete(id);

    respondWithDeleted(res, 'Available date deleted successfully');
  });

  /**
   * Get all bookings
   */
  static getAllBookings = asyncHandler(async (req, res) => {
    const { page, limit, date, status, startDate, endDate, customer } = req.query;
    
    const filter = {};
    
    if (date) {
      filter.date = date;
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }

    if (status) {
      filter.status = status;
    }

    if (customer) {
      filter.$or = [
        { 'customer.name': { $regex: customer, $options: 'i' } },
        { 'customer.email': { $regex: customer, $options: 'i' } },
        { 'customer.phone': { $regex: customer, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('createdBy', 'username email')
        .sort({ date: -1, timeSlot: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter)
    ]);

    const formattedBookings = bookings.map(formatBookingResponse);

    respondWithPagination(res, formattedBookings, {
      page: pageNum,
      limit: limitNum,
      total
    }, 'Bookings retrieved successfully');
  });

  /**
   * Get bookings for specific date
   */
  static getBookingsByDate = asyncHandler(async (req, res) => {
    const { date } = req.params;
    const { status } = req.query;

    if (!DateUtils.isValidDateFormat(date)) {
      return respondWithError(res, 'Invalid date format. Use YYYY-MM-DD', 400);
    }

    const filter = { date };
    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate('createdBy', 'username email')
      .sort({ timeSlot: 1 });

    // Get available date info for context
    const availableDate = await AvailableDate.findOne({ date, isActive: true });

    const responseData = {
      date,
      availableDate: availableDate ? formatAvailableDateResponse(availableDate) : null,
      bookings: bookings.map(formatBookingResponse),
      summary: {
        totalBookings: bookings.length,
        confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        cancelledBookings: bookings.filter(b => b.status === 'cancelled').length
      }
    };

    respondWithSuccess(res, 'Bookings for date retrieved successfully', responseData);
  });

  /**
   * Get all booked dates (today and future only) with customer details
   */
  static getBookedDates = asyncHandler(async (req, res) => {
    const today = DateUtils.getCurrentDate();

    // Find all bookings from today onwards that are not cancelled
    const bookings = await Booking.find({
      date: { $gte: today },
      status: { $nin: ['cancelled'] }
    })
    .select('_id date timeSlot status customer')
    .sort({ date: 1, timeSlot: 1 });

    // Group bookings by date and format response with customer details
    const bookedDatesMap = new Map();

    bookings.forEach(booking => {
      const dateKey = booking.date;
      
      if (!bookedDatesMap.has(dateKey)) {
        bookedDatesMap.set(dateKey, {
          date: dateKey,
          bookings: []
        });
      }

      bookedDatesMap.get(dateKey).bookings.push({
        id: booking._id,
        timeSlot: booking.timeSlot,
        status: booking.status,
        customer: {
          name: booking.customer.name,
          email: booking.customer.email,
          phone: booking.customer.phone,
          notes: booking.customer.notes || ''
        }
      });
    });

    // Convert map to array
    const bookedDates = Array.from(bookedDatesMap.values());

    const summary = {
      totalBookedDates: bookedDates.length,
      totalBookings: bookings.length,
      fromDate: today
    };

    respondWithSuccess(res, 'Booked dates with customer details retrieved successfully', {
      summary,
      bookedDates
    });
  });

  /**
   * Get all available dates (today and future only) with just date and ID
   */
  static getAvailableDatesSimple = asyncHandler(async (req, res) => {
    const today = DateUtils.getCurrentDate();

    // Find all available dates from today onwards
    const availableDates = await AvailableDate.find({
      date: { $gte: today },
      isActive: true
    })
    .select('_id date')
    .sort({ date: 1 });

    const formattedDates = availableDates.map(date => ({
      id: date._id,
      date: date.date
    }));

    const summary = {
      totalAvailableDates: formattedDates.length,
      fromDate: today
    };

    respondWithSuccess(res, 'Slots Created At Past', {
      summary,
      availableDates: formattedDates
    });
  });

  /**
   * Get all available dates with timings (today and future only) with ID, date, and timing details including booking status
   */
  static getAvailableDatesWithTimings = asyncHandler(async (req, res) => {
    const today = DateUtils.getCurrentDate();

    // Find all available dates from today onwards
    const availableDates = await AvailableDate.find({
      date: { $gte: today },
      isActive: true
    })
    .select('_id date startTime endTime slotDuration')
    .sort({ date: 1 });

    // Get all dates to check for bookings
    const dateStrings = availableDates.map(date => date.date);

    // Find all bookings for these dates
    const bookings = await Booking.find({
      date: { $in: dateStrings },
      status: { $in: ['confirmed', 'pending'] }
    })
    .select('date timeSlot status')
    .lean();

    // Create a map of booked slots for quick lookup
    const bookedSlotsMap = new Map();
    bookings.forEach(booking => {
      const key = `${booking.date}_${booking.timeSlot}`;
      bookedSlotsMap.set(key, booking.status);
    });

    const formattedDates = availableDates.map(date => {
      // Generate all possible time slots for this date
      const timeSlots = DateUtils.generateTimeSlots(
        date.startTime,
        date.endTime,
        date.slotDuration
      );

      // Add booking status to each time slot
      const slotsWithBookingStatus = timeSlots.map(slot => {
        const slotKey = `${date.date}_${slot}`;
        const isBooked = bookedSlotsMap.has(slotKey);
        const bookingStatus = bookedSlotsMap.get(slotKey) || null;

        return {
          time: slot,
          isBooked: isBooked,
          bookingStatus: bookingStatus
        };
      });

      const bookedCount = slotsWithBookingStatus.filter(slot => slot.isBooked).length;
      const availableCount = slotsWithBookingStatus.length - bookedCount;

      return {
        id: date._id,
        date: date.date,
        startTime: date.startTime,
        endTime: date.endTime,
        slotDuration: date.slotDuration,
        timings: `${date.startTime} - ${date.endTime}`,
        totalSlots: slotsWithBookingStatus.length,
        bookedSlots: bookedCount,
        availableSlots: availableCount,
        timeSlots: slotsWithBookingStatus
      };
    });

    const summary = {
      totalAvailableDates: formattedDates.length,
      fromDate: today,
      totalBookedSlots: formattedDates.reduce((sum, date) => sum + date.bookedSlots, 0),
      totalAvailableSlots: formattedDates.reduce((sum, date) => sum + date.availableSlots, 0)
    };

    respondWithSuccess(res, 'Available dates with timings and booking status retrieved successfully', {
      summary,
      availableDates: formattedDates
    });
  });

  /**
   * Update booking status
   */
  static updateBookingStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return respondWithError(res, 'Booking not found', 404);
    }

    const oldStatus = booking.status;
    booking.status = status;

    if (status === 'cancelled' && cancellationReason) {
      booking.cancellationReason = cancellationReason;
      booking.cancelledAt = new Date();
    }

    await booking.save();

    respondWithUpdated(res, formatBookingResponse(booking), `Booking status updated from ${oldStatus} to ${status}`);
  });

  /**
   * Delete/Cancel booking
   */
  static deleteBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return respondWithError(res, 'Booking not found', 404);
    }

    // Instead of deleting, mark as cancelled for audit trail
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    if (reason) {
      booking.cancellationReason = reason;
    }

    await booking.save();

    respondWithSuccess(res, 'Booking cancelled successfully');
  });

  /**
   * Get booking analytics
   */
  static getAnalytics = asyncHandler(async (req, res) => {
    const { period = 'month', startDate, endDate } = req.query;

    let dateFilter = {};
    let periodLabel = '';

    if (startDate && endDate) {
      dateFilter = { date: { $gte: startDate, $lte: endDate } };
      periodLabel = `${startDate} to ${endDate}`;
    } else {
      const today = new Date();
      switch (period) {
        case 'week':
          const { startDate: weekStart, endDate: weekEnd } = DateUtils.getWeekRange();
          dateFilter = { date: { $gte: weekStart, $lte: weekEnd } };
          periodLabel = 'This Week';
          break;
        case 'month':
          const { startDate: monthStart, endDate: monthEnd } = DateUtils.getMonthRange(
            today.getMonth() + 1,
            today.getFullYear()
          );
          dateFilter = { date: { $gte: monthStart, $lte: monthEnd } };
          periodLabel = 'This Month';
          break;
        case 'year':
          dateFilter = { date: { $gte: `${today.getFullYear()}-01-01`, $lte: `${today.getFullYear()}-12-31` } };
          periodLabel = 'This Year';
          break;
        default:
          dateFilter = {};
          periodLabel = 'All Time';
      }
    }

    const [
      bookingStats,
      dailyStats,
      timeSlotStats,
      statusStats
    ] = await Promise.all([
      Booking.getStats(dateFilter.date?.$gte, dateFilter.date?.$lte),
      Booking.getDailyStats(dateFilter.date?.$gte || '2020-01-01', dateFilter.date?.$lte || '2030-12-31'),
      Booking.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$timeSlot', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Booking.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const analytics = {
      period: periodLabel,
      summary: bookingStats,
      trends: {
        daily: dailyStats
      },
      popularTimeSlots: timeSlotStats.map(slot => ({
        timeSlot: slot._id,
        bookings: slot.count
      })),
      statusDistribution: statusStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    respondWithSuccess(res, 'Analytics data retrieved successfully', analytics);
  });

  /**
   * Get user statistics
   */
  static getUserStats = asyncHandler(async (req, res) => {
    const userStats = await User.getStats();
    respondWithSuccess(res, 'User statistics retrieved successfully', userStats);
  });

  /**
   * Bulk operations for bookings
   */
  static bulkUpdateBookings = asyncHandler(async (req, res) => {
    const { bookingIds, action, status, reason } = req.body;

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return respondWithError(res, 'Booking IDs array is required', 400);
    }

    if (!action || !['update_status', 'cancel'].includes(action)) {
      return respondWithError(res, 'Invalid action. Use "update_status" or "cancel"', 400);
    }

    const updateData = {};
    
    if (action === 'update_status' && status) {
      updateData.status = status;
      if (status === 'cancelled') {
        updateData.cancelledAt = new Date();
        if (reason) updateData.cancellationReason = reason;
      }
    } else if (action === 'cancel') {
      updateData.status = 'cancelled';
      updateData.cancelledAt = new Date();
      if (reason) updateData.cancellationReason = reason;
    }

    const result = await Booking.updateMany(
      { _id: { $in: bookingIds } },
      updateData
    );

    respondWithSuccess(res, `Bulk operation completed. ${result.modifiedCount} bookings updated.`, {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  });
}

module.exports = AdminController;