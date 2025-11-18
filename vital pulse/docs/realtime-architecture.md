# Pulse Realtime Architecture

## Overview

Pulse uses a multi-layered realtime architecture to enable instant emergency notifications, donor presence tracking, and live status updates.

## Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile/Web Clients                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  WebSocket   │  │   FCM Push   │  │   SMS Fallback│      │
│  │   (Socket.IO)│  │ Notifications│  │               │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Socket.IO   │   │   BullMQ     │   │  PostgreSQL  │
│   Server     │   │  (Redis)     │   │   LISTEN     │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                ┌───────────────────────┐
                │   PostgreSQL          │
                │   (Primary DB)        │
                └───────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Redis      │   │  FCM Service │   │  SMS Gateway │
│  (Presence + │   │              │   │              │
│   Geo-index) │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

## 1. WebSocket Layer (Socket.IO)

### Purpose
- Real-time bidirectional communication
- Live emergency updates
- Donor presence tracking
- Instant status changes

### Rooms

**Region Rooms:**
- `region:{countryCode}` - All users in a country
- Used for: Emergency broadcasts, hospital status updates

**Emergency Rooms:**
- `emergency:{emergencyId}` - All users watching an emergency
- `emergency:{emergencyId}:requester` - Only the requester
- Used for: Live response updates, status changes

**User Rooms:**
- `user:{userId}` - Personal notifications
- Used for: Direct messages, personal updates

**Donor Rooms:**
- `donors:available` - All available donors
- Used for: Emergency broadcasts

### Events

**Client → Server:**
- `donor:update-presence` - Update availability status
- `emergency:join` - Join emergency room
- `emergency:leave` - Leave emergency room
- `emergency:respond` - Respond to emergency
- `ping` - Heartbeat

**Server → Client:**
- `emergency:created` - New emergency in region
- `emergency:nearby` - Emergency near donor
- `emergency:status-updated` - Status changed
- `emergency:response` - Someone responded
- `hospital:status-updated` - Hospital status changed
- `blood_inventory:updated` - Blood stock updated
- `pong` - Heartbeat response

## 2. Presence Tracking (Redis)

### Purpose
- Fast donor availability lookup
- Geo-indexed search for nearby donors
- Real-time presence state

### Data Structure

**Presence Hash:**
```
donor:presence:{userId} -> {
  isAvailable: "1" | "0",
  latitude: "19.0760",
  longitude: "72.8777",
  countryCode: "IN",
  bloodGroup: "O+",
  socketId: "socket_id",
  updatedAt: "1234567890"
}
```

**Geo-Index (Redis GEO):**
```
donors:geo:{countryCode} -> GEOADD long lat userId
donors:geo:{countryCode}:{bloodGroup} -> GEOADD long lat userId
```

**Operations:**
- `GEORADIUS` - Find donors within radius
- `GEOADD` - Add donor location
- `ZREM` - Remove donor
- `ZCARD` - Count online donors

### Benefits
- **Fast lookups:** O(log(N) + M) for radius search
- **Memory efficient:** ~100 bytes per donor
- **Automatic expiration:** 30 minutes of inactivity

## 3. PostgreSQL Triggers & LISTEN/NOTIFY

### Purpose
- Database-driven realtime events
- Automatic fan-out on data changes
- Zero polling overhead

### Triggers

**Emergency Created:**
```sql
AFTER INSERT ON blood_requests
→ NOTIFY 'emergency_created'
→ Node.js receives → Emit to WebSocket rooms
```

**Emergency Response:**
```sql
AFTER INSERT ON blood_request_responses
→ NOTIFY 'emergency_response'
→ Node.js receives → Emit to emergency room
```

**Emergency Status Update:**
```sql
AFTER UPDATE ON blood_requests (status changed)
→ NOTIFY 'emergency_status_update'
→ Node.js receives → Emit to emergency room
```

**Hospital Status Update:**
```sql
AFTER UPDATE ON hospitals (emergency/is_active changed)
→ NOTIFY 'hospital_status_update'
→ Node.js receives → Emit to region room
```

**Blood Inventory Update:**
```sql
AFTER INSERT/UPDATE ON blood_inventory
→ NOTIFY 'blood_inventory_update'
→ Node.js receives → Broadcast to interested parties
```

### Flow

1. **Database Change** → Trigger fires
2. **NOTIFY** → PostgreSQL sends notification
3. **pg-listen** → Node.js receives via LISTEN
4. **Process** → Parse payload, emit to WebSocket
5. **Clients** → Receive real-time update

## 4. Notification Queue (BullMQ)

### Purpose
- Reliable push notification delivery
- Rate limiting and throttling
- Retry logic for failures
- SMS fallback for critical emergencies

### Queue Structure

**Queue:** `emergency-notifications`

**Job Types:**
- `emergency_push` - FCM push notification
- `emergency_sms` - SMS fallback

**Job Data:**
```json
{
  "type": "emergency_push",
  "recipient": "fcm_token_or_phone",
  "data": {
    "emergencyId": "uuid",
    "bloodGroup": "O+",
    "urgency": "critical",
    "hospitalName": "...",
    "title": "...",
    "body": "..."
  }
}
```

### Flow

1. **Emergency Created** → Find nearby donors
2. **Enqueue Jobs** → Add to BullMQ queue
3. **Worker Processes** → Send FCM/SMS
4. **Retry on Failure** → Exponential backoff
5. **Track Status** → Monitor queue health

### Rate Limiting

