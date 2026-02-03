const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Creating wallets for all users...');
console.log('This will create wallets for users who don\'t have them yet.');

// Run the TypeScript script
const scriptPath = path.join(__dirname, 'scripts', 'create-wallets-for-users.ts');
const command = `npx ts-node ${scriptPath}`;

console.log(`Running: ${command}`);

exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error running script:', error);
    return;
  }
  
  if (stderr) {
    console.error('⚠️  Warnings:', stderr);
  }
  
  console.log(stdout);
  console.log('✅ Wallet creation completed!');
});