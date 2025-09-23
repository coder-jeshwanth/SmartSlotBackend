// Date utility functions for the SmartSlot application

const config = require('../config/config');

class DateUtils {
  /**
   * Get current date in YYYY-MM-DD format
   */
  static getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get current time in HH:MM format
   */
  static getCurrentTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  /**
   * Format date to YYYY-MM-DD
   */
  static formatDate(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toISOString().split('T')[0];
  }

  /**
   * Format time to HH:MM
   */
  static formatTime(time) {
    if (time instanceof Date) {
      return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    }
    return time;
  }

  /**
   * Check if date is in the past
   */
  static isPastDate(date) {
    const today = this.getCurrentDate();
    return date < today;
  }

  /**
   * Check if date is today
   */
  static isToday(date) {
    return date === this.getCurrentDate();
  }

  /**
   * Check if date is in the future
   */
  static isFutureDate(date) {
    const today = this.getCurrentDate();
    return date > today;
  }

  /**
   * Check if time slot is in the past for today's date
   */
  static isPastTimeSlot(date, timeSlot) {
    if (!this.isToday(date)) {
      return this.isPastDate(date);
    }

    const currentTime = this.getCurrentTime();
    return timeSlot <= currentTime;
  }

  /**
   * Get date N days from now
   */
  static getDateAfterDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return this.formatDate(date);
  }

  /**
   * Get date N days before
   */
  static getDateBeforeDays(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.formatDate(date);
  }

  /**
   * Get start and end of month
   */
  static getMonthRange(month, year) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    return { startDate, endDate };
  }

  /**
   * Get start and end of week
   */
  static getWeekRange(date = null) {
    const baseDate = date ? new Date(date) : new Date();
    const startOfWeek = new Date(baseDate);
    const endOfWeek = new Date(baseDate);

    // Get Monday as start of week
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    
    startOfWeek.setDate(diff);
    endOfWeek.setDate(diff + 6);

    return {
      startDate: this.formatDate(startOfWeek),
      endDate: this.formatDate(endOfWeek)
    };
  }

  /**
   * Generate time slots between start and end time
   */
  static generateTimeSlots(startTime, endTime, duration = 30) {
    const slots = [];
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    
    let currentMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    while (currentMinutes < endMinutes) {
      const hours = Math.floor(currentMinutes / 60);
      const minutes = currentMinutes % 60;
      
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      slots.push(timeString);
      
      currentMinutes += duration;
    }
    
    return slots;
  }

  /**
   * Check if time slot is valid (within slot intervals)
   */
  static isValidTimeSlot(timeSlot, startTime, endTime, duration = 30) {
    const slots = this.generateTimeSlots(startTime, endTime, duration);
    return slots.includes(timeSlot);
  }

  /**
   * Get next available time slot
   */
  static getNextTimeSlot(currentTime, duration = 30) {
    const [hours, minutes] = currentTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    
    // Round up to next slot interval
    const remainder = totalMinutes % duration;
    if (remainder !== 0) {
      totalMinutes += duration - remainder;
    } else {
      totalMinutes += duration;
    }
    
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }

  /**
   * Check if booking is within advance booking limit
   */
  static isWithinBookingLimit(date) {
    const maxDate = this.getDateAfterDays(config.business.maxAdvanceBookingDays);
    return date <= maxDate;
  }

  /**
   * Get business hours status for current time
   */
  static getBusinessHoursStatus() {
    const currentTime = this.getCurrentTime();
    const { start, end } = config.business.workingHours;
    
    return {
      isOpen: currentTime >= start && currentTime <= end,
      opensAt: start,
      closesAt: end,
      currentTime
    };
  }

  /**
   * Calculate duration between two times in minutes
   */
  static getTimeDuration(startTime, endTime) {
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);
    
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    
    return endMinutes - startMinutes;
  }

  /**
   * Add minutes to time
   */
  static addMinutesToTime(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + mins + minutes;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }

  /**
   * Check if time is within business hours
   */
  static isWithinBusinessHours(time) {
    const { start, end } = config.business.workingHours;
    return time >= start && time <= end;
  }

  /**
   * Get days between two dates
   */
  static getDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get day name from date
   */
  static getDayName(date) {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  }

  /**
   * Get month name from month number
   */
  static getMonthName(month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  /**
   * Format date for display (e.g., "Monday, September 23, 2025")
   */
  static formatDateForDisplay(date) {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Validate date string format (YYYY-MM-DD)
   */
  static isValidDateFormat(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }
    
    const date = new Date(dateString);
    return date.toISOString().split('T')[0] === dateString;
  }

  /**
   * Validate time string format (HH:MM)
   */
  static isValidTimeFormat(timeString) {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeString);
  }

  /**
   * Get calendar dates for a month with available status
   */
  static getMonthCalendarDates(month, year, availableDates = []) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const dates = [];

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, day).getDay();
      
      dates.push({
        date,
        day,
        dayOfWeek,
        isAvailable: availableDates.includes(date),
        isPast: this.isPastDate(date),
        isToday: this.isToday(date)
      });
    }

    return dates;
  }

  /**
   * Generate an array of dates between start and end date
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {Object} options - Options for date generation
   * @param {Array} options.excludeDays - Array of day numbers to exclude (0=Sunday, 1=Monday, etc.)
   * @param {Array} options.includeDays - Array of day numbers to include (0=Sunday, 1=Monday, etc.)
   * @param {Array} options.excludeDates - Array of specific dates to exclude in YYYY-MM-DD format
   * @returns {Array} Array of date strings in YYYY-MM-DD format
   */
  static generateDateRange(startDate, endDate, options = {}) {
    const { excludeDays = [], includeDays = null, excludeDates = [] } = options;
    const dates = [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure start date is not after end date
    if (start > end) {
      throw new Error('Start date cannot be after end date');
    }
    
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateString = this.formatDate(currentDate);
      const dayOfWeek = currentDate.getDay();
      
      // Check if we should include this date
      let shouldInclude = true;
      
      // Check includeDays filter (if specified, only include these days)
      if (includeDays && !includeDays.includes(dayOfWeek)) {
        shouldInclude = false;
      }
      
      // Check excludeDays filter
      if (excludeDays.includes(dayOfWeek)) {
        shouldInclude = false;
      }
      
      // Check excludeDates filter
      if (excludeDates.includes(dateString)) {
        shouldInclude = false;
      }
      
      // Don't include past dates
      if (this.isPastDate(dateString)) {
        shouldInclude = false;
      }
      
      if (shouldInclude) {
        dates.push(dateString);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Generate weekday dates for a given number of weeks starting from a date
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {number} weeks - Number of weeks to generate
   * @param {Array} weekdays - Array of weekday numbers (1=Monday, 2=Tuesday, etc., default: [1,2,3,4,5])
   * @returns {Array} Array of date strings in YYYY-MM-DD format
   */
  static generateWeekdayDates(startDate, weeks = 4, weekdays = [1, 2, 3, 4, 5]) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (weeks * 7));
    
    return this.generateDateRange(startDate, this.formatDate(endDate), {
      includeDays: weekdays
    });
  }

  /**
   * Generate dates for specific days of the month
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @param {Array} daysOfMonth - Array of day numbers to include (1-31)
   * @returns {Array} Array of date strings in YYYY-MM-DD format
   */
  static generateMonthlyDates(year, month, daysOfMonth = []) {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (const day of daysOfMonth) {
      if (day >= 1 && day <= daysInMonth) {
        const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        if (!this.isPastDate(date)) {
          dates.push(date);
        }
      }
    }
    
    return dates.sort();
  }
}

module.exports = DateUtils;