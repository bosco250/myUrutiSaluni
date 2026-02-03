const axios = require('axios');

// Test script to debug wallets endpoint
async function testWalletsEndpoint() {
  const baseURL = 'http://localhost:4000/api'; // Adjust if needed
  
  console.log('Testing wallets endpoint...');
  
  try {
    // First, try to login as admin to get a token
    console.log('1. Attempting admin login...');
    
    // You'll need to replace these with actual admin credentials
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@example.com', // Replace with actual admin email
      password: 'admin123' // Replace with actual admin password
    });
    
    const token = loginResponse.data.token || loginResponse.data.access_token;
    console.log('✓ Login successful, token received');
    
    // Test the wallets endpoint
    console.log('2. Testing wallets endpoint...');
    const walletsResponse = await axios.get(`${baseURL}/wallets`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✓ Wallets endpoint successful');
    console.log('Response data:', JSON.stringify(walletsResponse.data, null, 2));
    
  } catch (error) {
    console.error('✗ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testWalletsEndpoint();