const Database = require('better-sqlite3');
const db = new Database('database/salon_association.db');

try {
  console.log('\n🎯 SALON OWNERS & THEIR SALONS');
  console.log('='.repeat(80));
  
  const query = `
    SELECT 
      u.id as user_id,
      u.full_name,
      u.email,
      u.phone,
      s.id as salon_id,
      s.name as salon_name,
      s.city,
      s.district,
      s.address,
      s.registration_number,
      s.status
    FROM users u
    LEFT JOIN salons s ON u.id = s.owner_id
    WHERE u.role = 'salon_owner'
    ORDER BY u.full_name
  `;
  
  const results = db.prepare(query).all();
  
  if (results.length === 0) {
    console.log('\n⚠️  No salon owners found. Run: npm run seed');
  } else {
    let currentOwner = null;
    let ownerCount = 0;
    let salonCount = 0;
    
    results.forEach((row, index) => {
      if (currentOwner !== row.user_id) {
        ownerCount++;
        currentOwner = row.user_id;
        
        console.log(`\n${ownerCount}. ${row.full_name}`);
        console.log(`   📧 Email: ${row.email}`);
        console.log(`   📱 Phone: ${row.phone}`);
        console.log(`   🔑 Password: Password123!`);
        
        if (row.salon_id) {
          console.log(`\n   🏢 Salon:`);
        }
      }
      
      if (row.salon_id) {
        salonCount++;
        console.log(`      • ${row.salon_name}`);
        console.log(`        📍 ${row.address || 'N/A'}`);
        console.log(`        🏙️  ${row.city}, ${row.district}`);
        console.log(`        📋 Reg: ${row.registration_number}`);
        console.log(`        ⚡ Status: ${row.status}`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   • ${ownerCount} Salon Owners`);
    console.log(`   • ${salonCount} Salons`);
    console.log(`\n💡 Login at: http://localhost:3000/api (Swagger)`);
    console.log(`   Or frontend: http://localhost:3001/login\n`);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
