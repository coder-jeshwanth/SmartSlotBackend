const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testBookingWithEmail() {
  try {
    console.log('Testing booking creation with email...');
    
    const bookingData = {
      username: 'Test Customer',
      email: 'preethijawaiy@gmail.com', // Using the same email to test reception
      phone: '+1234567890',
      notes: 'Test booking for email functionality',
      date: '2025-09-25', // Tomorrow
      time: '10:00'
    };

    console.log('Booking data:', JSON.stringify(bookingData, null, 2));

    const response = await axios.post(`${BASE_URL}/booking/simple`, bookingData);
    console.log('✅ Booking created successfully!');
    console.log('Booking response:', JSON.stringify(response.data, null, 2));
    
    console.log('\n📧 Check your email (preethijawaiy@gmail.com) for:');
    console.log('1. Customer confirmation email');
    console.log('2. Admin notification email');
    
  } catch (error) {
    console.log('❌ Booking creation failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received. Is the server running?');
      console.log('Request error:', error.message);
    } else {
      console.log('Error:', error.message);
    }
    console.log('Full error:', error);
  }
}

testBookingWithEmail();