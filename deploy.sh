#!/bin/bash

# Configuration
VPS_USER="ubuntu"
VPS_IP="130.162.57.229"
VPS_PATH="~/social-studio-app"
SSH_KEY="/Users/thoufeeque/Documents/keys/ssh-key-2026-04-23.key"

echo "🚀 Starting deployment of Social Studio..."

# 1. Build locally
echo "📦 Building the app locally (with Full Sentry enabled)..."
npm run build

# 2. Package the build
echo "🎁 Packaging build files..."
# We only include the essentials. node_modules is NOT included.
tar -czf next-deploy.tar.gz .next public package.json next.config.ts sentry.*.config.ts

# 3. Upload to VPS
echo "📤 Uploading to VPS ($VPS_IP)..."
scp -i $SSH_KEY next-deploy.tar.gz $VPS_USER@$VPS_IP:$VPS_PATH/

# 4. Extract and Restart on VPS
echo "🔄 Extracting and restarting on VPS..."
ssh -i $SSH_KEY $VPS_USER@$VPS_IP << 'EOF'
  cd ~/social-studio-app
  tar -xzf next-deploy.tar.gz
  # Install dependencies on server (much lighter than building)
  npm install --production --legacy-peer-deps
  pm2 restart social-studio
  rm -f next-deploy.tar.gz
EOF

# 5. Cleanup local
rm -f next-deploy.tar.gz

echo "✅ Deployment complete! Social Studio is live."
