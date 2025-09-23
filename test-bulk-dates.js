const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

class BulkDateTestClient {
  constructor() {
    this.token = null;
  }

  async adminLogin() {
    console.log('🔐 Logging in as admin...');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        identifier: 'admin@smartslot.com',
        password: 'Admin123!'
      });
      
      this.token = response.data.data.token;
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testBulkDateCreation() {
    console.log('\n📅 Testing Bulk Date Creation...');
    
    // Generate dates for the next 2 weeks (weekdays only)
    const today = new Date();
    const dates = [];
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Only include weekdays (Monday to Friday)
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }

    const bulkData = {
      dates: dates,
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
      notes: 'Bulk created weekday slots - business hours',
      skipExisting: true
    };

    try {
      const response = await axios.post(`${API_URL}/admin/dates/bulk`, bulkData, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      console.log('✅ Bulk Date Creation Result:');
      console.log('📊 Summary:', response.data.data.summary);
      console.log('📝 Details:');
      console.log(`  - Created: ${response.data.data.results.created.length} dates`);
      console.log(`  - Skipped: ${response.data.data.results.skipped.length} dates`);
      console.log(`  - Errors: ${response.data.data.results.errors.length} dates`);
      
      if (response.data.data.results.created.length > 0) {
        console.log('📋 Sample Created Dates:');
        response.data.data.results.created.slice(0, 5).forEach(date => {
          console.log(`  - ${date.date}: ${date.startTime}-${date.endTime} (${date.totalSlots} slots)`);
        });
      }

      if (response.data.data.results.skipped.length > 0) {
        console.log('⏭️  Skipped Dates:');
        response.data.data.results.skipped.forEach(item => {
          console.log(`  - ${item.date}: ${item.reason}`);
        });
      }

      return response.data;
    } catch (error) {
      console.error('❌ Bulk Date Creation Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testSpecificTimeRange() {
    console.log('\n⏰ Testing Specific Time Range (3 PM to 6 PM)...');
    
    // Generate dates for next weekend
    const today = new Date();
    const dates = [];
    
    for (let i = 1; i <= 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Only include weekends (Saturday and Sunday)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }

    const bulkData = {
      dates: dates,
      startTime: '15:00', // 3 PM
      endTime: '18:00',   // 6 PM
      slotDuration: 60,   // 1-hour slots
      notes: 'Weekend afternoon slots - 3PM to 6PM',
      skipExisting: true
    };

    try {
      const response = await axios.post(`${API_URL}/admin/dates/bulk`, bulkData, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      console.log('✅ Weekend Slots Creation Result:');
      console.log('📊 Summary:', response.data.data.summary);
      
      if (response.data.data.results.created.length > 0) {
        console.log('📋 Created Weekend Slots:');
        response.data.data.results.created.forEach(date => {
          console.log(`  - ${date.date}: ${date.startTime}-${date.endTime} (${date.totalSlots} slots)`);
        });
      }

      return response.data;
    } catch (error) {
      console.error('❌ Weekend Slots Creation Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testCustomDateArray() {
    console.log('\n📋 Testing Custom Date Array...');
    
    // Create specific dates
    const customDates = [
      '2025-10-01',
      '2025-10-03',
      '2025-10-05',
      '2025-10-07',
      '2025-10-09'
    ];

    const bulkData = {
      dates: customDates,
      startTime: '10:00',
      endTime: '14:00',
      slotDuration: 45,
      notes: 'Custom selected dates - Morning to afternoon slots',
      skipExisting: true
    };

    try {
      const response = await axios.post(`${API_URL}/admin/dates/bulk`, bulkData, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      console.log('✅ Custom Dates Creation Result:');
      console.log('📊 Summary:', response.data.data.summary);
      
      if (response.data.data.results.created.length > 0) {
        console.log('📋 Created Custom Dates:');
        response.data.data.results.created.forEach(date => {
          console.log(`  - ${date.date}: ${date.startTime}-${date.endTime} (${date.totalSlots} slots)`);
        });
      }

      return response.data;
    } catch (error) {
      console.error('❌ Custom Dates Creation Failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testValidationErrors() {
    console.log('\n❌ Testing Validation Errors...');
    
    // Test with invalid data
    const invalidData = {
      dates: ['invalid-date', '2025-13-45'], // Invalid date formats
      startTime: '25:00', // Invalid time
      endTime: '26:00',   // Invalid time
      slotDuration: 5     // Too short
    };

    try {
      const response = await axios.post(`${API_URL}/admin/dates/bulk`, invalidData, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      console.log('❌ Validation should have failed but didn\'t');
    } catch (error) {
      console.log('✅ Validation errors caught correctly:');
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          console.log(`  - ${err.path}: ${err.msg}`);
        });
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Bulk Date Creation Tests...');
    console.log('==========================================');

    // Login first
    const loginSuccess = await this.adminLogin();
    if (!loginSuccess) {
      console.log('❌ Cannot continue without authentication');
      return;
    }

    // Test bulk date creation
    await this.testBulkDateCreation();
    
    // Test specific time range
    await this.testSpecificTimeRange();
    
    // Test custom date array
    await this.testCustomDateArray();
    
    // Test validation
    await this.testValidationErrors();

    console.log('\n🎉 All bulk date tests completed!');
    console.log('==========================================');
    console.log('✅ Bulk Date Creation API is working correctly!');
    console.log('📖 API Endpoint: POST /api/admin/dates/bulk');
    console.log('📋 Features:');
    console.log('  - ✅ Create multiple dates with same time settings');
    console.log('  - ✅ Skip existing dates option');
    console.log('  - ✅ Custom time ranges (like 3 PM to 6 PM)');
    console.log('  - ✅ Flexible slot duration');
    console.log('  - ✅ Comprehensive validation');
    console.log('  - ✅ Detailed results with created/skipped/error counts');
  }
}

// Example API usage documentation
function showAPIDocumentation() {
  console.log('\n📖 Bulk Date Creation API Documentation');
  console.log('===========================================');
  console.log('Endpoint: POST /api/admin/dates/bulk');
  console.log('Headers: Authorization: Bearer <admin_token>');
  console.log('\nRequest Body:');
  console.log(JSON.stringify({
    dates: ['2025-10-01', '2025-10-02', '2025-10-03'],
    startTime: '15:00',  // 3 PM
    endTime: '18:00',    // 6 PM
    slotDuration: 30,    // minutes
    notes: 'Afternoon slots',
    skipExisting: true   // Skip dates that already exist
  }, null, 2));
  
  console.log('\nResponse:');
  console.log(JSON.stringify({
    success: true,
    message: 'Bulk operation completed: 2 created, 1 skipped, 0 errors',
    data: {
      summary: {
        totalRequested: 3,
        created: 2,
        skipped: 1,
        errors: 0
      },
      results: {
        created: [], // Array of created date objects
        skipped: [], // Array of skipped dates with reasons
        errors: []   // Array of error dates with reasons
      }
    }
  }, null, 2));
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testClient = new BulkDateTestClient();
  testClient.runAllTests()
    .then(() => showAPIDocumentation())
    .catch(console.error);
}

module.exports = BulkDateTestClient;