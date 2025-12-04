const Database = require('better-sqlite3');
const db = new Database('database/salon_association.db');

try {
  console.log('\n📋 MEMBERSHIP APPLICATIONS');
  console.log('='.repeat(80));
  
  const apps = db.prepare(`
    SELECT 
      ma.id,
      ma.businessName,
      ma.city,
      ma.district,
      ma.status,
      ma.email,
      ma.phone,
      ma.created_at,
      u.full_name as applicant_name
    FROM membership_applications ma
    LEFT JOIN users u ON ma.applicant_id = u.id
    ORDER BY ma.created_at DESC
  `).all();
  
  if (apps.length === 0) {
    console.log('\n⚠️  No applications found. Run: npm run seed');
  } else {
    const pending = apps.filter(a => a.status === 'pending').length;
    const approved = apps.filter(a => a.status === 'approved').length;
    const rejected = apps.filter(a => a.status === 'rejected').length;
    
    console.log(`\n📊 Status Summary: ${apps.length} total`);
    console.log(`   ⏳ Pending: ${pending}`);
    console.log(`   ✅ Approved: ${approved}`);
    console.log(`   ❌ Rejected: ${rejected}`);
    console.log('\n' + '-'.repeat(80));
    
    apps.forEach((app, i) => {
      const statusIcon = app.status === 'pending' ? '⏳' : app.status === 'approved' ? '✅' : '❌';
      console.log(`\n${i + 1}. ${app.businessName}`);
      console.log(`   ${statusIcon} Status: ${app.status.toUpperCase()}`);
      console.log(`   📍 Location: ${app.city}, ${app.district}`);
      console.log(`   📧 Email: ${app.email}`);
      console.log(`   📱 Phone: ${app.phone}`);
      console.log(`   👤 Applicant: ${app.applicant_name || 'N/A'}`);
      console.log(`   📅 Applied: ${new Date(app.created_at).toLocaleString()}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 View in frontend: http://localhost:3001/membership/applications');
    console.log('💡 API endpoint: http://localhost:3000/api/memberships/applications\n');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
