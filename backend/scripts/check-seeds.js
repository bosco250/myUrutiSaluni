const Database = require('better-sqlite3');
const db = new Database('database/salon_association.db');

try {
  const salons = db.prepare('SELECT COUNT(*) as count FROM salons').get();
  const salonOwners = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'salon_owner'").get();
  const allUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();

  console.log('\n📊 Database Statistics:');
  console.log('=======================');
  console.log(`Total Users: ${allUsers.count}`);
  console.log(`Salon Owners: ${salonOwners.count}`);
  console.log(`Salons: ${salons.count}`);
  
  if (salons.count > 0) {
    console.log('\n✅ Seed data exists!');
    
    // Show sample salon data
    const sampleSalons = db.prepare('SELECT name, city, district FROM salons LIMIT 5').all();
    console.log('\n📍 Sample Salons:');
    sampleSalons.forEach((salon, i) => {
      console.log(`   ${i + 1}. ${salon.name} (${salon.city}, ${salon.district})`);
    });
  } else {
    console.log('\n⚠️  No seed data found. Run: npm run seed');
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}
