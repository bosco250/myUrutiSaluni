// Quick test script to verify role update after approval
// Run with: node test-approval.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'salon_association.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking membership applications and user roles...\n');

// Check pending applications
db.all(`
  SELECT 
    ma.id as app_id,
    ma.status,
    ma.applicant_id,
    u.email,
    u.full_name,
    u.role
  FROM membership_applications ma
  LEFT JOIN users u ON ma.applicant_id = u.id
  ORDER BY ma.created_at DESC
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
    db.close();
    return;
  }

  console.log('Membership Applications:');
  console.log('========================');
  rows.forEach(row => {
    console.log(`\nApplication ID: ${row.app_id}`);
    console.log(`Status: ${row.status}`);
    console.log(`Applicant: ${row.full_name} (${row.email})`);
    console.log(`Current Role: ${row.role}`);
    console.log(`Expected Role after approval: ${row.status === 'approved' ? 'salon_owner' : 'customer'}`);
    
    if (row.status === 'approved' && row.role !== 'salon_owner') {
      console.log('⚠️  WARNING: Application is approved but user role is still customer!');
    } else if (row.status === 'approved' && row.role === 'salon_owner') {
      console.log('✅ Role correctly updated to salon_owner');
    }
  });

  db.close();
});

