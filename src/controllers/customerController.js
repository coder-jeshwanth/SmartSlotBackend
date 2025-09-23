const AvailableDate = require('../models/AvailableDate');
const Booking = require('../models/Booking');
const DateUtils = require('../utils/dateUtils');
const { respondWithSuccess, respondWithError, formatAvailableDateResponse, formatTimeSlotResponse, formatCalendarResponse } = require('../utils/responseHelper');
const { asyncHandler } = require('../middleware/errorHandler');

class CustomerController {
  /**
   * Get available dates for booking
   */
  static getAvailableDates = asyncHandler(async (req, res) => {
    const { month, year, limit } = req.query;
    
    let dates;
    
    if (month && year) {
      // Get dates for specific month
      dates = await AvailableDate.getCalendarData(parseInt(month), parseInt(year));
    } else {
      // Get upcoming available dates
      const limitNum = parseInt(limit) || 30;
      dates = await AvailableDate.findAvailableForBooking().limit(limitNum);
    }

    const formattedDates = dates.map(formatAvailableDateResponse);

    respondWithSuccess(res, 'Available dates retrieved successfully', {
      dates: formattedDates,
      count: formattedDates.length
    });
  });

  /**
   * Get available time slots for a specific date
   */
  static getAvailableSlots = asyncHandler(async (req, res) => {
    const { date } = req.params;

    if (!DateUtils.isValidDateFormat(date)) {
      return respondWithError(res, 'Invalid date format. Use YYYY-MM-DD', 400);
    }

    // Check if date is in the past
    if (DateUtils.isPastDate(date)) {
      return respondWithError(res, 'Cannot book slots for past dates', 400);
    }

    // Check if date is within booking limit
    if (!DateUtils.isWithinBookingLimit(date)) {
      return respondWithError(res, 'Date is beyond the maximum advance booking period', 400);
    }

    // Find available date configuration
    const availableDate = await AvailableDate.findOne({ date, isActive: true });
    
    if (!availableDate) {
      return respondWithError(res, 'No slots available for this date', 404);
    }

    // Generate all possible time slots
    const allSlots = availableDate.generateTimeSlots();

    // Get existing bookings for this date
    const existingBookings = await Booking.find({
      date,
      status: { $nin: ['cancelled'] }
    }).select('timeSlot');

    const bookedSlots = existingBookings.map(booking => booking.timeSlot);

    // Build response with availability status
    const slots = allSlots.map(slot => ({
      time: slot,
      available: !bookedSlots.includes(slot),
      isBooked: bookedSlots.includes(slot),
      isPast: DateUtils.isToday(date) ? DateUtils.isPastTimeSlot(date, slot) : false
    }));

    // Filter out past slots for today
    const availableSlots = slots.filter(slot => 
      DateUtils.isToday(date) ? !slot.isPast : true
    );

    const responseData = {
      date,
      dayName: DateUtils.getDayName(date),
      formattedDate: DateUtils.formatDateForDisplay(date),
      businessHours: {
        start: availableDate.startTime,
        end: availableDate.endTime
      },
      slotDuration: availableDate.slotDuration,
      totalSlots: allSlots.length,
      availableSlots: availableSlots.filter(slot => slot.available).length,
      bookedSlots: bookedSlots.length,
      slots: availableSlots
    };

    respondWithSuccess(res, 'Time slots retrieved successfully', responseData);
  });

