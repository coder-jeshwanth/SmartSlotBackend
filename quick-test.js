const axios = require('axios');

async function quickTest() {
  try {
    console.log('Testing health endpoint...');
    const health = await axios.get('http://localhost:5000/health');
    console.log('Health check passed:', health.data);
    
    console.log('\nTesting admin login...');
    const login = await axios.post('http://localhost:5000/api/auth/login', {
      identifier: 'admin@smartslot.com',
      password: 'Admin123!'
    });
    console.log('Login successful:', login.data.message);
    
    console.log('\nTesting get available dates...');
    const dates = await axios.get('http://localhost:5000/api/customer/dates');
    console.log('Available dates count:', dates.data.data.count);
    
    console.log('\n✅ All basic tests passed!');
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

quickTest();