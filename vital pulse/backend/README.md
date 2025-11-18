# Pulse Backend

API server for the Pulse emergency health platform.

## Tech Stack

- **Node.js** with Express/NestJS or **Python** with FastAPI
- **PostgreSQL** - Primary database
- **Redis** - Caching and queues (optional)
- **JWT** - Authentication
- **Firebase Cloud Messaging** - Push notifications
- **Twilio/MSG91** - SMS gateway

## Getting Started

### Prerequisites

- Node.js 18+ (or Python 3.9+)
- PostgreSQL 14+
- Redis (optional)

### Installation

```bash
npm install
# or
pip install -r requirements.txt
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/pulse_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
FCM_SERVER_KEY=your-fcm-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Running

```bash
# Development
npm run dev
# or
python -m uvicorn main:app --reload

# Production
npm start
# or
python -m uvicorn main:app --host 0.0.0.0 --port 3000
```

## API Documentation

See [docs/api-spec.md](../docs/api-spec.md) for full API documentation.

## Architecture

See [docs/architecture.md](../docs/architecture.md) for system architecture.

