const mongoose = require('mongoose');

const availableDateSchema = new mongoose.Schema({
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    unique: true
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  slotDuration: {
    type: Number,
    default: 30,
    min: [15, 'Slot duration must be at least 15 minutes'],
    max: [120, 'Slot duration cannot exceed 120 minutes']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxBookings: {
    type: Number,
    default: null // null means unlimited (based on time slots)
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
availableDateSchema.index({ date: 1 });
availableDateSchema.index({ isActive: 1 });
availableDateSchema.index({ date: 1, isActive: 1 });

// Virtual to check if date is in the past
availableDateSchema.virtual('isPast').get(function() {
  const today = new Date().toISOString().split('T')[0];
  return this.date < today;
});

// Virtual to get total possible slots
availableDateSchema.virtual('totalSlots').get(function() {
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  const totalMinutes = endMinutes - startMinutes;
  return Math.floor(totalMinutes / this.slotDuration);
});

// Pre-save validation
availableDateSchema.pre('save', function(next) {
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  if (startMinutes >= endMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  if ((endMinutes - startMinutes) < this.slotDuration) {
    return next(new Error('Time range must be at least one slot duration'));
  }
  
  next();
});

// Static method to find active dates
availableDateSchema.statics.findActiveDates = function(startDate, endDate) {
  const query = { isActive: true };
  
  if (startDate) {
    query.date = { $gte: startDate };
  }
  
  if (endDate) {
    query.date = query.date || {};
    query.date.$lte = endDate;
  }
  
  return this.find(query).sort({ date: 1 });
};

// Static method to find available dates for booking (future dates only)
availableDateSchema.statics.findAvailableForBooking = function() {
  const today = new Date().toISOString().split('T')[0];
  
  return this.find({
    date: { $gte: today },
    isActive: true
  }).sort({ date: 1 });
};

// Static method to get calendar data for a month
availableDateSchema.statics.getCalendarData = async function(month, year) {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  const availableDates = await this.find({
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  }).select('date startTime endTime slotDuration');
  
  return availableDates;
};

// Instance method to generate time slots
availableDateSchema.methods.generateTimeSlots = function() {
  const slots = [];
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  
  let currentMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    slots.push(timeString);
    
    currentMinutes += this.slotDuration;
  }
  
  return slots;
};

// Instance method to validate time slot
availableDateSchema.methods.isValidTimeSlot = function(timeSlot) {
  const slots = this.generateTimeSlots();
  return slots.includes(timeSlot);
};

module.exports = mongoose.model('AvailableDate', availableDateSchema);