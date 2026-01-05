# 🚀 Complete Beginner's Guide: Deploy URUTI Saluni to Contabo VPS

This guide is written for someone deploying for the **first time**. Every step is explained in detail.

> ⚠️ **IMPORTANT: This guide is designed to NOT disturb any existing projects on your server.**
> We use a separate folder, separate database, separate PM2 process, and separate nginx config.

---

## 📋 What You'll Need Before Starting

| Item | Description |
|------|-------------|
| Contabo VPS IP | The IP address of your server (e.g., `91.123.45.67`) |
| SSH Password | The password you received when you created the VPS |
| Your backend code | The `backend` folder from your project |

---

## 🛡️ SAFETY FIRST: Understanding Isolation

Before we start, understand how we keep your existing project safe:

| Component | Existing Project | URUTI Saluni |
|-----------|------------------|--------------|
| Folder | `/var/www/existing-project/` | `/var/www/uruti-saluni/` |
| Database | existing_db | uruti_saluni |
| PM2 Process | existing-app | uruti-api |
| Nginx Config | `/etc/nginx/sites-available/existing` | `/etc/nginx/sites-available/uruti-api` |
| Port | 3000 (example) | 4000 |

**Nothing overlaps = Nothing gets disturbed!**

---

## 🔐 PART 1: Connect to Your Server

### What is SSH?
SSH (Secure Shell) is like a remote control for your server. You type commands on your computer, they run on the server.

### Step 1.1: Open Terminal/Command Prompt

**On Windows:**
- Press `Windows + R`
- Type `cmd` or `powershell`
- Press Enter

**On Mac/Linux:**
- Open the Terminal application

### Step 1.2: Connect to Your Server

```bash
ssh root@YOUR_SERVER_IP
```

**Example:**
```bash
ssh root@91.123.45.67
```

**What you'll see:**
1. First time: "Are you sure you want to continue?" → Type `yes`, press Enter
2. Password prompt → Type your Contabo password (characters won't show - that's normal!)
3. Success: You'll see `root@your-server-name:~#`

**❌ If connection fails:**
- Check your IP address is correct
- Check your password is correct
- Make sure port 22 is open in Contabo firewall

---

## 📁 PART 2: Prepare the Server (Only What's Needed)

### Step 2.1: Check What's Already Installed

**Check Node.js:**
```bash
node -v
```
- If you see `v18.x.x` or `v20.x.x`, **skip** Step 2.2
- If you see "command not found", **do** Step 2.2

**Check PM2:**
```bash
pm2 -v
```
- If you see a version number, **skip** Step 2.3
- If you see "command not found", **do** Step 2.3

**Check PostgreSQL:**
```bash
psql --version
```
- If you see a version, **skip** Step 2.4
- If you see "command not found", **do** Step 2.4

### Step 2.2: Install Node.js (Only if not installed)

```bash
apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

**Verify:**
```bash
node -v
npm -v
```

### Step 2.3: Install PM2 (Only if not installed)

```bash
npm install -g pm2
```

### Step 2.4: Install PostgreSQL (Only if not installed)

```bash
apt install postgresql postgresql-contrib -y
systemctl start postgresql
systemctl enable postgresql
```

### Step 2.5: Install MongoDB (Only if not installed)

**Why MongoDB?** URUTI Saluni uses MongoDB for some features like reports and analytics.

**Check if already installed:**
```bash
mongod --version
```
- If you see a version, **skip** to Step 2.6
- If you see "command not found", continue below

**Install MongoDB 7.0 on Ubuntu:**

```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
apt update
apt install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod
```

**Verify MongoDB is running:**
```bash
systemctl status mongod
```
✅ Should show: `active (running)` in green

### Step 2.6: Secure MongoDB (Important!)

**Create MongoDB Admin User:**

```bash
mongosh
```

You'll see `test>` prompt. Run these commands:

```javascript
use admin

db.createUser({
  user: "uruti_admin",
  pwd: "YourMongoPassword123!",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})

exit
```

> ⚠️ **CHANGE THE PASSWORD** to something secure!

**Enable Authentication:**

```bash
nano /etc/mongod.conf
```

Find the `security:` section and change it to:
```yaml
security:
  authorization: enabled
```

**Restart MongoDB:**
```bash
systemctl restart mongod
```

### 📝 Save MongoDB Credentials:
```
MongoDB URI: mongodb://uruti_admin:YourMongoPassword123!@localhost:27017/uruti_saluni?authSource=admin
Database: uruti_saluni
Username: uruti_admin
Password: (whatever you chose)
```

---

## 🗄️ PART 3: Create a NEW Database (Safe - Doesn't Touch Existing DBs)

### Step 3.1: Access PostgreSQL

```bash
sudo -u postgres psql
```

You'll see: `postgres=#`

### Step 3.2: View Existing Databases (Optional - Just to Check)

```sql
\l
```

This shows all databases. Your existing project's DB will be listed. **We won't touch it.**

### Step 3.3: Create NEW Database for URUTI

```sql
CREATE DATABASE uruti_saluni;
```

### Step 3.4: Create NEW User for URUTI

