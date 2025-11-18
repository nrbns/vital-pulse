# Pulse - Safety & Disclaimer Documentation

## Critical Safety Features

Pulse implements multiple layers of safety to protect users from fake requests, privacy leaks, and abuse.

## 1. Mandatory Verification Fields

**Every blood request MUST include:**

- ✅ **Hospital Name** (mandatory)
- ✅ **Hospital Bed/Ward Number** (mandatory)

**Why:** Prevents fake/hoax requests. Anyone can verify a request by calling the hospital and asking about the bed/ward number.

**Enforcement:** API rejects requests without these fields.

## 2. Request Visibility & Radius

- **Default radius:** 30km
- **Auto-limit:** Requests only visible to donors within configured radius
- **Why:** Reduces spam impact, keeps requests localized

## 3. Auto-Moderation System

### Report Flow

1. **User reports** fake/abuse/spam/harassment
2. **Report counter** increments on request
3. **After 3 reports:** Request automatically hidden
4. **User temporarily banned** for 24 hours
5. **Report reviewed** by admins (if available)

### Report Types

- `fake_request` - Request appears to be fake/hoax
- `abuse` - Abusive behavior
- `spam` - Spam/repeated requests
- `harassment` - Harassment
- `wrong_info` - Incorrect information

## 4. Rate Limiting

### Blood Requests
- **Maximum:** 3 requests per 24 hours per user
- **Window:** 24 hours rolling
- **Why:** Prevents spam flooding

### Calls
- **Maximum:** 3 calls per 24 hours per user
- **Why:** Prevents overwhelming hospitals

**Enforcement:** Hard limit at API level. Returns `429 Rate Limit Exceeded` when limit reached.

## 5. Privacy Protection

### Phone Number Masking

- **Never show direct phone numbers** in API responses
- **All communication** through masked proxy numbers (Twilio)
- **In-app messaging** auto-deletes after 48 hours
- **Display format:** `+91****1234` (only last 4 digits visible)

### Privacy Settings

Users can configure:

- `showPhone`: Never (default: false)
- `showName`: Yes/No (default: true)
- `availabilityMode`: 
  - `always` - Always available
  - `weekends_only` - Only on weekends
  - `emergency_only` - Only for emergencies
- `contactPreference`:
  - `in_app_only` - Only through app (default)
  - `hospitals_only` - Hospitals can contact directly
  - `all` - Anyone can contact

## 6. Ban System

### Temporary Bans

- **Trigger:** 3+ reports on blood request
- **Duration:** 24 hours
- **Auto-expire:** Automatically lifted after 24 hours
- **Appeal:** Can contact support

### Permanent Bans

- **Manual review** required
- **Reasons:** Severe abuse, organ trafficking attempts, repeat violations

## 7. Legal Disclaimer

### Mandatory Acceptance

**All users MUST accept disclaimer before using the platform.**

### Disclaimer Text

```
IMPORTANT DISCLAIMER - PLEASE READ CAREFULLY

1. Community Platform, Not Medical Service
   Pulse is a community platform that connects blood donors with people in need.
   We are NOT a medical service, hospital, or blood bank.
   We do NOT store, test, or transfuse blood.
   We only facilitate connections between registered users and verified medical facilities.

2. No Guarantees
   We CANNOT guarantee that:
   - Blood will be available
   - Donors will respond
   - Blood matches will be successful
   - All information provided is accurate
   
   Always verify blood availability directly with hospitals or blood banks before
   relying on any information from this platform.

3. Your Responsibility
   You are solely responsible for:
   - Verifying the legitimacy of any blood request
   - Confirming blood availability with hospitals directly
   - Ensuring proper medical procedures are followed
   - Validating donor information before arranging donations
   - NEVER exchanging money for blood donations on this platform

4. Mandatory Information
   Every blood request MUST include:
   - Hospital name
   - Bed/ward number for verification
   
   Requests without this information will be rejected to prevent fake/hoax requests.

5. Privacy & Safety
   Your phone number is never shown directly to other users.
   All communication happens through masked numbers or in-app messaging.
   Report any abuse, fake requests, or harassment immediately using the report button.

6. Auto-Moderation
   Blood requests automatically hide after 3 reports.
   Users who create fake requests may be temporarily banned.
   Rate limits apply: maximum 3 blood requests per 24 hours per user,
   maximum 3 calls per day.

7. No Liability
   Pulse, its developers, and contributors are NOT liable for:
   - Any medical complications
   - Failed donations
   - Infections or health issues
   - Incorrect hospital information
   - Donors not showing up
   
   This platform is provided "AS IS" with NO WARRANTIES of any kind.

8. Open Source
   This platform is open-source software licensed under Apache 2.0.
   Use at your own risk.
   By continuing, you acknowledge that you have read, understood, and agree
   to these terms.
```

