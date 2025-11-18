# 🚀 Running Pulse Project

## Current Status

✅ **Backend dependencies installed**
⚠️ **Docker Desktop not running** (needed for PostgreSQL/Redis)
⚠️ **Database connection needs setup**

## Option 1: Start Docker Desktop First (Recommended)

1. **Start Docker Desktop** on Windows
2. **Wait for Docker to be ready** (check system tray icon)
3. **Then run:**

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait 10-15 seconds for services to start
Start-Sleep -Seconds 15

# Run migrations
cd backend
npm run migrate

# Start backend server
npm run dev
```

## Option 2: Run Without Docker (Manual Setup)

### Prerequisites
- PostgreSQL 14+ installed locally
- Redis 7+ installed locally (optional)

### Steps

1. **Create PostgreSQL Database:**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pulse_dev;

# Enable PostGIS extension
\c pulse_dev
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

2. **Update .env file:**
```bash
cd backend
# Edit .env with your PostgreSQL credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/pulse_dev
```

3. **Run migrations:**
```bash
npm run migrate
```

4. **Start backend:**
```bash
npm run dev
```

## Option 3: Run Backend Only (Skip Database for Testing)

If you just want to test the API without database:

1. **Set REDIS_ENABLED=false** in `.env` (already done)
2. **Start backend** (will fail on database, but you can test API structure):
```bash
cd backend
npm run dev
```

**Note:** Full functionality requires PostgreSQL and Redis.

---

## Verify Installation

Once running, check:

```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"...","version":"1.0.0"}
```

---

## Next Steps After Running

1. ✅ Backend starts on `http://localhost:3000`
2. ✅ Health endpoint: `http://localhost:3000/health`
3. ✅ API endpoints: `http://localhost:3000/api/v1/*`

## Troubleshooting

### "Docker Desktop not running"
- Start Docker Desktop application
- Wait for it to fully start (check system tray)
- Then try `docker-compose up -d postgres redis`

### "Cannot connect to PostgreSQL"
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env`
- Verify database exists: `psql -U postgres -l`

### "Port 3000 already in use"
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

---

## What's Next?

- ✅ Backend API is ready
- ⏭️ Set up mobile app (see `mobile-app/README.md`)
- ⏭️ Configure environment variables (FCM, Twilio, etc.)
- ⏭️ Test emergency flow end-to-end