```sql
CREATE USER uruti_user WITH ENCRYPTED PASSWORD 'YourSecurePassword123!';
```

> 🔐 **CHANGE THE PASSWORD** to something strong and unique!

### Step 3.5: Grant Permissions

```sql
GRANT ALL PRIVILEGES ON DATABASE uruti_saluni TO uruti_user;
```

### Step 3.6: Exit PostgreSQL

```sql
\q
```

### 📝 Save These Credentials:
```
Database: uruti_saluni
Username: uruti_user
Password: (whatever you chose)
```

---

## 📤 PART 4: Upload Your Backend Code (Separate Folder)

### Step 4.1: Create a SEPARATE Project Folder

```bash
mkdir -p /var/www/uruti-saluni
cd /var/www/uruti-saluni
```

> ℹ️ This creates a NEW folder. Your existing project in `/var/www/` is untouched.

### Step 4.2: Verify You're in the Right Place

```bash
pwd
```

Should show: `/var/www/uruti-saluni`

### Step 4.3: Upload Your Backend Code

**OPTION A: Using FileZilla (Easiest)**

1. Download FileZilla: https://filezilla-project.org/
2. Open FileZilla
3. Connect:
   - Host: `sftp://YOUR_SERVER_IP`
   - Username: `root`
   - Password: Your Contabo password
   - Port: `22`
4. Click "Quickconnect"
5. On the **right side** (server), navigate to: `/var/www/uruti-saluni/`
6. On the **left side** (your PC), find your `backend` folder
7. **Drag the entire `backend` folder** to the right side
8. Wait for upload (may take a few minutes)

**OPTION B: Using SCP Command (From your local PC)**

Open a NEW terminal on your local computer:
```bash
scp -r C:\path\to\your\backend root@YOUR_SERVER_IP:/var/www/uruti-saluni/
```

**OPTION C: Using Git**

On the server:
```bash
cd /var/www/uruti-saluni
git clone https://github.com/YOUR_USERNAME/your-repo.git backend
```

### Step 4.4: Navigate to Backend

```bash
cd /var/www/uruti-saluni/backend
```

### Step 4.5: Verify Files are There

```bash
ls -la
```

You should see files like `package.json`, `src/`, `tsconfig.json`, etc.

---

## ⚙️ PART 5: Configure Environment Variables

### Step 5.1: Create .env File

```bash
nano .env
```

### Step 5.2: Paste This Configuration

