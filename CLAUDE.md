# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cronoapp** is a React Native time tracking app built with Expo 54, Firebase, and native iOS Live Activities (Dynamic Island). It allows users to organize activities into life areas, track time entries, and view reports. The app features a native iOS widget extension for displaying active timers in the Dynamic Island.

## Build Commands

### Development
```bash
# Start Expo development server
npm start

# Run on iOS (requires Mac with Xcode)
npm run ios

# Run on Android
npm run android

# Run on web
npm run web

# Prebuild native projects (generates ios/android directories)
npx expo prebuild

# Clean rebuild
npx expo prebuild --clean
```

### iOS Widget Extension Setup
The app includes a native iOS Widget Extension for Dynamic Island support. See `WIDGET_SETUP.md` for detailed instructions on creating the `CronoActivityWidget` target in Xcode.

**Key files:**
- `ios/CronoActivityWidget/CronoActivityWidget.swift` - Widget UI
- `modules/live-monitor/ios/LiveMonitorModule.swift` - Native bridge for Live Activities
- `modules/live-monitor/index.ts` - React Native interface

## Architecture Overview

### Core Technology Stack
- **Framework**: Expo 54 with Expo Router (file-based routing)
- **Backend**: Firebase (Auth + Firestore)
- **State Management**: Zustand (settings, i18n), TanStack Query (data fetching)
- **UI**: React Native 0.81.5, Reanimated 4.2.1, Gesture Handler 2.28
- **Native Features**: Expo Notifications, Expo Secure Store, Expo Haptics
- **Custom Native Module**: `live-monitor` (iOS Live Activities + Android notifications)

### Project Structure

**App Routes** (`app/` directory):
- `(tabs)/` - Main authenticated tabs (index, calendar, reports, settings)
  - `index.tsx` - Timer screen (start/stop activities)
  - `calendar.tsx` - Weekly calendar view with drag-to-edit entries
  - `reports.tsx` - Time analytics and charts
  - `settings.tsx` - Theme, language, data management
- `login.tsx` - Firebase authentication screen
- `onboarding/index.tsx` - First-run template selection
- `manage-data.tsx` - CRUD for Life Areas and Activities
- `_layout.tsx` - Root layout with auth routing logic

**Core Libraries** (`src/lib/`):
- `firebase.ts` - Firebase initialization with React Native persistence
- `api.ts` - Firestore API layer (CRUD for lifeAreas, activities, timeEntries)
- `store.ts` - Zustand stores (i18n, settings, theme)
- `i18n.ts` - i18next configuration (Italian + English)
- `notifications.ts` - Expo notifications setup

**Data Models** (`src/types/index.ts`):
- `LifeArea` - Top-level category (e.g., "Lavoro", "Salute")
- `Activity` - Trackable activity linked to a Life Area
- `TimeEntry` - Time tracking record with start/end timestamps
- `UserProfile` - User metadata (onboarding status)

**Native Module** (`modules/live-monitor/`):
- iOS: ActivityKit integration for Live Activities
- Android: Persistent notification with timer
- Shared API: `start()`, `stop()`, `update()`

### Key Architectural Patterns

**Authentication Flow**:
1. `app/_layout.tsx` listens to `onAuthStateChanged`
2. Creates user profile in Firestore on first login
3. Routes to `/onboarding` if `onboarded: false`
4. Routes to `/(tabs)` after onboarding complete
5. Uses `useProtectedRoute()` hook for route guards

**Data Fetching**:
- TanStack Query with queryKeys like `["activities", userId]`
- Real-time active timer: `api.getActiveEntry()` uses Firestore `onSnapshot`
- Calendar queries: `api.getEntriesByRange()` with fallback for missing composite indexes

**Timer Lifecycle**:
1. User taps activity → `startTimerMutation` → creates `timeEntry` with `endTime: null`
2. `LiveMonitor.start()` initiates iOS Live Activity or Android notification
3. Active timer shown with real-time countdown
4. User taps stop → `stopTimerMutation` → sets `endTime`, calls `LiveMonitor.stop()`
5. If timer < 60s, entry is deleted instead of saved

**Theme System**:
- Theme tokens in `src/theme/tokens.ts`
- Settings store tracks "light" | "dark" | "system"
- `useAppColorScheme()` resolves final theme
- React Navigation theme provider wraps app

**Internationalization**:
- i18next with AsyncStorage persistence
- Language stored in Zustand: `useI18nStore`
- Translations in `src/lib/i18n.ts` (inline for now)

### Firebase Firestore Schema

**Collections**:
- `users/{uid}` - User profile with `onboarded` flag
- `lifeAreas` - Life area documents with `userId`, `name`, `color`
- `activities` - Activity documents with `userId`, `lifeAreaId`, `name`, `color`
- `timeEntries` - Time tracking records with `userId`, `activityId`, `startTime`, `endTime`

**Security Rules** (not in repo):
- All queries filtered by `userId` in `api.ts`
- User must be authenticated (`auth.currentUser`)

**Index Requirements**:
- Composite index: `userId ASC, startTime ASC` for `getEntriesByRange()`
- Fallback: client-side filtering if index missing

### Native Module Architecture

**iOS Live Activities** (`modules/live-monitor/ios/`):
- `LiveMonitorModule.swift` exposes `start()`, `stop()`, `update()` to React Native
- Uses ActivityKit to create/update Live Activity
- Attributes struct: `CronoActivityAttributes` with `activityName`, `activityColor`, `startTime`
- Widget extension (`ios/CronoActivityWidget/`) renders Dynamic Island UI

**Android Persistent Notifications** (`modules/live-monitor/android/`):
- `LiveMonitorModule.kt` creates foreground service notification
- Updates notification every second with elapsed time
- Notification shows activity name, color, and timer

**Shared Interface** (`modules/live-monitor/index.ts`):
```typescript
const LiveMonitor = {
  start(data: { activityName: string; activityColor: string; startTime: number }): Promise<void>
  stop(): Promise<void>
  update(data: { activityName: string; activityColor: string; startTime: number }): Promise<void>
}
```

### Calendar View Features

**Interactive Timeline** (`app/(tabs)/calendar.tsx`):
- 24-hour scrollable timeline with hour markers
- Time entries rendered as colored blocks positioned by time
- Gesture-based editing:
  - **Drag card**: Move entry to different time (pan gesture)
  - **Drag bottom handle**: Resize entry duration
  - **Tap card**: Select for quick adjustments (+/- 15min buttons)
- Week navigation with arrow buttons
- Manual entry creation via floating action button

**Collision Handling**:
- Entries can overlap (no collision prevention)
- z-index management during drag operations

### Environment Configuration

**Required Environment Variables** (`.env` or Expo config):
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

### Development Notes

- **Expo Go Limitations**: Live Activities and Widget Extension require development build (`npx expo prebuild` + Xcode)
- **iOS Simulator**: Widgets show on lock screen but NOT Dynamic Island (requires physical iPhone 14 Pro+)
- **Permissions**: Notifications require runtime permission request
- **Firestore Offline**: Firebase uses React Native AsyncStorage for persistence
- **Reanimated**: Worklets run on UI thread; use `runOnJS()` for React state updates
- **Hot Reload**: Works for JS changes, but native module changes require rebuild
