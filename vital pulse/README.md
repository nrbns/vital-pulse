# Pulse 🩸🌍

**The world's open-source emergency blood + hospital platform**

One app that works in 150+ countries from day one.

---

When someone needs blood or is having a heart attack at 3 AM,  
there is no "India version" or "Africa version" of panic.

**Pulse is one single app that saves lives everywhere:**
- Need blood → instantly find donors + blood banks near you
- Medical emergency → nearest hospital + one-tap call/navigate
- Want to donate → camps, eligibility tracker, badges, global impact

Built to work on $20 phones and 2G networks in rural Nigeria,  
and on iPhones in New York — same codebase, same speed.

---

## 🚀 Why Pulse Will Win Globally

- ✅ **100% open-source** (Apache 2.0)
- ✅ **Region config system** — add a new country in one JSON file
- ✅ **Offline-first hospital cache**
- ✅ **Works with local emergency numbers automatically**
- ✅ **Supports 100+ languages** (crowdsourced translations)
- ✅ **No venture capital. No data selling. No ads. Ever.**

---

## 🎯 Product Vision

An **open-source emergency health platform** that helps people:

* Find **blood** in emergencies
* Locate **nearest hospitals/clinics** fast
* Discover and join **blood donation camps**
* Build a **verified community of donors & helpers**

Think of it as: **"Blood + Emergency + Nearby Hospitals" in one open app.**

---

## 👥 User Types

1. **Normal User / Patient / Family**
2. **Blood Donor**
3. **Hospital / Clinic**
4. **Blood Bank**
5. **NGO / Camp Organiser**
6. **Admin** (platform-level)

---

## 📱 Features Overview

### 🟢 MVP Features (First Public Release)

#### A. Accounts & Profiles
- Phone-based sign up/login (OTP)
- Select role: Donor / Needing Blood / Both
- Basic profile: name, age, city, gender (optional), language
- Blood group, last donation date, health notes (e.g., "diabetic", "BP")

#### B. Blood Donation System
- Register as donor with blood group, location, availability
- Emergency request for blood (patient name, hospital, blood group, urgency)
- Matching engine: notify nearby donors + blood banks
- Donation history with eligibility tracking

#### C. Emergency Mode (Hospital/Clinic Finder)
- Big **EMERGENCY** button on home screen
- Auto-detect location and show nearest hospitals/clinics
- Distance, ETA, "Open/Closed" status
- One-tap: Call hospital, Navigate on maps

#### D. Hospital, Clinic & Blood Bank Features
- Registration portal for hospitals/blood banks
- Add/update: address, timings, emergency availability, contact numbers

#### E. Donation Camps & Events
- List upcoming blood donation camps (date, time, location, host)
- Users can register for camp and get reminder notifications

#### G. Communication Layer
- Secure communication via call button

#### H. Safety, Verification & Anti-misuse
- Terms & safety guidelines screen
- Report abuse / fake request button

#### I. Tech & System Features
- Multi-language UI (English + region-specific languages)
- Light-weight app – works on low-end phones
- Works on slow networks

### 🟡 Phase 2 Features

- Emergency contacts (family, friend)
- Rare group registry (AB-, Bombay phenotype)
- Share live location to contacts (WhatsApp/SMS)
- In-app "I need help" broadcast
- Blood inventory (group-wise stock approximation)
- Capacity indicators ("Beds available: Low/Medium/High")
- Hospital dashboard (incoming requests, donation/stock stats)
- Create community drives (college/company level)
- Badges for donors ("First-Time Donor", "Life Saver x5", etc.)
- City/college/company leaderboards (anonymized)
- Anonymous impact stories
- In-app masked chat (hide personal numbers)
- Pre-built message templates
- Hospital verification (document upload)
- Optional ID check for donors (NGO use)
- Offline caching of nearby hospitals & blood banks

### 🔵 Advanced / Future Features

