// Test script to verify SmartSlot API functionality
const mongoose = require('mongoose');
const config = require('./src/config/config');

// Import models
const User = require('./src/models/User');
const AvailableDate = require('./src/models/AvailableDate');
const Booking = require('./src/models/Booking');

async function createSampleData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(config.database.uri, config.database.options);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await AvailableDate.deleteMany({});
    await Booking.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create admin user
    const admin = new User({
      username: 'admin',
      email: 'admin@smartslot.com',
      password: 'Admin123!',
      role: 'admin'
    });
    await admin.save();
    console.log('👤 Created admin user:', admin.email);

    // Create sample available dates
    const today = new Date();
    const dates = [];
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const availableDate = new AvailableDate({
        date: dateString,
        startTime: '09:00',
        endTime: '17:00',
        slotDuration: 30,
        isActive: true,
        notes: `Available slots for ${dateString}`,
        createdBy: admin._id
      });
      
      await availableDate.save();
      dates.push(availableDate);
    }
    console.log(`📅 Created ${dates.length} available dates`);

    // Create sample bookings
    const sampleBookings = [
      {
        date: dates[0].date,
        timeSlot: '10:00',
        customer: {
          name: 'John Doe',
          email: 'john.doe@email.com',
          phone: '+1234567890',
          notes: 'First time customer'
        },
        status: 'confirmed'
      },
      {
        date: dates[0].date,
        timeSlot: '14:30',
        customer: {
          name: 'Jane Smith',
          email: 'jane.smith@email.com',
          phone: '+1987654321',
          notes: 'Regular customer'
        },
        status: 'confirmed'
      },
      {
        date: dates[1].date,
        timeSlot: '11:00',
        customer: {
          name: 'Bob Johnson',
          email: 'bob.johnson@email.com',
          phone: '+1122334455',
          notes: 'Needs special assistance'
        },
        status: 'pending'
      }
    ];

    const bookings = [];
    for (const bookingData of sampleBookings) {
      const booking = new Booking(bookingData);
      // The booking reference will be generated automatically by the pre-save middleware
      await booking.save();
      bookings.push(booking);
    }
    console.log(`📋 Created ${bookings.length} sample bookings`);

    console.log('\n✅ Sample data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`👤 Admin user: ${admin.email} / Admin123!`);
    console.log(`📅 Available dates: ${dates.length}`);
    console.log(`📋 Sample bookings: ${bookings.length}`);
    console.log('\n🚀 You can now start the server with: npm run dev');

  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createSampleData();