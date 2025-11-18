# 🚀 Quick Start Guide - Pulse Platform

Get Pulse up and running in minutes!

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **PostgreSQL 14+** (or use Docker)
- **Redis 7+** (or use Docker)

## Option 1: Using Docker Compose (Recommended)

The easiest way to run everything!

### 1. Start Database Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy (about 10-15 seconds)
docker-compose ps
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env if needed (defaults work for local dev)
```

### 4. Run Database Migrations

```bash
npm run migrate
```

### 5. Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# OR production mode
npm start
```

The backend will start on **http://localhost:3000**

### 6. (Optional) Start Mobile App

```bash
# In a new terminal
cd mobile-app

# Install dependencies
npm install

# iOS (requires Xcode)
npm run ios

# Android (requires Android Studio)
npm run android
```

---

## Option 2: Manual Setup (No Docker)

### 1. Install PostgreSQL and Redis

- **PostgreSQL**: Install locally or use a cloud service
- **Redis**: Install locally or use a cloud service

### 2. Create Database

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

### 3. Configure Backend

```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/pulse_dev
# REDIS_URL=redis://localhost:6379
```

### 4. Run Migrations

```bash
npm run migrate
```

### 5. Start Backend

```bash
npm run dev
```

---

## Verify It's Working

### Check Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX..."
}
```

### Check API Documentation

Visit: `http://localhost:3000/api/v1/regions`

Should return available regions (IN, NG, ID).

---

## Common Issues

### PostgreSQL Connection Error

**Problem**: `Connection refused` or `database does not exist`

**Solution**:
1. Ensure PostgreSQL is running: `docker-compose ps`
2. Check DATABASE_URL in `.env`
3. Create database manually if needed

### Redis Connection Error

**Problem**: `Redis connection error`

**Solution**:
1. Ensure Redis is running: `docker-compose ps`
2. Check REDIS_URL in `.env`
3. Redis is optional for basic functionality - set `REDIS_ENABLED=false` to disable

### Port Already in Use

**Problem**: `Port 3000 already in use`

**Solution**:
1. Change PORT in `.env`
2. Or stop the process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:3000 | xargs kill
   ```

### Missing Dependencies

**Problem**: `Cannot find module`

**Solution**:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## Development Tips

### Hot Reload

The backend automatically reloads on file changes when using `npm run dev` (requires nodemon).

### View Logs

```bash
# Docker Compose logs
docker-compose logs -f backend

# Backend logs (if running directly)
# Logs appear in terminal
```

### Database Reset

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS pulse_dev;"
psql -U postgres -c "CREATE DATABASE pulse_dev;"
psql -U postgres -d pulse_dev -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -U postgres -d pulse_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Run migrations again
cd backend
npm run migrate
```

---

## Next Steps

1. **Test the API**: Try creating a user, requesting OTP, etc.
2. **Explore Documentation**: See `docs/api-spec.md` for full API docs
3. **Add Your Country**: See `docs/contribution-guide.md` for adding region configs
4. **Set Up Mobile App**: Follow mobile-app/README.md for mobile setup

---

## Need Help?

- Check `docs/deployment.md` for production deployment
- Review `TODO.md` for development status
- Open an issue on GitHub: https://github.com/nrbns/vital-pulse/issues

**Happy coding! 🩸🌍**

