import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { WalletsService } from '../src/wallets/wallets.service';

async function createWalletsForAllUsers() {
  console.log('🚀 Starting wallet creation for all users...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const usersService = app.get(UsersService);
    const walletsService = app.get(WalletsService);
    
    // Get all users
    console.log('📋 Fetching all users...');
    const users = await usersService.findAll();
    console.log(`Found ${users.length} users`);
    
    let created = 0;
    let existing = 0;
    
    for (const user of users) {
      try {
        console.log(`Processing user: ${user.fullName} (${user.email}) - Role: ${user.role}`);
        
        // This will create wallet if it doesn't exist, or return existing one
        const wallet = await walletsService.getOrCreateWallet(user.id);
        
        if (wallet) {
          // Check if this was a new creation by checking if balance is 0 and createdAt is recent
          const isNew = wallet.balance === 0 || wallet.balance === '0';
          if (isNew) {
            created++;
            console.log(`  ✅ Created wallet: ${wallet.id} (Balance: ${wallet.balance} ${wallet.currency})`);
          } else {
            existing++;
            console.log(`  ℹ️  Existing wallet: ${wallet.id} (Balance: ${wallet.balance} ${wallet.currency})`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error creating wallet for user ${user.fullName}:`, error.message);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  • Total users processed: ${users.length}`);
    console.log(`  • New wallets created: ${created}`);
    console.log(`  • Existing wallets: ${existing}`);
    console.log('✅ Wallet creation completed!');
    
  } catch (error) {
    console.error('❌ Error during wallet creation:', error);
  } finally {
    await app.close();
  }
}

// Run the script
createWalletsForAllUsers()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });