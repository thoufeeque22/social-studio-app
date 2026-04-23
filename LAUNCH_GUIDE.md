# Social Studio: Ultimate Deployment Guide (Oracle Cloud Free Tier)

This guide covers the 100% free, "Always On" deployment method using Oracle Cloud. It includes fixes for common bugs like "greyed out networking" and "out of capacity" errors.

---

## 1. Create your Network (The Manual Way)
*Oracle's "Create Instance" wizard often bugs out. Creating your network manually first is the only way to ensure your Public IP works.*

1. Log in to Oracle Cloud.
2. Click the **Hamburger Menu (≡)** -> **Networking** -> **Virtual cloud networks**.
3. Click **Start VCN Wizard**.
4. Select **VCN with Internet Connectivity** and click **Start VCN Wizard**.
5. Name it `SocialStudioVCN` and click **Next** -> **Create**.
   - *This creates your Public Subnet and Internet Gateway automatically.*

---

## 2. Create your Server (The "Instance")
1. Go to **Compute** -> **Instances** -> **Create Instance**.
2. **Placement:** Click **Edit**. Try **AD-1**, **AD-2**, or **AD-3**. 
   - *Note: If one AD says "Out of capacity," try the next one. These 24GB servers are very popular!*
3. **Image and Shape:** Click **Edit**.
   - **Image:** Click **Change Image** and select **Ubuntu 24.04**.
   - **Shape:** Click **Change Shape**. Select **Ampere** -> **VM.Standard.A1.Flex**.
   - **Specs:** Slide OCPU to **4** and Memory to **24 GB**.
4. **Networking:**
   - Select **Select existing virtual cloud network** -> `SocialStudioVCN`.
   - Select **Select existing subnet** -> `Public Subnet-SocialStudioVCN`.
   - Ensure **Assign a public IPv4 address** is **ON**.
5. **SSH Keys:** Click **Save private key** and download the file. **Do not lose this!**
6. **Storage:** Toggle **Specify a custom boot volume size** and set it to **100 GB**.
7. Click **Create**.

---

## 3. Configure the Server Environment
Once the instance status is "Running," copy the **Public IP Address**. Open your Mac terminal and connect:

```bash
# Set permissions for your key (do this once)
chmod 400 ~/Downloads/ssh-key-yourname.key

# Connect to the server
ssh -i ~/Downloads/ssh-key-yourname.key ubuntu@YOUR_SERVER_IP
```

Inside the server, run these setup commands:
```bash
# 1. Update system
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Node.js 20 & Git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 3. Install PM2 (Process Manager)
sudo npm install -g pm2
```

---

## 4. Deploy the Code
```bash
# Clone and Install
git clone https://github.com/your-username/social-studio-app.git
cd social-studio-app
npm install

# Transfer your .env and dev.db from your LOCAL Mac to the server
# (Run this on your Mac terminal, not the server)
scp -i ~/Downloads/key.key .env ubuntu@IP:~/social-studio-app/.env
scp -i ~/Downloads/key.key prisma/dev.db ubuntu@IP:~/social-studio-app/prisma/dev.db

# Build and Launch (on the server)
npm run build
pm2 start npm --name "social-studio" -- run start
pm2 save
pm2 startup
```

---

## 5. Automation (Zero-Touch Updates)
I've already added a `.github/workflows/deploy.yml` and `update.sh` to your project. 

1. Go to your GitHub Repo -> **Settings** -> **Secrets** -> **Actions**.
2. Add these three secrets:
   - `VPS_HOST`: Your Server IP.
   - `VPS_USERNAME`: `ubuntu`
   - `VPS_SSH_KEY`: The contents of your `.key` file.

**Now, whenever you run `git push origin main`, your server will update itself automatically!**

---

## Troubleshooting "Out of Capacity"
If AD-1, AD-2, and AD-3 all say "Out of capacity," you have two choices:
- **Wait and Retry:** Spots open up constantly as people delete instances.
- **Downgrade:** Switch the Shape to **AMD `VM.Standard.E2.1.Micro`** (1GB RAM). If you do this, you **MUST** run this command on the server to prevent crashes:
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  ```
