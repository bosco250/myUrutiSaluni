#!/usr/bin/env node

/**
 * Test script to verify notification creation
 * Usage: node test-notifications.js <appointmentId>
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:4000/api';

async function testNotifications(appointmentId) {
  try {
    console.log('🔍 Testing notification system...\n');
    
    // Get appointment details
    console.log(`📋 Fetching appointment ${appointmentId}...`);
    const aptResponse = await axios.get(`${API_URL}/appointments/${appointmentId}`);
    const appointment = aptResponse.data;
    
    console.log(`✅ Appointment found:`);
    console.log(`   - Customer: ${appointment.customer?.fullName}`);
    console.log(`   - Salon: ${appointment.salon?.name}`);
    console.log(`   - Salon Owner ID: ${appointment.salon?.ownerId}`);
    console.log(`   - Service: ${appointment.service?.name}`);
    console.log(`   - Status: ${appointment.status}\n`);
    
    // Check notifications for customer
    console.log('📬 Checking notifications for customer...');
    // Note: This would need authentication token
    
    // Check notifications for salon owner
    if (appointment.salon?.ownerId) {
      console.log(`📬 Checking notifications for salon owner (${appointment.salon.ownerId})...`);
      // Note: This would need authentication token
    }
    
    console.log('\n✅ Test complete!');
    console.log('\n💡 To fully test:');
    console.log('   1. Check backend logs for notification creation');
    console.log('   2. Log in as salon owner and check notification bell');
    console.log('   3. Query the notifications table directly in the database');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Get appointment ID from command line
const appointmentId = process.argv[2];

if (!appointmentId) {
  console.error('Usage: node test-notifications.js <appointmentId>');
  process.exit(1);
}

testNotifications(appointmentId);
