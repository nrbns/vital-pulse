# 🚀 Running Pulse Platform - Quick Guide

## Current Status

- ✅ Backend code ready
- ✅ Dependencies installed
- ❌ Docker Desktop not running (required for PostgreSQL + Redis)

## Start the Project

### Option 1: Using Startup Script (Recommended)

1. **Start Docker Desktop**
   - Open Docker Desktop application
   - Wait for it to fully start (green icon in system tray)

2. **Run the startup script:**
   ```powershell
   .\START_PROJECT.ps1
   ```

   This script will:
   - ✅ Check Docker Desktop
   - ✅ Start PostgreSQL and Redis containers
   - ✅ Run database migrations
   - ✅ Start backend server

### Option 2: Manual Start

1. **Start Docker Desktop** (if not running)

2. **Start database services:**
   ```powershell
   docker-compose up -d postgres redis
   ```

3. **Wait 15 seconds** for services to be ready

4. **Run migrations:**
   ```powershell
   cd backend
   npm run migrate
   ```

5. **Start backend server:**
   ```powershell
   npm run dev
   ```

## Verify It's Running

Once started, check the health endpoint:

```powershell
curl http://localhost:3000/health
```

Should return:
```json
{"status":"ok","timestamp":"...","version":"1.0.0"}
```

## Backend API

Once running, the backend will be available at:

- **Health Check:** http://localhost:3000/health
- **API Base:** http://localhost:3000/api/v1
- **API Docs:** http://localhost:3000/api/v1/docs (if enabled)

## Troubleshooting

### "Docker Desktop not running"
- Start Docker Desktop application
- Wait for it to fully start
- Then retry `docker-compose up -d postgres redis`

### "Port 3000 already in use"
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### "Cannot connect to PostgreSQL"
- Ensure Docker containers are running: `docker-compose ps`
- Check container logs: `docker-compose logs postgres`
- Verify `.env` file has correct database URL

### "Migration failed"
- Check PostgreSQL is healthy: `docker inspect pulse-postgres`
- Verify database connection: `docker exec -it pulse-postgres psql -U postgres -d pulse_dev`

## Next Steps

After backend is running:

1. ✅ Test API endpoints
2. ⏭️ Start mobile app (see `mobile-app/README.md`)
3. ⏭️ Configure FCM/Twilio credentials (optional, for notifications)
4. ⏭️ Test emergency flow end-to-end

---

**Need help?** Check `QUICK_START.md` or `RUN_PROJECT.md` for detailed instructions.