  /**
   * Get calendar view for customer
   */
  static getCalendar = asyncHandler(async (req, res) => {
    const { month, year } = req.params;

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validate month and year
    if (monthNum < 1 || monthNum > 12) {
      return respondWithError(res, 'Month must be between 1 and 12', 400);
    }

    if (yearNum < 2020 || yearNum > 2030) {
      return respondWithError(res, 'Year must be between 2020 and 2030', 400);
    }

    // Get available dates for the month
    const availableDates = await AvailableDate.getCalendarData(monthNum, yearNum);
    const availableDatesList = availableDates.map(date => date.date);

    // Get booking counts for each available date
    const { startDate, endDate } = DateUtils.getMonthRange(monthNum, yearNum);
    
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled'] }
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 }
        }
      }
    ]);

    const bookingCountsMap = bookingCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Generate calendar dates
    const calendarDates = DateUtils.getMonthCalendarDates(monthNum, yearNum, availableDatesList);

    // Add booking counts and available slots count
    const enrichedDates = await Promise.all(
      calendarDates.map(async (dateInfo) => {
        if (dateInfo.isAvailable) {
          const availableDate = availableDates.find(ad => ad.date === dateInfo.date);
          const totalSlots = availableDate ? availableDate.totalSlots : 0;
          const bookedSlots = bookingCountsMap[dateInfo.date] || 0;
          
          return {
            ...dateInfo,
            totalSlots,
            bookedSlots,
            availableSlots: totalSlots - bookedSlots,
            isFullyBooked: bookedSlots >= totalSlots
          };
        }
        return dateInfo;
      })
    );

    const calendarData = formatCalendarResponse(monthNum, yearNum, enrichedDates, bookingCountsMap);

    respondWithSuccess(res, 'Calendar data retrieved successfully', calendarData);
  });

  /**
   * Check slot availability for a specific date and time
   */
  static checkSlotAvailability = asyncHandler(async (req, res) => {
    const { date, timeSlot } = req.query;

    if (!date || !timeSlot) {
      return respondWithError(res, 'Date and timeSlot are required', 400);
    }

    if (!DateUtils.isValidDateFormat(date)) {
      return respondWithError(res, 'Invalid date format. Use YYYY-MM-DD', 400);
    }

    if (!DateUtils.isValidTimeFormat(timeSlot)) {
      return respondWithError(res, 'Invalid time format. Use HH:MM', 400);
    }

    // Check if date is in the past
    if (DateUtils.isPastDate(date)) {
      return respondWithSuccess(res, 'Slot availability checked', {
        date,
        timeSlot,
        available: false,
        reason: 'Date is in the past'
      });
    }

    // Check if time slot is in the past for today
    if (DateUtils.isPastTimeSlot(date, timeSlot)) {
      return respondWithSuccess(res, 'Slot availability checked', {
        date,
        timeSlot,
        available: false,
        reason: 'Time slot is in the past'
      });
    }

    // Check if date is available
    const availableDate = await AvailableDate.findOne({ date, isActive: true });
    
    if (!availableDate) {
      return respondWithSuccess(res, 'Slot availability checked', {
        date,
        timeSlot,
        available: false,
        reason: 'Date is not available for booking'
      });
    }

    // Check if time slot is valid for this date
    if (!availableDate.isValidTimeSlot(timeSlot)) {
      return respondWithSuccess(res, 'Slot availability checked', {
        date,
        timeSlot,
        available: false,
        reason: 'Time slot is not valid for this date'
      });
    }

    // Check if slot is already booked
    const existingBooking = await Booking.findOne({
      date,
      timeSlot,
      status: { $nin: ['cancelled'] }
    });

    const isAvailable = !existingBooking;

    respondWithSuccess(res, 'Slot availability checked', {
      date,
      timeSlot,
      available: isAvailable,
      reason: isAvailable ? null : 'Time slot is already booked',
      businessHours: {
        start: availableDate.startTime,
        end: availableDate.endTime
      }
    });
  });

  /**
   * Get next available slots
   */
  static getNextAvailableSlots = asyncHandler(async (req, res) => {
    const { count = 5, fromDate } = req.query;
    const startDate = fromDate || DateUtils.getCurrentDate();
    const endDate = DateUtils.getDateAfterDays(30); // Look ahead 30 days

    // Get available dates in the range
    const availableDates = await AvailableDate.find({
      date: { $gte: startDate, $lte: endDate },
      isActive: true
    }).sort({ date: 1 });

    const nextSlots = [];
    const maxSlots = parseInt(count);

    for (const availableDate of availableDates) {
      if (nextSlots.length >= maxSlots) break;

      // Generate time slots for this date
      const timeSlots = availableDate.generateTimeSlots();
      
      // Get existing bookings
      const bookedSlots = await Booking.find({
        date: availableDate.date,
        status: { $nin: ['cancelled'] }
      }).select('timeSlot');

      const bookedTimes = bookedSlots.map(b => b.timeSlot);

      // Find available slots
      for (const timeSlot of timeSlots) {
        if (nextSlots.length >= maxSlots) break;

        // Skip if slot is booked
        if (bookedTimes.includes(timeSlot)) continue;

        // Skip past slots for today
        if (DateUtils.isPastTimeSlot(availableDate.date, timeSlot)) continue;

        nextSlots.push({
          date: availableDate.date,
          timeSlot,
          dayName: DateUtils.getDayName(availableDate.date),
          formattedDate: DateUtils.formatDateForDisplay(availableDate.date),
          dateTime: new Date(`${availableDate.date}T${timeSlot}:00`).toISOString()
        });
      }
    }

    respondWithSuccess(res, 'Next available slots retrieved successfully', {
      slots: nextSlots,
      count: nextSlots.length,
      searchRange: {
        from: startDate,
        to: endDate
      }
    });
  });

  /**
   * Get popular time slots
   */
  static getPopularTimeSlots = asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;
    
    let dateFilter = {};
    const today = new Date();

    switch (period) {
      case 'week':
        const { startDate: weekStart, endDate: weekEnd } = DateUtils.getWeekRange();
        dateFilter = { date: { $gte: weekStart, $lte: weekEnd } };
        break;
      case 'month':
        const { startDate: monthStart, endDate: monthEnd } = DateUtils.getMonthRange(
          today.getMonth() + 1,
          today.getFullYear()
        );
        dateFilter = { date: { $gte: monthStart, $lte: monthEnd } };
        break;
      case 'all':
      default:
        dateFilter = {};
        break;
    }

    const popularSlots = await Booking.aggregate([
      { $match: { ...dateFilter, status: { $nin: ['cancelled'] } } },
      { $group: { _id: '$timeSlot', bookings: { $sum: 1 } } },
      { $sort: { bookings: -1 } },
      { $limit: 10 }
    ]);

    const formattedSlots = popularSlots.map(slot => ({
      timeSlot: slot._id,
      bookings: slot.bookings,
      popularity: 'high' // You could calculate this based on relative numbers
    }));

    respondWithSuccess(res, 'Popular time slots retrieved successfully', {
      period,
      slots: formattedSlots
    });
  });
}

module.exports = CustomerController;