#!/bin/bash

echo "🚀 Starting Social Studio Update..."

# 1. Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# 2. Install dependencies (in case package.json changed)
echo "📦 Installing dependencies..."
npm install

# 3. Build the Next.js app
echo "🏗️ Building production app..."
npm run build

# 4. Restart PM2 processes
echo "🔄 Restarting background worker and server..."
pm2 restart all

echo "✅ Update complete! Social Studio is back online."
