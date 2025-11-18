# 🌐 Frontend & UI/UX Setup Guide

## ✅ Web Frontend (Browser Preview)

**The web frontend is now running!** This lets you see and test the UI/UX in your browser without needing Android Studio or Xcode.

### Access Web Frontend

🌐 **Open in browser:** http://localhost:3001

### Features

- ✅ All mobile app screens converted to web components
- ✅ Regional adaptation (colors, languages, emergency numbers)
- ✅ Interactive UI components (Emergency button, Hospital cards)
- ✅ Responsive design (mobile-first, works on desktop too)
- ✅ Connected to backend API (http://localhost:3000)

### Start Web Frontend

```powershell
cd web-frontend
npm run dev
```

The web app will start on **http://localhost:3001**

---

## 📱 Mobile App (React Native)

### Setup

```powershell
cd mobile-app

# Install dependencies (use legacy peer deps to fix React version conflict)
npm install --legacy-peer-deps

# Create index.js entry point (already created)
```

### Run Mobile App

**For Android (requires Android Studio):**
```powershell
npm run android
```

**For iOS (requires Xcode on Mac):**
```powershell
npm run ios
```

**Start Metro Bundler:**
```powershell
npm start
```

---

## 🎨 UI/UX Features

### Screens Available

1. **Onboarding Screen** - Region setup + role selection
2. **Login Screen** - OTP authentication
3. **Home Screen** - Emergency button + personalized feed
4. **Emergency Screen** - One-tap panic button + hospital map
5. **Blood Request Screen** - Create/view emergencies
6. **Donor Screen** - Availability toggle + eligibility
7. **Profile Screen** - User settings

### Components

- **EmergencyButton** - Pulsing red button with haptic feedback
- **HospitalCard** - Adaptive hospital cards with call/navigate
- **OfflineBanner** - Network status indicator

### Regional Adaptation

- Auto-detects country from GPS/device locale
- Loads region config from backend API
- Adaptive colors (IN: red, NG: green, BR: pink, US: blue)
- Regional emergency numbers (108, 112, 911, etc.)
- Language switching

---

## 🚀 Quick Access

### Currently Running

- ✅ **Backend API:** http://localhost:3000
- ✅ **Web Frontend:** http://localhost:3001 (just started)

### To Run Everything

1. **Backend:**
   ```powershell
   cd backend
   npm run dev
   ```

2. **Web Frontend (in new terminal):**
   ```powershell
   cd web-frontend
   npm run dev
   ```

3. **Mobile App (in new terminal, optional):**
   ```powershell
   cd mobile-app
   npm start
   ```

---

## 📝 Notes

- Web frontend is a **preview/demo** of the mobile app UI
- Full React Native mobile app is in `/mobile-app`
- Both use the same backend API at `http://localhost:3000`
- Regional adaptation works in both web and mobile

---

**Need help?** Check the browser console for any errors, or see `web-frontend/README.md` for details.

