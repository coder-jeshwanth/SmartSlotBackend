// Response helper utility for consistent API responses

class ResponseHelper {
  /**
   * Send success response
   */
  static respondWithSuccess(res, message = 'Success', data = null, statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static respondWithError(res, message = 'Error', statusCode = 400, errorDetails = null) {
    const response = {
      success: false,
      message,
      statusCode,
      timestamp: new Date().toISOString()
    };

    if (errorDetails) {
      response.error = errorDetails;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  static respondWithPagination(res, data, pagination, message = 'Success') {
    const response = {
      success: true,
      message,
      data,
      pagination: {
        currentPage: pagination.page,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        totalItems: pagination.total,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrevPage: pagination.page > 1
      },
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(response);
  }

  /**
   * Send validation error response
   */
  static respondWithValidationError(res, errors) {
    return this.respondWithError(res, 'Validation failed', 400, {
      type: 'validation_error',
      errors
    });
  }

  /**
   * Send authentication error response
   */
  static respondWithAuthError(res, message = 'Authentication failed') {
    return this.respondWithError(res, message, 401, {
      type: 'authentication_error'
    });
  }

  /**
   * Send authorization error response
   */
  static respondWithAuthorizationError(res, message = 'Access denied') {
    return this.respondWithError(res, message, 403, {
      type: 'authorization_error'
    });
  }

  /**
   * Send not found error response
   */
  static respondWithNotFound(res, resource = 'Resource') {
    return this.respondWithError(res, `${resource} not found`, 404, {
      type: 'not_found_error'
    });
  }

  /**
   * Send conflict error response
   */
  static respondWithConflict(res, message = 'Resource already exists') {
    return this.respondWithError(res, message, 409, {
      type: 'conflict_error'
    });
  }

  /**
   * Send internal server error response
   */
  static respondWithServerError(res, message = 'Internal server error') {
    return ResponseHelper.respondWithError(res, message, 500, {
      type: 'server_error'
    });
  }

  /**
   * Send rate limit error response
   */
  static respondWithRateLimit(res, message = 'Too many requests') {
    return ResponseHelper.respondWithError(res, message, 429, {
      type: 'rate_limit_error'
    });
  }

  /**
   * Send created response
   */
  static respondWithCreated(res, data, message = 'Resource created successfully') {
    return ResponseHelper.respondWithSuccess(res, message, data, 201);
  }

  /**
   * Send updated response
   */
  static respondWithUpdated(res, data, message = 'Resource updated successfully') {
    return ResponseHelper.respondWithSuccess(res, message, data, 200);
  }

  /**
   * Send deleted response
   */
  static respondWithDeleted(res, message = 'Resource deleted successfully') {
    return ResponseHelper.respondWithSuccess(res, message, null, 200);
  }

  /**
   * Send no content response
   */
  static respondWithNoContent(res) {
    return res.status(204).send();
  }

  /**
   * Format booking data for response
   */
  static formatBookingResponse(booking) {
    return {
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
      source: booking.source,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      isUpcoming: booking.isUpcoming,
      isPast: booking.isPast,
      formattedDateTime: booking.formattedDateTime
    };
  }

  /**
   * Format available date data for response
   */
  static formatAvailableDateResponse(availableDate) {
    return {
      id: availableDate._id,
      date: availableDate.date,
      startTime: availableDate.startTime,
      endTime: availableDate.endTime,
      slotDuration: availableDate.slotDuration,
      isActive: availableDate.isActive,
      notes: availableDate.notes,
      totalSlots: availableDate.totalSlots,
      isPast: availableDate.isPast,
      createdAt: availableDate.createdAt,
      updatedAt: availableDate.updatedAt
    };
  }

  /**
   * Format user data for response (excluding sensitive info)
   */
  static formatUserResponse(user) {
    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Format time slot data for response
   */
  static formatTimeSlotResponse(slot, isBooked = false) {
    return {
      time: slot.time || slot,
      available: !isBooked,
      isBooked
    };
  }

  /**
   * Format dashboard statistics
   */
  static formatDashboardStats(stats) {
    return {
      summary: {
        totalAvailableDates: stats.totalAvailableDates || 0,
        totalBookings: stats.totalBookings || 0,
        todayBookings: stats.todayBookings || 0,
        thisMonthBookings: stats.thisMonthBookings || 0,
        thisWeekBookings: stats.thisWeekBookings || 0
      },
      bookingStatus: {
        confirmed: stats.confirmedBookings || 0,
        pending: stats.pendingBookings || 0,
        cancelled: stats.cancelledBookings || 0,
        completed: stats.completedBookings || 0,
        noShow: stats.noShowBookings || 0
      },
      recentActivity: {
        recentBookings: stats.recentBookings || [],
        upcomingBookings: stats.upcomingBookings || [],
        upcomingDates: stats.upcomingDates || []
      }
    };
  }

  /**
   * Format calendar data
   */
  static formatCalendarResponse(month, year, dates, bookingCounts = {}) {
    return {
      month,
      year,
      monthName: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }),
      dates: dates.map(dateInfo => ({
        ...dateInfo,
        bookingCount: bookingCounts[dateInfo.date] || 0
      }))
    };
  }

  /**
   * Format analytics data
   */
  static formatAnalyticsResponse(analytics) {
    return {
      period: analytics.period,
      summary: analytics.summary,
      trends: analytics.trends,
      dailyStats: analytics.dailyStats,
      popularTimeSlots: analytics.popularTimeSlots,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Build query filter from request parameters
   */
  static buildQueryFilter(query) {
    const filter = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.date) {
      filter.date = query.date;
    }

    if (query.startDate && query.endDate) {
      filter.date = {
        $gte: query.startDate,
        $lte: query.endDate
      };
    } else if (query.startDate) {
      filter.date = { $gte: query.startDate };
    } else if (query.endDate) {
      filter.date = { $lte: query.endDate };
    }

    if (query.email) {
      filter['customer.email'] = query.email.toLowerCase();
    }

    if (query.phone) {
      filter['customer.phone'] = query.phone;
    }

    return filter;
  }

  /**
   * Build pagination options
   */
  static buildPaginationOptions(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    return {
      page,
      limit,
      skip,
      sort: query.sort || { createdAt: -1 }
    };
  }
}

module.exports = ResponseHelper;