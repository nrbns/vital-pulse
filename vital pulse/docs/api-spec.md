# Pulse API Specification

## Base URL

```
Production: https://api.pulse.app/v1
Development: http://localhost:3000/v1
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Authentication Flow

1. **Request OTP**
   ```
   POST /auth/otp/request
   Body: { "phone": "+911234567890", "countryCode": "IN" }
   Response: { "success": true, "message": "OTP sent" }
   ```

2. **Verify OTP**
   ```
   POST /auth/otp/verify
   Body: { "phone": "+911234567890", "otp": "123456" }
   Response: { "success": true, "token": "jwt_token", "refreshToken": "refresh_token" }
   ```

3. **Refresh Token**
   ```
   POST /auth/refresh
   Body: { "refreshToken": "refresh_token" }
   Response: { "token": "new_jwt_token" }
   ```

## Endpoints

### User Management

#### Get Current User Profile
```
GET /users/me
Response: {
  "id": "user_id",
  "phone": "+911234567890",
  "name": "John Doe",
  "age": 30,
  "city": "Mumbai",
  "gender": "male",
  "bloodGroup": "O+",
  "roles": ["donor", "user"],
  "countryCode": "IN",
  "preferredLanguage": "en"
}
```

#### Update User Profile
```
PUT /users/me
Body: {
  "name": "John Doe",
  "age": 30,
  "city": "Mumbai",
  "gender": "male",
  "preferredLanguage": "en"
}
Response: { "success": true, "user": {...} }
```

#### Update User Location
```
PUT /users/me/location
Body: {
  "latitude": 19.0760,
  "longitude": 72.8777
}
Response: { "success": true }
```

### Donor Management

#### Register as Donor
```
POST /donors/register
Body: {
  "bloodGroup": "O+",
  "lastDonationDate": "2024-01-15",
  "healthNotes": "No known conditions",
  "availability": "weekends",
  "latitude": 19.0760,
  "longitude": 72.8777
}
Response: {
  "success": true,
  "donor": {
    "id": "donor_id",
    "userId": "user_id",
    "bloodGroup": "O+",
    "eligible": true,
    "nextDonationDate": "2024-04-15"
  }
}
```

#### Get Donor Profile
```
GET /donors/me
Response: {
  "id": "donor_id",
  "bloodGroup": "O+",
  "lastDonationDate": "2024-01-15",
  "eligible": true,
  "nextDonationDate": "2024-04-15",
  "totalDonations": 5,
  "healthNotes": "No known conditions"
}
```

#### Get Donation History
```
GET /donors/me/history
Response: {
  "donations": [
    {
      "id": "donation_id",
      "date": "2024-01-15",
      "location": "Mumbai Blood Bank",
      "bloodGroup": "O+"
    }
  ]
}
```

#### Check Eligibility
```
GET /donors/me/eligibility
Response: {
  "eligible": true,
  "nextDonationDate": "2024-04-15",
  "daysUntilEligible": 30,
  "reasons": []
}
```

### Blood Requests

#### Create Blood Request
```
POST /blood-requests
Body: {
  "bloodGroup": "O+",
  "urgency": "critical",
  "patientName": "Jane Doe",
  "hospitalName": "Mumbai General Hospital",
  "hospitalAddress": "Mumbai, India",
  "contactPhone": "+911234567890",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "notes": "Urgent surgery",
  "prescription": "base64_encoded_image" // optional
}
Response: {
  "success": true,
  "request": {
    "id": "request_id",
    "bloodGroup": "O+",
    "urgency": "critical",
    "status": "active",
    "matchedDonors": 15,
    "matchedBloodBanks": 3,
    "createdAt": "2024-02-15T10:30:00Z"
  }
}
```

#### Get Active Blood Requests
```
GET /blood-requests?latitude=19.0760&longitude=72.8777&radius=50&bloodGroup=O+
Query Parameters:
  - latitude (required)
  - longitude (required)
  - radius (optional, default: 50km)
  - bloodGroup (optional)
  - urgency (optional: critical, high, medium, low)
Response: {
  "requests": [
    {
      "id": "request_id",
      "bloodGroup": "O+",
      "urgency": "critical",
      "hospitalName": "Mumbai General Hospital",
      "distance": 5.2,
      "createdAt": "2024-02-15T10:30:00Z"
    }
  ]
}
```

#### Get Blood Request Details
```
GET /blood-requests/:id
Response: {
  "id": "request_id",
  "bloodGroup": "O+",
  "urgency": "critical",
  "patientName": "Jane Doe",
  "hospitalName": "Mumbai General Hospital",
  "hospitalAddress": "Mumbai, India",
  "contactPhone": "+911234567890",
  "distance": 5.2,
  "status": "active",
  "createdAt": "2024-02-15T10:30:00Z",
  "matchedDonors": 15,
  "matchedBloodBanks": 3
}
```

#### Respond to Blood Request
```
POST /blood-requests/:id/respond
Body: {
  "donorId": "donor_id",
  "available": true,
  "estimatedArrival": "2024-02-15T11:00:00Z"
}
Response: { "success": true, "message": "Response recorded" }
```

#### Close/Complete Blood Request
```
PATCH /blood-requests/:id/close
Body: {
  "status": "fulfilled" // or "cancelled"
}
Response: { "success": true }
```

#### Report Fake/Abuse
```
POST /blood-requests/:id/report
Body: {
  "reason": "fake_request",
  "description": "User details"
}
Response: { "success": true, "message": "Report submitted" }
```

### Emergency Services

#### Find Nearest Hospitals
```
GET /emergency/hospitals?latitude=19.0760&longitude=72.8777&radius=25&emergency=true
Query Parameters:
  - latitude (required)
  - longitude (required)
  - radius (optional, default: 25km)
  - emergency (optional, default: true)
  - openNow (optional, default: false)
