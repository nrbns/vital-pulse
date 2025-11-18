# Pulse Architecture

## Overview

Pulse is a global emergency health platform built with scalability, reliability, and region-specific configurability in mind. The architecture follows a modular, service-oriented design that allows the platform to work seamlessly across 150+ countries with minimal code changes.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │  Home    │  │Emergency │  │  Donate  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express/NestJS)              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication (JWT) │  Rate Limiting │  Validation │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  User        │   │  Blood       │   │  Emergency   │
│  Service     │   │  Service     │   │  Service     │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                ┌───────────────────────┐
                │   PostgreSQL          │
                │   (Primary Database)  │
                └───────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Redis       │   │  Region      │   │  External    │
│  (Cache)     │   │  Configs     │   │  Services    │
└──────────────┘   └──────────────┘   └──────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  FCM         │   │  Maps API    │   │  SMS Gateway │
│  (Push)      │   │  (Google/OSM)│   │  (Twilio)    │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Core Components

### 1. Mobile App (React Native)

**Location**: `/mobile-app`

**Responsibilities**:
- User interface and user experience
- Offline caching of nearby hospitals and blood banks
- Push notification handling
- Map integration
- Location services
- Multi-language support

**Key Features**:
- Offline-first architecture
- Optimized for low-end devices and slow networks
- Region-aware UI (loads region config on first launch)
- Lightweight bundle size

### 2. Backend API

**Location**: `/backend`

**Responsibilities**:
- REST/GraphQL API endpoints
- Authentication and authorization
- Business logic
- Database operations
- Integration with external services
- Notification management

**Tech Stack**:
- Node.js with Express/NestJS or Python with FastAPI
- JWT for authentication
- Role-based access control (RBAC)
- Rate limiting and security middleware

### 3. Database (PostgreSQL)

**Core Tables**:
- `users` - User accounts and profiles
- `donors` - Blood donor information
- `hospitals` - Hospital/clinic data
- `blood_banks` - Blood bank information
- `blood_requests` - Emergency blood requests
- `donation_history` - Donation records
- `events` - Donation camps and events
- `notifications` - Push notification records
- `reports` - Abuse/fake request reports
- `countries` - Country configuration metadata
- `region_configs` - Region-specific configurations

### 4. Region Configuration System

**Location**: `/regions`

**Purpose**: 
Enable global deployment without code changes by using JSON configuration files per country.

**Structure**:
```
regions/
├── _template/          # Template for new countries
│   ├── config.json
│   ├── languages.json
│   ├── blood-donation-rules.json
│   ├── sms-gateway.json
│   └── emergency-numbers.json
├── IN/                 # India
├── NG/                 # Nigeria
├── ID/                 # Indonesia
└── ...
```

**Configuration Files**:

1. **config.json**: Main country configuration
   - Country code, name, timezone
   - Default language, supported languages
   - Phone number format
   - Emergency service numbers
   - Feature flags

2. **blood-donation-rules.json**: Blood donation regulations
   - Donation intervals (days)
   - Age limits
   - Health restrictions
   - Blood group prevalence
   - Rare blood group definitions

3. **emergency-numbers.json**: Emergency contact numbers
   - Ambulance, police, fire
   - Medical emergency
   - Specialized helplines

4. **sms-gateway.json**: SMS provider configuration
   - Provider (Twilio, MSG91, etc.)
   - API credentials
   - Message templates

5. **languages.json**: Supported languages
   - Language codes
   - Native names
   - Translation status

### 5. Redis Cache

**Use Cases**:
- Nearby hospitals/blood banks (geospatial caching)
- User sessions
- Rate limiting counters
- Notification queues
- Region config caching

### 6. External Integrations

**Maps**:
- Primary: Google Maps API
- Fallback: OpenStreetMap + Nominatim
- Region-specific API keys via config

**Push Notifications**:
- Firebase Cloud Messaging (FCM)
- Cross-platform support

**SMS**:
- Twilio (default)
- Regional providers (MSG91 for India, etc.)
- Configurable per region

## Data Flow Examples

### Emergency Blood Request Flow

```
1. User creates blood request via mobile app
   └─> POST /api/blood-requests
   
2. Backend validates request
   └─> Check user authentication
   └─> Validate blood group format
   └─> Load region config for donation rules
   
3. Match nearby donors
   └─> Query donors table with:
       - Matching blood group
       - Within radius (configurable, default 50km)
       - Eligibility (last donation date + interval)
       - Active status
   └─> Cache results in Redis
   
4. Notify matched donors
   └─> Queue notifications via FCM
   └─> Optional SMS via configured gateway
   └─> Update notification status in DB
   
5. Match nearby blood banks
   └─> Query blood_banks table
   └─> Check inventory (if available)
   └─> Notify blood banks
   
6. Return response to user
   └─> Matched donor count
   └─> Blood bank count
   └─> Request ID for tracking
```

### Emergency Hospital Finder Flow

```
1. User taps EMERGENCY button
   └─> Get user location (GPS)
   
2. Load cached hospitals (Redis)
   └─> Check if cache exists for location
   └─> If not, query database
   
3. Filter and rank hospitals
   └─> Filter by:
       - Distance (nearest first)
       - Emergency availability
       - Operating hours (if provided)
   └─> Cache results
   
4. Display on map
   └─> Use configured map provider
   └─> Show markers with distance/ETA
   └─> One-tap call/navigation
   
5. Offline fallback
   └─> Use cached hospital data
   └─> Use offline map tiles (if available)
```

## Security Considerations

1. **Authentication**
   - JWT tokens with expiration
   - Refresh token rotation
   - Phone number verification via OTP

2. **Authorization**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - Hospital admin verification

3. **Data Privacy**
   - Phone numbers encrypted at rest
   - Location data anonymized for analytics
   - Donor information only shared with consent

4. **Rate Limiting**
   - API endpoint rate limits
   - SMS/OTP rate limits
   - Abuse detection mechanisms

5. **Input Validation**
   - Sanitize all user inputs
   - Validate phone numbers per region
   - Validate blood group formats

## Scalability Considerations

1. **Database**
   - Indexed queries for location-based searches
   - Connection pooling
   - Read replicas for high-traffic regions

2. **Caching**
   - Redis for frequently accessed data
   - CDN for static assets
   - Region config caching

3. **Horizontal Scaling**
   - Stateless API design
   - Load balancing
   - Queue-based notification system

4. **Offline Support**
   - Offline-first mobile app
   - Cached hospital/blood bank data
   - Background sync when online

## Deployment

### Development
- Local PostgreSQL database
- Local Redis instance
- Mock external services

### Production
- Containerized services (Docker)
- Kubernetes orchestration (optional)
- Managed database services
- CDN for static assets
- Monitoring and logging (e.g., Sentry, Datadog)

## Future Enhancements

1. **Microservices Architecture**
   - Split services (User, Blood, Emergency, Notifications)
   - Independent scaling
   - Service mesh

2. **GraphQL API**
   - More flexible queries
   - Reduced over-fetching

3. **Real-time Features**
   - WebSocket connections
   - Live donation tracking
   - Real-time availability updates

4. **AI/ML Integration**
   - Fraud detection
   - Demand prediction
   - Optimal donor matching

5. **Web Dashboard**
   - Hospital admin portal
   - NGO campaign management
   - Analytics dashboard

