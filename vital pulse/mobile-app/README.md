# Pulse Mobile App

React Native mobile application for the Pulse emergency health platform.

## Tech Stack

- **React Native** - Cross-platform mobile framework
- **React Navigation** - Navigation
- **React Native Maps** - Map integration
- **Firebase Cloud Messaging** - Push notifications
- **React Native Location** - Location services
- **i18n** - Internationalization

## Getting Started

### Prerequisites

- Node.js 18+
- React Native CLI
- iOS: Xcode and CocoaPods
- Android: Android Studio and JDK

### Installation

```bash
npm install

# iOS
cd ios && pod install && cd ..
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
API_BASE_URL=http://localhost:3000/v1
GOOGLE_MAPS_API_KEY=your-google-maps-key
FCM_SENDER_ID=your-fcm-sender-id
```

### Running

```bash
# iOS
npm run ios

# Android
npm run android
```

## Features

- Offline-first architecture
- Multi-language support
- Region-aware UI
- Emergency hospital finder
- Blood donation requests
- Donation camps
- Push notifications

## Architecture

See [docs/architecture.md](../docs/architecture.md) for system architecture.