Response: {
  "hospitals": [
    {
      "id": "hospital_id",
      "name": "Mumbai General Hospital",
      "address": "Mumbai, India",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "distance": 2.5,
      "eta": "10 minutes",
      "emergency": true,
      "openNow": true,
      "phone": "+911234567890",
      "rating": 4.5
    }
  ]
}
```

#### Get Hospital Details
```
GET /emergency/hospitals/:id
Response: {
  "id": "hospital_id",
  "name": "Mumbai General Hospital",
  "address": "Mumbai, India",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "phone": "+911234567890",
  "emergency": true,
  "operatingHours": {
    "monday": "24/7",
    "tuesday": "24/7",
    ...
  },
  "specialties": ["Cardiology", "Emergency Medicine"],
  "rating": 4.5,
  "verified": true
}
```

#### Find Nearest Blood Banks
```
GET /emergency/blood-banks?latitude=19.0760&longitude=72.8777&radius=50&bloodGroup=O+
Query Parameters:
  - latitude (required)
  - longitude (required)
  - radius (optional, default: 50km)
  - bloodGroup (optional)
Response: {
  "bloodBanks": [
    {
      "id": "bloodbank_id",
      "name": "Mumbai Blood Bank",
      "address": "Mumbai, India",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "distance": 5.2,
      "phone": "+911234567890",
      "inventory": {
        "O+": "available",
        "O-": "low",
        "A+": "available"
      }
    }
  ]
}
```

### Hospital/Blood Bank Management

#### Register Hospital/Blood Bank
```
POST /hospitals/register
Body: {
  "name": "Mumbai General Hospital",
  "type": "hospital", // or "blood_bank", "clinic"
  "address": "Mumbai, India",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "phone": "+911234567890",
  "emergency": true,
  "operatingHours": {...},
  "verificationDocuments": "base64_encoded_documents"
}
Response: {
  "success": true,
  "hospital": {
    "id": "hospital_id",
    "name": "Mumbai General Hospital",
    "verified": false,
    "verificationStatus": "pending"
  }
}
```

#### Update Hospital Profile
```
PUT /hospitals/me
Body: {
  "operatingHours": {...},
  "emergency": true,
  "phone": "+911234567890"
}
Response: { "success": true, "hospital": {...} }
```

#### Update Blood Inventory (Blood Banks)
```
PUT /hospitals/me/inventory
Body: {
  "O+": "available", // available, low, out_of_stock
  "O-": "low",
  "A+": "available",
  ...
}
Response: { "success": true }
```

### Events (Donation Camps)

#### List Upcoming Events
```
GET /events?latitude=19.0760&longitude=72.8777&radius=50&upcoming=true
Query Parameters:
  - latitude (optional)
  - longitude (optional)
  - radius (optional)
  - upcoming (optional, default: true)
Response: {
  "events": [
    {
      "id": "event_id",
      "name": "Blood Donation Camp",
      "organizer": "Mumbai Blood Bank",
      "date": "2024-03-15",
      "time": "10:00",
      "address": "Mumbai, India",
      "latitude": 19.0760,
      "longitude": 72.8777,
      "distance": 5.2,
      "registeredCount": 50
    }
  ]
}
```

#### Get Event Details
```
GET /events/:id
Response: {
  "id": "event_id",
  "name": "Blood Donation Camp",
  "organizer": "Mumbai Blood Bank",
  "date": "2024-03-15",
  "time": "10:00",
  "address": "Mumbai, India",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "description": "Monthly blood donation camp",
  "registeredCount": 50,
  "maxCapacity": 100
}
```

#### Register for Event
```
POST /events/:id/register
Body: {
  "userId": "user_id",
  "donorId": "donor_id"
}
Response: { "success": true, "message": "Registered successfully" }
```

#### Create Event (NGO/Hospital)
```
POST /events
Body: {
  "name": "Blood Donation Camp",
  "date": "2024-03-15",
  "time": "10:00",
  "address": "Mumbai, India",
  "latitude": 19.0760,
  "longitude": 72.8777,
  "description": "Monthly blood donation camp",
  "maxCapacity": 100
}
Response: {
  "success": true,
  "event": {
    "id": "event_id",
    "name": "Blood Donation Camp",
    ...
  }
}
```

### Region Configuration

#### Get Region Configuration
```
GET /regions/:countryCode/config
Response: {
  "countryCode": "IN",
  "countryName": "India",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "hi", "ta", ...],
  "donationIntervalDays": 90,
  "minDonorAge": 18,
  "maxDonorAge": 65,
  "emergencyNumbers": {
    "ambulance": "108",
    "police": "100",
    "fire": "101"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // optional additional details
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid authentication token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

- **General API**: 100 requests per minute per IP
- **OTP Request**: 3 requests per phone number per hour
- **Blood Request Creation**: 5 requests per user per day
- **Hospital Search**: 30 requests per minute per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642252800
```

## Pagination

List endpoints support pagination:

```
GET /endpoint?page=1&limit=20
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## Webhooks (Future)

Webhooks will be available for hospitals and NGOs to receive real-time notifications for:
- New blood requests in their area
- Donor responses
- Event registrations

## Versioning

API versioning is done via URL path: `/v1/`, `/v2/`, etc.

Breaking changes will result in a new version number.