### API Endpoints

- `GET /api/v1/safety/disclaimer` - Get disclaimer text
- `POST /api/v1/safety/disclaimer/accept` - Accept disclaimer (required)

## 8. Content Moderation

### Auto-Moderated Keywords

**Money-related:** Automatically flag requests mentioning:
- Payment
- Money
- Price
- Cost
- Fee
- Paid donation

**Why:** Prevents organ trafficking / black-market blood sales

**Action:** Request rejected, user warned, repeat offenders banned

## 9. Hospital Verification

### Self-Registration

- Hospitals register themselves
- Upload verification documents
- Admin reviews (optional in MVP)

### Request Verification

- Hospital can "verify" a blood request with 1 click
- Verified badge shown on request
- Increases trust

## 10. Fallback Data Sources

### Hospital Data

- **Primary:** Self-registered hospitals
- **Fallback:** OpenStreetMap
- **Government:** data.gov.in (India), local government lists
- **Disclaimer shown:** "Data source: [Source Name]"

### Why

Reduces risk of wrong directions if self-registered data is incomplete.

## Risk Matrix

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| Fake requests | High | Mandatory hospital + bed number, 3-report auto-hide | ✅ MVP |
| Privacy leaks | High | Masked phone numbers, in-app only messaging | ✅ MVP |
| Wrong hospital data | Critical | Multiple data sources, community flagging | ✅ MVP |
| Liability | High | Mandatory disclaimer, "AS IS" terms | ✅ MVP |
| Organ trafficking | Medium | Auto-moderate money keywords | ✅ MVP |
| Spam flooding | Medium | Rate limiting (3 requests/day) | ✅ MVP |
| Regulatory issues | Medium | Clear "directory only" positioning | ✅ MVP |
| Scalability | Medium | PostGIS + Redis GEO, efficient queries | ✅ MVP |

## Implementation Checklist

- [x] Mandatory hospital name validation
- [x] Mandatory bed/ward number validation
- [x] Report system with auto-hide after 3 reports
- [x] Rate limiting (3 requests/day, 3 calls/day)
- [x] Phone number masking
- [x] Privacy settings
- [x] Ban system (temporary)
- [x] Disclaimer API
- [x] Request visibility radius (30km default)
- [ ] Auto-moderate money keywords (TODO: Add to validation)
- [ ] Hospital verification flow (TODO: Add to hospital routes)
- [ ] Fallback data sources integration (TODO: Add to emergency routes)

## Compliance

### Country-Specific

Each country may have specific regulations. Region configs can include:

- `legal_disclaimer`: Country-specific disclaimer text
- `regulatory_body`: Local regulatory body name
- `compliance_notes`: Additional compliance requirements

### Example (India)

```json
{
  "legal_disclaimer": "As per Drugs and Cosmetics Act, 1940...",
  "regulatory_body": "CDSCO (Central Drugs Standard Control Organisation)",
  "compliance_notes": "Blood banks must be licensed by state FDA"
}
```

## Support & Appeals

- **Report abuse:** In-app report button
- **Appeal ban:** Contact support (email in README)
- **Data correction:** Flag hospital/request → Admin review

## Open Source Disclaimer

This platform is open-source (Apache 2.0). Use at your own risk. Contributions welcome, but safety features are non-negotiable.

