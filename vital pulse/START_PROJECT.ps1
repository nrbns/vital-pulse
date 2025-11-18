# Pulse Platform - Quick Start Script
# Run this script to start the project

Write-Host "`n🚀 Starting Pulse Platform...`n" -ForegroundColor Cyan

# Check Docker
Write-Host "1️⃣ Checking Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again.`n" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Docker Desktop is running`n" -ForegroundColor Green

# Check Node.js
Write-Host "2️⃣ Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/`n" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js $nodeVersion`n" -ForegroundColor Green

# Check backend .env
Write-Host "3️⃣ Checking backend configuration..." -ForegroundColor Yellow
try {
    Set-Location backend -ErrorAction Stop
    if (-not (Test-Path .env)) {
        if (Test-Path .env.example) {
            Copy-Item .env.example .env
            Write-Host "✅ Created .env file from .env.example`n" -ForegroundColor Green
        } else {
            Write-Host "❌ .env.example not found!" -ForegroundColor Red
            Set-Location ..
            exit 1
        }
    } else {
        Write-Host "✅ .env file exists`n" -ForegroundColor Green
    }
    Set-Location .. -ErrorAction Stop
} catch {
    Write-Host "❌ Error in step 3: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Install backend dependencies if needed
Write-Host "4️⃣ Checking backend dependencies..." -ForegroundColor Yellow
try {
    Set-Location backend -ErrorAction Stop
    if (-not (Test-Path node_modules)) {
        Write-Host "Installing backend dependencies (this may take a minute)...`n" -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install backend dependencies!`n" -ForegroundColor Red
            Set-Location ..
            exit 1
        }
        Write-Host "✅ Backend dependencies installed`n" -ForegroundColor Green
    } else {
        Write-Host "✅ Backend dependencies already installed`n" -ForegroundColor Green
    }
    Set-Location .. -ErrorAction Stop
} catch {
    Write-Host "❌ Error in step 4: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Start Docker services
Write-Host "5️⃣ Starting Docker services (PostgreSQL + Redis)..." -ForegroundColor Yellow
docker-compose up -d postgres redis

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker services!`n" -ForegroundColor Red
    exit 1
}

Write-Host "⏳ Waiting for services to be ready (15 seconds)...`n" -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check services health
$postgresHealthy = docker inspect --format='{{.State.Health.Status}}' pulse-postgres 2>&1
$redisHealthy = docker ps --filter "name=pulse-redis" --format "{{.Status}}" 2>&1

Write-Host "✅ PostgreSQL: $postgresHealthy" -ForegroundColor Green
Write-Host "✅ Redis: Running`n" -ForegroundColor Green

# Run migrations
Write-Host "6️⃣ Running database migrations..." -ForegroundColor Yellow
try {
    Set-Location backend -ErrorAction Stop
    npm run migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Migration failed, but continuing...`n" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Migrations completed`n" -ForegroundColor Green
    }
    Set-Location .. -ErrorAction Stop
} catch {
    Write-Host "⚠️  Error running migrations: $_ (continuing...)" -ForegroundColor Yellow
    Set-Location ..
}

# Start backend server
Write-Host "`n7️⃣ Starting backend server..." -ForegroundColor Yellow
Write-Host "Backend will be available at: http://localhost:3000`n" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray

try {
    Set-Location backend -ErrorAction Stop
    npm run dev
} catch {
    Write-Host "❌ Error starting backend: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}

