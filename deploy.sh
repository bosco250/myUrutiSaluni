#!/bin/bash

# Deployment Script for Uruti Saluni
# This script pulls updates, builds backend/frontend, runs migrations, and restarts PM2.

# Stop script on any error
set -e

echo "🚀 Starting Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin master

# 2. Backend Deployment
echo "🛠️ Deploying Backend..."
cd backend
echo "  - Installing backend dependencies..."
npm install
echo "  - Building backend..."
npm run build
echo "  - Running migrations..."
npm run migration:run
cd ..

# 3. Frontend Deployment
echo "🎨 Deploying Web Frontend..."
cd web
echo "  - Installing web dependencies..."
npm install
echo "  - Building web..."
npm run build:clean
cd ..

# 4. Restart Server
echo "🔄 Restarting PM2 services..."
pm2 restart all || echo "⚠️ PM2 restart failed or no processes running. Please check PM2 status."

echo "✅ Deployment Complete!"