```env
# ===========================================
# URUTI SALUNI - PRODUCTION CONFIGURATION
# ===========================================

# Server
PORT=4000
NODE_ENV=production

# Database (PostgreSQL)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=uruti_user
DB_PASSWORD=YourSecurePassword123!
DB_DATABASE=uruti_saluni
DB_SYNCHRONIZE=false
DB_LOGGING=false

# MongoDB (for reports and analytics)
MONGODB_URI=mongodb://uruti_admin:YourMongoPassword123!@localhost:27017/uruti_saluni?authSource=admin

# Authentication
JWT_SECRET=replace-this-with-a-32-character-random-string
JWT_EXPIRES_IN=7d

# File Uploads
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### Step 5.3: Customize the Values

**MUST CHANGE:**
- `DB_PASSWORD` → Your PostgreSQL password from Step 3.4
- `MONGODB_URI` → Replace password with your MongoDB password from Step 2.6
- `JWT_SECRET` → Any random 32+ character string (e.g., `xK9mP2qR7tY5wZ1aB4cD8eF0gH3iJ6kL`)

### Step 5.4: Save and Exit

1. Press `Ctrl + X`
2. Press `Y` (yes to save)
3. Press `Enter`

---

## 🔨 PART 6: Build and Start Your App

### Step 6.1: Install Dependencies

```bash
npm install
```

⏱️ **Wait 2-5 minutes** - many packages will be downloaded.

### Step 6.2: Build the Application

```bash
npm run build
```

✅ Success: You should see "Successfully compiled" or similar.

❌ If errors:
- Check Node.js version with `node -v` (need v18+)
- Check for TypeScript errors in the output

### Step 6.3: Create Uploads Directory

```bash
mkdir -p uploads
chmod 755 uploads
```

### Step 6.4: Run Database Migrations

```bash
npm run migration:run
```

This creates all tables in your new `uruti_saluni` database.

### Step 6.5: (Optional) Seed Initial Data

```bash
npm run seed
```

Only if you have a seed script.

---

## 🚀 PART 7: Start with PM2 (Separate Process)

### Step 7.1: Start the Application

```bash
pm2 start dist/main.js --name "uruti-api"
```

### Step 7.2: Verify It's Running

```bash
pm2 list
```

You should see:
```
┌─────┬──────────────┬─────────────┬──────┬────────┐
│ id  │ name         │ status      │ cpu  │ memory │
├─────┼──────────────┼─────────────┼──────┼────────┤
│ 0   │ existing-app │ online      │ 0%   │ 50mb   │  ← Your existing app
│ 1   │ uruti-api    │ online      │ 0%   │ 80mb   │  ← NEW URUTI app
└─────┴──────────────┴─────────────┴──────┴────────┘
```

**Both apps running! No conflict!**

### Step 7.3: View Logs (For Debugging)

```bash
pm2 logs uruti-api
```

Press `Ctrl + C` to exit logs.

### Step 7.4: Save PM2 Configuration

```bash
pm2 save
pm2 startup
```

This ensures your app starts automatically if server reboots.

---

## 🌐 PART 8: Setup Nginx (Separate Config)

### Step 8.1: Check Existing Nginx Configs

```bash
ls /etc/nginx/sites-enabled/
```

You'll see your existing configs. **We won't touch them.**

### Step 8.2: Create NEW Nginx Config for URUTI

```bash
nano /etc/nginx/sites-available/uruti-api
```

### Step 8.3: Paste This Configuration

```nginx
# URUTI Saluni API - Separate Server Block
server {
    listen 80;
    server_name YOUR_SERVER_IP;  # Replace with your IP

    # Only handle /api requests for URUTI
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for file uploads
        client_max_body_size 10M;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

> ⚠️ **REPLACE** `YOUR_SERVER_IP` with your actual IP (e.g., `91.123.45.67`)

### Step 8.4: Save and Exit

`Ctrl + X` → `Y` → `Enter`

### Step 8.5: Enable the Config

```bash
ln -s /etc/nginx/sites-available/uruti-api /etc/nginx/sites-enabled/
```

### Step 8.6: Test Nginx Configuration

```bash
nginx -t
```

✅ Should say: `syntax is ok` and `test is successful`

### Step 8.7: Reload Nginx

```bash
systemctl reload nginx
```

---

## ✅ PART 9: Test Your Deployment

### Step 9.1: Test Locally on Server

```bash
curl http://localhost:4000/api
```

Should return a response (like `Hello` or `{}`).

### Step 9.2: Test from Your Browser

Open: `http://YOUR_SERVER_IP/api`

Example: `http://91.123.45.67/api`

### Step 9.3: Test Specific Endpoint

Open: `http://YOUR_SERVER_IP/api/health` (if you have one)

---

## 📱 PART 10: Update Mobile App

Edit your `mobile/src/config/index.ts`:

```typescript
const CONFIG = {
  API_URL: 'http://YOUR_SERVER_IP/api',
  // ...
};
```

Example:
```typescript
API_URL: 'http://91.123.45.67/api',
```

---

## 🔧 Useful Commands Reference

| Action | Command |
|--------|---------|
| View URUTI logs | `pm2 logs uruti-api` |
| Restart URUTI only | `pm2 restart uruti-api` |
| Stop URUTI only | `pm2 stop uruti-api` |
| View all apps | `pm2 list` |
| View URUTI status | `pm2 show uruti-api` |
| View last 100 lines | `pm2 logs uruti-api --lines 100` |

---

## 🆘 Troubleshooting

### Problem: "502 Bad Gateway"
**Cause:** App crashed or not running
**Fix:**
```bash
pm2 restart uruti-api
pm2 logs uruti-api
```

### Problem: "Connection refused" on port 4000
**Cause:** App not running
**Fix:**
```bash
pm2 list  # Check if uruti-api is "online"
pm2 start dist/main.js --name "uruti-api"
```

### Problem: Database connection error
**Fix:** Check `.env` file:
```bash
cat /var/www/uruti-saluni/backend/.env
```
Verify DB_PASSWORD matches what you created.

### Problem: "EADDRINUSE: address already in use"
**Cause:** Something else is using port 4000
**Fix:**
```bash
lsof -i :4000  # See what's using port 4000
pm2 delete uruti-api
pm2 start dist/main.js --name "uruti-api"
```

### Problem: Nginx test fails
**Fix:**
```bash
nginx -t  # Shows the error
nano /etc/nginx/sites-available/uruti-api  # Fix the error
nginx -t  # Test again
```

---

## ✅ Final Verification Checklist

- [ ] SSH connection works
- [ ] Node.js installed (`node -v`)
- [ ] PM2 installed (`pm2 -v`)
- [ ] PostgreSQL running (`systemctl status postgresql`)
- [ ] MongoDB running (`systemctl status mongod`)
- [ ] PostgreSQL database created (`uruti_saluni`)
- [ ] MongoDB user created (`uruti_admin`)
- [ ] Backend files uploaded to `/var/www/uruti-saluni/backend/`
- [ ] `.env` file configured with correct values
- [ ] `npm install` completed
- [ ] `npm run build` succeeded
- [ ] `npm run migration:run` succeeded
- [ ] PM2 shows `uruti-api` as `online`
- [ ] Nginx config test passes (`nginx -t`)
- [ ] `http://YOUR_SERVER_IP/api` works in browser
- [ ] Existing project still works (check it!)

---

## 🎉 Success!

Your URUTI Saluni backend is now deployed!

**Your API URL:** `http://YOUR_SERVER_IP/api`

**Your existing project:** Still running, untouched! ✅

---

## 📞 Quick Support Reference

If something breaks:
1. Check PM2 logs: `pm2 logs uruti-api`
2. Check nginx logs: `tail -f /var/log/nginx/error.log`
3. Check PostgreSQL: `systemctl status postgresql`