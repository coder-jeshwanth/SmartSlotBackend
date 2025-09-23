const mongoose = require('mongoose');
const config = require('../config/config');

const bookingSchema = new mongoose.Schema({
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  timeSlot: {
    type: String,
    required: [true, 'Time slot is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time slot must be in HH:MM format']
  },
  customer: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: [2, 'Customer name must be at least 2 characters'],
      maxlength: [100, 'Customer name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
    default: 'confirmed'
  },
  bookingReference: {
    type: String,
    unique: true
  },
  source: {
    type: String,
    enum: ['online', 'phone', 'walk-in', 'admin'],
    default: 'online'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'not-required'],
    default: 'not-required'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentAt: Date,
  checkedInAt: Date,
  cancelledAt: Date,
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for customer bookings
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for performance
bookingSchema.index({ date: 1, timeSlot: 1 }, { unique: true });
bookingSchema.index({ bookingReference: 1 }, { unique: true });
bookingSchema.index({ 'customer.email': 1 });
bookingSchema.index({ 'customer.phone': 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ date: 1, status: 1 });
bookingSchema.index({ createdAt: -1 });

// Virtual for booking datetime
bookingSchema.virtual('dateTime').get(function() {
  return new Date(`${this.date}T${this.timeSlot}:00`);
});

// Virtual to check if booking is upcoming
bookingSchema.virtual('isUpcoming').get(function() {
  const now = new Date();
  const bookingDateTime = new Date(`${this.date}T${this.timeSlot}:00`);
  return bookingDateTime > now && ['confirmed', 'pending'].includes(this.status);
});

// Virtual to check if booking is past
bookingSchema.virtual('isPast').get(function() {
  const now = new Date();
  const bookingDateTime = new Date(`${this.date}T${this.timeSlot}:00`);
  return bookingDateTime < now;
});

// Virtual for formatted date time
bookingSchema.virtual('formattedDateTime').get(function() {
  const bookingDateTime = new Date(`${this.date}T${this.timeSlot}:00`);
  return bookingDateTime.toLocaleString();
});

// Pre-save middleware to generate booking reference
bookingSchema.pre('save', async function(next) {
  if (!this.bookingReference) {
    this.bookingReference = await this.constructor.generateBookingReference();
  }
  next();
});

// Pre-save validation for double booking
bookingSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('date') || this.isModified('timeSlot')) {
    const existingBooking = await this.constructor.findOne({
      date: this.date,
      timeSlot: this.timeSlot,
      status: { $nin: ['cancelled'] },
      _id: { $ne: this._id }
    });

    if (existingBooking) {
      return next(new Error('This time slot is already booked'));
    }
  }
  next();
});

// Static method to generate unique booking reference
bookingSchema.statics.generateBookingReference = async function() {
  const prefix = config.business.bookingReferencePrefix;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  
  let counter = 1;
  let reference;
  
  do {
    reference = `${prefix}${dateStr}${timeStr}${counter}`;
    const existing = await this.findOne({ bookingReference: reference });
    if (!existing) break;
    counter++;
  } while (counter <= 999);
  
  return reference;
};

// Static method to find bookings by date
bookingSchema.statics.findByDate = function(date, status = null) {
  const query = { date };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ timeSlot: 1 });
};

// Static method to find bookings by date range
bookingSchema.statics.findByDateRange = function(startDate, endDate, status = null) {
  const query = {
    date: { $gte: startDate, $lte: endDate }
  };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ date: 1, timeSlot: 1 });
};

// Static method to find bookings by customer
bookingSchema.statics.findByCustomer = function(email, phone = null) {
  const query = { 'customer.email': email.toLowerCase() };
  if (phone) {
    query.$or = [
      { 'customer.email': email.toLowerCase() },
      { 'customer.phone': phone }
    ];
  }
  return this.find(query).sort({ date: -1, timeSlot: -1 });
};

// Static method to get booking statistics
bookingSchema.statics.getStats = async function(startDate = null, endDate = null) {
  const matchQuery = {};
  
  if (startDate) matchQuery.date = { $gte: startDate };
  if (endDate) matchQuery.date = { ...matchQuery.date, $lte: endDate };

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        confirmedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        pendingBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        completedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        noShowBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    completedBookings: 0,
    noShowBookings: 0
  };
};

// Static method to get daily booking counts
bookingSchema.statics.getDailyStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$date',
        totalBookings: { $sum: 1 },
        confirmedBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        cancelledBookings: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Instance method to cancel booking
bookingSchema.methods.cancel = function(reason = null) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) {
    this.cancellationReason = reason;
  }
  return this.save();
};

// Instance method to confirm booking
bookingSchema.methods.confirm = function() {
  this.status = 'confirmed';
  return this.save();
};

// Instance method to mark as completed
bookingSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

// Instance method to mark as no-show
bookingSchema.methods.markNoShow = function() {
  this.status = 'no-show';
  return this.save();
};

// Instance method to check in
bookingSchema.methods.checkIn = function() {
  this.checkedInAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);