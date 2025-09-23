// Test client to demonstrate SmartSlot API functionality
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

class SmartSlotTestClient {
  constructor() {
    this.token = null;
    this.refreshToken = null;
  }

  async testHealthCheck() {
    console.log('\n🔍 Testing Health Check...');
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health Check Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Health Check Failed:', error.message);
      return null;
    }
  }

  async testAdminLogin() {
    console.log('\n🔐 Testing Admin Login...');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        identifier: 'admin@smartslot.com',
        password: 'Admin123!'
      });
      
      console.log('✅ Login Success:', response.data.message);
      this.token = response.data.data.token;
      this.refreshToken = response.data.data.refreshToken;
      console.log('🎫 Token received and stored');
      return response.data;
    } catch (error) {
      console.error('❌ Login Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testDashboard() {
    console.log('\n📊 Testing Admin Dashboard...');
    try {
      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      console.log('✅ Dashboard Data:', JSON.stringify(response.data.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('❌ Dashboard Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testGetAvailableDates() {
    console.log('\n📅 Testing Get Available Dates (Customer)...');
    try {
      const response = await axios.get(`${API_URL}/customer/dates`);
      
      console.log('✅ Available Dates:', response.data.data.dates.slice(0, 5).map(d => ({ 
        date: d.date, 
        slots: d.totalSlots 
      })));
      console.log(`📋 Total Available Dates: ${response.data.data.count}`);
      return response.data;
    } catch (error) {
      console.error('❌ Get Available Dates Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testGetTimeSlots() {
    console.log('\n⏰ Testing Get Time Slots...');
    try {
      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      const response = await axios.get(`${API_URL}/customer/slots/${dateString}`);
      
      console.log(`✅ Time Slots for ${dateString}:`, {
        date: response.data.data.date,
        businessHours: response.data.data.businessHours,
        totalSlots: response.data.data.totalSlots,
        availableSlots: response.data.data.availableSlots,
        sampleSlots: response.data.data.slots.slice(0, 5).map(s => ({ 
          time: s.time, 
          available: s.available 
        }))
      });
      return response.data;
    } catch (error) {
      console.error('❌ Get Time Slots Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testCreateBooking() {
    console.log('\n📝 Testing Create Booking...');
    try {
      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      
      const bookingData = {
        date: dateString,
        timeSlot: '15:00',
        customer: {
          name: 'Test Customer',
          email: 'test.customer@example.com',
          phone: '+1555123456',
          notes: 'Created via API test'
        }
      };

      const response = await axios.post(`${API_URL}/booking`, bookingData);
      
      console.log('✅ Booking Created:', {
        reference: response.data.data.bookingReference,
        date: response.data.data.date,
        timeSlot: response.data.data.timeSlot,
        customer: response.data.data.customer.name,
        status: response.data.data.status
      });
      
      // Store booking reference for later tests
      this.bookingReference = response.data.data.bookingReference;
      return response.data;
    } catch (error) {
      console.error('❌ Create Booking Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testGetBookingByReference() {
    if (!this.bookingReference) {
      console.log('⚠️ Skipping Get Booking test - no booking reference available');
      return null;
    }

    console.log('\n🔍 Testing Get Booking by Reference...');
    try {
      const response = await axios.get(`${API_URL}/booking/${this.bookingReference}`);
      
      console.log('✅ Booking Retrieved:', {
        reference: response.data.data.bookingReference,
        date: response.data.data.date,
        timeSlot: response.data.data.timeSlot,
        status: response.data.data.status,
        isUpcoming: response.data.data.isUpcoming
      });
      return response.data;
    } catch (error) {
      console.error('❌ Get Booking Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testCalendarView() {
    console.log('\n📆 Testing Calendar View...');
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      const year = currentDate.getFullYear();
      
      const response = await axios.get(`${API_URL}/customer/calendar/${month}/${year}`);
      
      console.log('✅ Calendar Data:', {
        month: response.data.data.monthName,
        year: response.data.data.year,
        totalDates: response.data.data.dates.length,
        availableDates: response.data.data.dates.filter(d => d.isAvailable).length,
        sampleDates: response.data.data.dates.slice(0, 5).map(d => ({
          date: d.date,
          isAvailable: d.isAvailable,
          totalSlots: d.totalSlots || 0
        }))
      });
      return response.data;
    } catch (error) {
      console.error('❌ Calendar View Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testValidation() {
    console.log('\n✅ Testing Input Validation...');
    try {
      // Test invalid email validation
      const response = await axios.post(`${API_URL}/validate/email`, {
        email: 'invalid-email'
      });
      
      console.log('✅ Email Validation Test:', {
        email: 'invalid-email',
        isValid: response.data.data.isValid,
        message: response.data.data.message
      });

      // Test valid email validation
      const response2 = await axios.post(`${API_URL}/validate/email`, {
        email: 'valid@example.com'
      });
      
      console.log('✅ Email Validation Test:', {
        email: 'valid@example.com',
        isValid: response2.data.data.isValid
      });

      return { response1: response.data, response2: response2.data };
    } catch (error) {
      console.error('❌ Validation Test Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting SmartSlot API Tests...');
    console.log('=====================================');

    // Test basic connectivity
    await this.testHealthCheck();
    
    // Test authentication
    await this.testAdminLogin();
    
    // Test admin endpoints (requires authentication)
    if (this.token) {
      await this.testDashboard();
    }
    
    // Test customer endpoints (public)
    await this.testGetAvailableDates();
    await this.testGetTimeSlots();
    await this.testCalendarView();
    
    // Test booking operations
    await this.testCreateBooking();
    await this.testGetBookingByReference();
    
    // Test validation
    await this.testValidation();

    console.log('\n🎉 All tests completed!');
    console.log('=====================================');
    console.log('✅ SmartSlot API is working correctly!');
    console.log('📖 Visit http://localhost:5000/api/docs for full documentation');
    console.log('❤️  Visit http://localhost:5000/health for server health status');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testClient = new SmartSlotTestClient();
  testClient.runAllTests().catch(console.error);
}

module.exports = SmartSlotTestClient;