const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testEmailConnection() {
  try {
    console.log('Testing email connection...');
    const response = await axios.get(`${BASE_URL}/email/test-connection`);
    console.log('✅ Email connection test:', response.data);
  } catch (error) {
    console.log('❌ Email connection test failed:', error.response?.data || error.message);
  }
}

async function testSendEmail() {
  try {
    console.log('Testing send email...');
    const response = await axios.post(`${BASE_URL}/email/test-send`, {
      email: 'preethijawaiy@gmail.com'
    });
    console.log('✅ Test email sent:', response.data);
  } catch (error) {
    console.log('❌ Test email failed:', error.response?.data || error.message);
  }
}

async function testBookingWithEmail() {
  try {
    console.log('Testing booking creation with email...');
    const bookingData = {
      username: 'John Doe',
      email: 'preethijawaiy@gmail.com',
      phone: '+1234567890',
      notes: 'Test booking with email notification',
      date: '2025-09-25',
      time: '10:00'
    };

    const response = await axios.post(`${BASE_URL}/booking/simple`, bookingData);
    console.log('✅ Booking created with email:', response.data);
  } catch (error) {
    console.log('❌ Booking creation failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting email functionality tests...\n');
  
  await testEmailConnection();
  console.log('');
  
  await testSendEmail();
  console.log('');
  
  await testBookingWithEmail();
  console.log('');
  
  console.log('✅ All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEmailConnection, testSendEmail, testBookingWithEmail };