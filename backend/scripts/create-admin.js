/**
 * Script to create a super admin user
 * Run with: node scripts/create-admin.js
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'database', 'salon_association.db');

// Admin credentials
const ADMIN_EMAIL = 'admin@salonassociation.com';
const ADMIN_PASSWORD = 'Admin@1234';
const ADMIN_NAME = 'Super Admin';
const ADMIN_PHONE = '+250788123456';
const ADMIN_ROLE = 'super_admin';

async function createAdmin() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to database');
    });

    // Check if admin already exists
    db.get(
      'SELECT id, email, role FROM users WHERE email = ? OR role = ?',
      [ADMIN_EMAIL, ADMIN_ROLE],
      async (err, row) => {
        if (err) {
          console.error('Error checking existing admin:', err);
          db.close();
          reject(err);
          return;
        }

        if (row) {
          console.log('\n⚠️  Admin user already exists!');
          console.log('Email:', row.email);
          console.log('Role:', row.role);
          console.log('\nIf you want to reset the password, delete the user first or update it manually.');
          db.close();
          resolve();
          return;
        }

        // Hash password
        try {
          const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
          const userId = uuidv4();
          const now = new Date().toISOString();

          // Insert admin user
          db.run(
            `INSERT INTO users (
              id, email, phone, password_hash, full_name, role, is_active, created_at, updated_at, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              ADMIN_EMAIL,
              ADMIN_PHONE,
              hashedPassword,
              ADMIN_NAME,
              ADMIN_ROLE,
              1, // is_active
              now,
              now,
              '{}', // metadata
            ],
            function (err) {
              if (err) {
                console.error('Error creating admin user:', err);
                db.close();
                reject(err);
                return;
              }

              console.log('\n✅ Super Admin user created successfully!');
              console.log('\n📋 Credentials:');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('Email:    ', ADMIN_EMAIL);
              console.log('Password: ', ADMIN_PASSWORD);
              console.log('Role:     ', ADMIN_ROLE);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
              console.log('   Change the password after first login.\n');

              db.close();
              resolve();
            }
          );
        } catch (hashError) {
          console.error('Error hashing password:', hashError);
          db.close();
          reject(hashError);
        }
      }
    );
  });
}

// Run the script
createAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create admin:', error);
    process.exit(1);
  });