- **Concurrency:** 10 jobs simultaneously
- **Per-minute limit:** 100 jobs/minute
- **Retry:** 3 attempts with exponential backoff

## 5. Emergency Fan-Out Flow

### Step-by-Step

1. **User Creates Emergency**
   ```
   POST /api/v1/blood-requests
   → validateBloodRequest()
   → createEmergency()
   ```

2. **Find Nearby Donors**
   ```
   → getNearbyDonors(lat, lng, radius, bloodGroup)
   → Redis GEO lookup (fast)
   → Fallback to PostgreSQL (if Redis unavailable)
   ```

3. **Fan-Out via Multiple Channels**

   **A. WebSocket (Immediate)**
   ```
   → Emit to region:{countryCode} room
   → Emit to emergency:{id} room
   → Direct emit to nearby donors' socket IDs
   ```

   **B. Push Notifications (Background)**
   ```
   → Enqueue FCM jobs for all nearby donors
   → Worker sends push notifications
   → Critical emergencies also enqueue SMS
   ```

   **C. PostgreSQL NOTIFY (Automatic)**
   ```
   → Trigger fires on INSERT
   → pg-listener receives notification
   → Additional fan-out to WebSocket rooms
   ```

4. **Track Responses**
   ```
   → Donor responds via WebSocket or API
   → Update database
   → Emit to emergency room
   → Update requester's screen in real-time
   ```

## 6. Donor Presence Flow

### Availability Toggle

1. **Donor Sets "Available Now"**
   ```
   PATCH /api/v1/donors/me/presence
   → updateDonorPresence(userId, {lat, lng, ...})
   → Store in Redis hash
   → Add to Redis GEO index
   → Join 'donors:available' WebSocket room
   ```

2. **Emergency Created**
   ```
   → Query Redis GEO for nearby available donors
   → Filter by blood group
   → Get socket IDs from presence hash
   → Direct emit to donors' sockets
   ```

3. **Donor Goes Offline**
   ```
   → Remove from Redis
   → Remove from GEO index
   → Leave 'donors:available' room
   → Clean up in 30 minutes (expiration)
   ```

## 7. Mobile App Integration

### WebSocket Client

```javascript
import io from 'socket.io-client';

const socket = io(API_BASE_URL, {
  auth: { token: jwtToken },
  transports: ['websocket', 'polling']
});

// Join emergency room
socket.emit('emergency:join', emergencyId);

// Listen for updates
socket.on('emergency:status-updated', (data) => {
  // Update UI in real-time
});

// Update presence
socket.emit('donor:update-presence', {
  isAvailable: true,
  latitude: currentLat,
  longitude: currentLng
});
```

### Push Notifications (FCM)

```javascript
// Register token on app start
messaging().getToken().then(token => {
  // POST /api/v1/users/me/tokens
  api.post('/users/me/tokens', {
    token,
    tokenType: 'fcm',
    deviceType: 'android'
  });
});

// Handle notification
messaging().onMessage(payload => {
  // Show in-app notification
  // Navigate to emergency screen
});
```

## 8. Performance Considerations

### Scalability

- **Redis GEO:** Handles 1M+ donors efficiently
- **WebSocket rooms:** O(1) emit to room
- **PostgreSQL LISTEN:** Zero polling overhead
- **BullMQ:** Horizontal scaling with multiple workers

### Latency Targets

- **Emergency Creation → Donor Notification:** < 500ms
- **WebSocket emit:** < 50ms
- **Push notification delivery:** < 2s (FCM)
- **SMS delivery:** < 5s

### Resource Usage

- **Redis:** ~10MB per 100k active donors
- **PostgreSQL:** Minimal overhead (triggers are cheap)
- **WebSocket:** ~2KB per connection
- **BullMQ:** ~1KB per queued job

## 9. Reliability & Failover

### Redis Failover
- Fallback to PostgreSQL geo-queries
- Graceful degradation (slower but works)

### WebSocket Failover
- Automatic reconnection
- Heartbeat (ping/pong) to detect dead connections
- Clients can poll API if WebSocket unavailable

### Notification Failover
- SMS fallback for critical emergencies
- Retry logic with exponential backoff
- Dead letter queue for permanent failures

## 10. Monitoring

### Health Checks

```javascript
GET /health
→ Check PostgreSQL connection
→ Check Redis connection
→ Check BullMQ queue stats
→ Check WebSocket connections count
```

### Metrics

- Active WebSocket connections
- Emergency creation rate
- Notification queue depth
- Donor presence count
- Redis memory usage
- PostgreSQL trigger notifications/sec

## Implementation Checklist

- [x] Socket.IO server setup
- [x] Redis presence tracking
- [x] PostgreSQL triggers
- [x] PostgreSQL LISTEN client
- [x] Emergency fan-out service
- [x] Donor presence API
- [x] BullMQ notification queue
- [x] FCM push notifications
- [x] SMS fallback
- [ ] Mobile app WebSocket client
- [ ] Mobile app FCM integration
- [ ] Monitoring dashboard
- [ ] Load testing

## Next Steps

1. **Test Realtime Flow:**
   - Create emergency → Verify WebSocket emit
   - Check push notifications
   - Verify donor presence tracking

2. **Mobile App Integration:**
   - Add Socket.IO client
   - Implement FCM registration
   - Handle real-time updates in UI

3. **Load Testing:**
   - Test with 10k concurrent connections
   - Measure emergency fan-out latency
   - Verify Redis geo-query performance

4. **Monitoring:**
   - Set up health check alerts
   - Monitor queue depth
   - Track notification delivery rates