- Link wearables (smartwatches, etc.)
- Cross-region requests (if no local donors)
- Integration with ambulance APIs / local govt systems
- Fall detection / auto-trigger from wearables
- Integration with hospital internal systems (HIS/LIS)
- Public campaign pages (shareable links, posters)
- Team-based donation challenges (Companies/colleges)
- Fraud detection (AI: repeated fake requests, etc.)
- Region packs: configuration per country/state for rules

---

## 🧱 Tech Stack

### Frontend (Mobile App)
- **React Native** (Android + iOS from single codebase)
- Push notifications: Firebase Cloud Messaging
- Maps: Google Maps API / Mapbox / OpenStreetMap

### Backend (API)
- **Node.js (Express/NestJS)** or **Python FastAPI**
- REST or GraphQL APIs
- Authentication: JWT
- Role-based access control (user/donor/hospital/admin)

### Database
- **PostgreSQL** (relational, safe)
  - Tables: users, donors, hospitals, blood_banks, requests, events, reports
- **Redis** (optional)
  - Caching nearby points, notification queues, rate limits

### Integrations
- Maps: Google Maps API / OpenStreetMap + Nominatim
- SMS: Twilio / local providers (India – MSG91, etc.)
- Push: Firebase Cloud Messaging
- Email (optional): AWS SES / SendGrid

---

## 🌍 Add Your Country in <5 Minutes

Want Pulse in your country tomorrow?

Just open a PR adding:

```json
/regions/your-country-code/config.json
```

We merge in <24h and millions of people get life-saving features instantly.

We already have configs ready for 20+ countries. Yours could be next.

### Current Regions (Ready for MVP)

| Country      | Status | Notes                                  |
|--------------|--------|----------------------------------------|
| India        | ✅     | Full config                           |
| Bangladesh   | ✅     | Bangla language                       |
| Pakistan     | ✅     | Urdu language                         |
| Indonesia    | ✅     | 56-day donation interval              |
| Philippines  | ✅     | Tagalog + 56-day interval             |
| Nigeria      | ✅     | Emergency number 112                  |
| Kenya        | ✅     | Full config                           |
| Brazil       | ✅     | Portuguese + 90-day interval          |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (for backend)
- React Native CLI (for mobile app)
- PostgreSQL 14+
- Redis (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/pulse-global/pulse.git
cd pulse
```

2. **Set up backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database and API keys
npm run dev
```

3. **Set up mobile app**
```bash
cd mobile-app
npm install
# For iOS
cd ios && pod install && cd ..
npm run ios
# For Android
npm run android
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

---

## 📁 Project Structure

```
pulse/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── docs/
│   ├── architecture.md
│   ├── api-spec.md
│   └── contribution-guide.md
├── backend/
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── mobile-app/
│   ├── src/
│   ├── android/
│   ├── ios/
│   └── package.json
├── web-dashboard/   (optional, phase 2)
│   ├── src/
│   └── package.json
├── regions/
│   ├── IN/          (India)
│   ├── ID/          (Indonesia)
│   ├── NG/          (Nigeria)
│   └── ...
└── .github/
    ├── ISSUE_TEMPLATE.md
    └── PULL_REQUEST_TEMPLATE.md
```

---

## 🤝 Contributing

We welcome contributions! Whether it's:
- Adding a new country/region configuration
- Fixing bugs
- Adding new features
- Improving documentation
- Translating the app

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Join the Mission

This isn't another donor directory.  
This is the app that ends unnecessary deaths from blood + emergency delays — **worldwide**.

**Star. Fork. Add your country. Save lives.**

→ [github.com/pulse-global/pulse](https://github.com/pulse-global/pulse)

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/pulse-global/pulse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/pulse-global/pulse/discussions)
- **Email**: contact@pulse.app (coming soon)

---

## 🌟 Acknowledgments

- All contributors who make this project possible
- Open-source community
- Healthcare workers and blood donors worldwide

---

**Made with ❤️ for saving lives globally**

