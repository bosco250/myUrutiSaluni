// PM2 Ecosystem Configuration for Production
// This enables cluster mode to use all CPU cores for handling concurrent requests

module.exports = {
  apps: [
    {
      name: 'uruti-api',
      script: 'dist/main.js',
      
      // CLUSTER MODE - Use all CPU cores
      instances: 'max', // Or set specific number like 4
      exec_mode: 'cluster',
      
      // AUTO-RESTART ON FAILURE
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 1000,
      
      // MEMORY MANAGEMENT
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      
      // ENVIRONMENT
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      
      // LOGGING
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // GRACEFUL SHUTDOWN
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
