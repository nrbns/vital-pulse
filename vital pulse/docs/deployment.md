# Deployment Guide

This guide covers deploying the Pulse platform to production.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL 14+ with PostGIS extension
- Redis 7+
- Node.js 18+ (for local development)
- Domain name with SSL certificate (for production)

## Backend Deployment

### Using Docker Compose (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nrbns/vital-pulse.git
   cd vital-pulse
   ```

2. **Configure environment variables:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your production values
   ```

3. **Update docker-compose.yml with production settings:**
   ```yaml
   services:
     backend:
       environment:
         NODE_ENV: production
         DATABASE_URL: postgresql://user:pass@postgres:5432/pulse_prod
         REDIS_URL: redis://redis:6379
         JWT_SECRET: your-strong-production-secret
         # ... other secrets
   ```

4. **Deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. **Run migrations:**
   ```bash
   docker-compose exec backend npm run migrate
   ```

### Manual Deployment

1. **Install dependencies:**
   ```bash
   cd backend
   npm ci --production
   ```

2. **Run migrations:**
   ```bash
   npm run migrate
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

   Or with PM2:
   ```bash
   pm2 start src/index.js --name pulse-backend
   pm2 save
   pm2 startup
   ```

### Environment Variables (Backend)

Required environment variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/pulse_prod
REDIS_URL=redis://host:6379
JWT_SECRET=your-strong-secret-key
JWT_EXPIRES_IN=7d
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
FCM_SERVER_KEY=your-fcm-server-key
FCM_PROJECT_ID=your-fcm-project-id
GOOGLE_MAPS_API_KEY=your-google-maps-key
ENABLE_PG_LISTENER=true
CORS_ORIGIN=https://yourdomain.com
```

## Mobile App Deployment

### iOS (App Store)

1. **Install dependencies:**
   ```bash
   cd mobile-app
   npm install
   cd ios && pod install && cd ..
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with production API URL
   ```

3. **Update API URL in `src/config/index.js`:**
   ```javascript
   export const API_BASE_URL = 'https://api.pulse.app/api/v1';
   export const WS_URL = 'wss://api.pulse.app';
   ```

4. **Build for production:**
   ```bash
   # iOS
   cd ios
   xcodebuild -workspace Pulse.xcworkspace -scheme Pulse -configuration Release
   
   # Or use React Native CLI
   cd ..
   npx react-native run-ios --configuration Release
   ```

5. **Archive and upload to App Store Connect**

### Android (Play Store)

1. **Configure signing:**
   ```bash
   cd mobile-app/android/app
   keytool -genkeypair -v -storetype PKCS12 -keystore pulse-release.keystore -alias pulse -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Update `android/gradle.properties`:**
   ```properties
   PULSE_RELEASE_STORE_FILE=pulse-release.keystore
   PULSE_RELEASE_KEY_ALIAS=pulse
   PULSE_RELEASE_STORE_PASSWORD=your-store-password
   PULSE_RELEASE_KEY_PASSWORD=your-key-password
   ```

3. **Build release APK:**
   ```bash
   cd mobile-app
   npm run android -- --mode=release
   ```

4. **Build AAB for Play Store:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

5. **Upload to Google Play Console**

## Database Migration

Always run migrations before deploying:

```bash
# Using Docker
docker-compose exec backend npm run migrate

# Manual
cd backend
npm run migrate
```

## SSL/HTTPS Setup

### Using Nginx as Reverse Proxy

1. **Install Nginx:**
   ```bash
   sudo apt-get update
   sudo apt-get install nginx certbot python3-certbot-nginx
   ```

2. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name api.pulse.app;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name api.pulse.app;

       ssl_certificate /etc/letsencrypt/live/api.pulse.app/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.pulse.app/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Get SSL certificate:**
   ```bash
   sudo certbot --nginx -d api.pulse.app
   ```

## Monitoring & Logging

### Health Checks

The backend exposes a health endpoint:
```bash
curl https://api.pulse.app/health
```

### Logs

View logs:
```bash
# Docker
docker-compose logs -f backend

# PM2
pm2 logs pulse-backend
```

### Database Backups

Set up automated PostgreSQL backups:
```bash
# Add to crontab
0 2 * * * pg_dump -U postgres pulse_prod > /backups/pulse_$(date +\%Y\%m\%d).sql
```

## Scaling

### Horizontal Scaling

1. **Load Balancer:** Use Nginx or cloud load balancer
2. **Multiple Backend Instances:** Run multiple Docker containers
3. **Redis Cluster:** For high availability
4. **PostgreSQL Replication:** Master-slave setup for read scalability

### Vertical Scaling

1. **Increase container resources** in docker-compose.yml
2. **Optimize database** indexes and queries
3. **Enable Redis caching** for frequently accessed data

## Rollback Plan

If deployment fails:

1. **Database rollback:**
   ```bash
   # Restore from backup
   psql -U postgres pulse_prod < backup.sql
   ```

2. **Revert Docker image:**
   ```bash
   docker-compose down
   docker-compose up -d --image pulse-backend:previous-tag
   ```

3. **Revert code:**
   ```bash
   git revert HEAD
   git push origin main
   ```

## Production Checklist

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Health checks passing
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Logs accessible
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] API documentation updated
- [ ] Mobile app API URLs updated
- [ ] Push notification credentials configured
- [ ] SMS gateway configured

## Troubleshooting

### Backend won't start
- Check environment variables
- Verify database connection
- Check Redis connection
- Review logs: `docker-compose logs backend`

### Database connection errors
- Verify DATABASE_URL format
- Check PostgreSQL is running
- Verify user permissions
- Check network connectivity

### WebSocket connection issues
- Verify CORS settings
- Check firewall rules
- Ensure reverse proxy supports WebSocket upgrades
- Verify SSL certificate is valid

### Push notifications not working
- Verify FCM credentials
- Check device token registration
- Review Firebase console
- Check backend logs for FCM errors

## Support

For deployment issues:
- GitHub Issues: https://github.com/nrbns/vital-pulse/issues
- Documentation: https://github.com/nrbns/vital-pulse/docs

