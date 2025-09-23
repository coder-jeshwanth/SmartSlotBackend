const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  time: {
    type: String,
    required: [true, 'Time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format']
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: {
    type: String,
    maxlength: [200, 'Block reason cannot exceed 200 characters']
  },
  maxCapacity: {
    type: Number,
    default: 1,
    min: [1, 'Max capacity must be at least 1']
  },
  currentBookings: {
    type: Number,
    default: 0,
    min: [0, 'Current bookings cannot be negative']
  },
  availableDateRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AvailableDate',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure uniqueness
timeSlotSchema.index({ date: 1, time: 1 }, { unique: true });
timeSlotSchema.index({ availableDateRef: 1 });
timeSlotSchema.index({ date: 1, isAvailable: 1 });

// Virtual to check if slot has available capacity
timeSlotSchema.virtual('hasCapacity').get(function() {
  return this.currentBookings < this.maxCapacity && this.isAvailable && !this.isBlocked;
});

// Virtual for remaining capacity
timeSlotSchema.virtual('remainingCapacity').get(function() {
  return Math.max(0, this.maxCapacity - this.currentBookings);
});

// Static method to find available slots for a date
timeSlotSchema.statics.findAvailableSlots = function(date) {
  return this.find({
    date,
    isAvailable: true,
    isBlocked: false,
    $expr: { $lt: ['$currentBookings', '$maxCapacity'] }
  }).sort({ time: 1 });
};

// Static method to generate slots for a date
timeSlotSchema.statics.generateSlotsForDate = async function(availableDate) {
  const slots = [];
  const timeSlots = availableDate.generateTimeSlots();
  
  for (const time of timeSlots) {
    const existingSlot = await this.findOne({
      date: availableDate.date,
      time: time
    });
    
    if (!existingSlot) {
      slots.push({
        date: availableDate.date,
        time: time,
        availableDateRef: availableDate._id,
        isAvailable: true,
        isBlocked: false,
        maxCapacity: 1,
        currentBookings: 0
      });
    }
  }
  
  if (slots.length > 0) {
    await this.insertMany(slots);
  }
  
  return this.find({ date: availableDate.date }).sort({ time: 1 });
};

// Static method to update slot booking count
timeSlotSchema.statics.updateBookingCount = async function(date, time, increment = 1) {
  return this.findOneAndUpdate(
    { date, time },
    { $inc: { currentBookings: increment } },
    { new: true }
  );
};

// Instance method to book slot
timeSlotSchema.methods.book = function() {
  if (!this.hasCapacity) {
    throw new Error('Slot is not available for booking');
  }
  
  this.currentBookings += 1;
  return this.save();
};

// Instance method to cancel booking
timeSlotSchema.methods.cancelBooking = function() {
  if (this.currentBookings > 0) {
    this.currentBookings -= 1;
  }
  return this.save();
};

// Instance method to block slot
timeSlotSchema.methods.block = function(reason = null) {
  this.isBlocked = true;
  if (reason) {
    this.blockReason = reason;
  }
  return this.save();
};

// Instance method to unblock slot
timeSlotSchema.methods.unblock = function() {
  this.isBlocked = false;
  this.blockReason = null;
  return this.save();
};

module.exports = mongoose.model('TimeSlot', timeSlotSchema);