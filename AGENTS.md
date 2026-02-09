# Cronoapp - AI Agent Guidelines

## Project Overview

Cronoapp is a **time tracking mobile application** built with React Native and Expo. It helps users track time spent on activities organized by "life areas" (e.g., Work, Health, Personal). The app supports iOS Live Activities (Dynamic Island), dark/light themes, and is primarily localized in Italian.

**Key Features:**
- Real-time activity timer with start/stop functionality
- Calendar view with timeline visualization and drag-to-edit entries
- Analytics reports (daily, weekly, monthly breakdowns)
- Life areas and activities management
- iOS Live Activities / Dynamic Island integration
- Push notifications
- Multi-language support (Italian default, English fallback)

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.81.5 + Expo SDK ~54.0.31 |
| Language | TypeScript 5.9 (strict mode enabled) |
| Navigation | Expo Router v6 (file-based routing) |
| Backend | Firebase (Authentication + Firestore) |
| State Management | Zustand (with persistence) |
| Data Fetching | TanStack Query (React Query) v5 |
| Animations | React Native Reanimated v4 |
| Gestures | React Native Gesture Handler |
| Icons | Lucide React Native |
| Dates | date-fns |
| i18n | i18next + react-i18next |
| Styling | React Native StyleSheet (no CSS-in-JS) |

---

## Project Structure

```
├── app/                        # Expo Router screens
│   ├── (tabs)/                 # Tab navigation group
│   │   ├── _layout.tsx         # Tab bar configuration
│   │   ├── index.tsx           # Timer screen (main)
│   │   ├── calendar.tsx        # Calendar/timeline view
│   │   ├── reports.tsx         # Analytics screen
│   │   └── settings.tsx        # Settings & data management
│   ├── _layout.tsx             # Root layout with auth protection
│   ├── login.tsx               # Authentication screen
│   ├── onboarding/             # Onboarding flow
│   │   └── index.tsx           # Template selection
│   └── manage-data.tsx         # Standalone data management
├── src/
│   ├── lib/                    # Services and utilities
│   │   ├── firebase.ts         # Firebase initialization (auth, db)
│   │   ├── api.ts              # Firestore CRUD operations
│   │   ├── i18n.ts             # i18next configuration
│   │   ├── store.ts            # Zustand stores (settings, i18n)
│   │   └── notifications.ts    # Expo notifications setup
│   ├── theme/
│   │   └── tokens.ts           # Design tokens (colors, spacing, typography)
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── modules/                    # Custom Expo native modules
│   └── live-monitor/           # iOS Live Activity module
│       ├── ios/                # Swift module implementation
│       ├── android/            # Kotlin module implementation
│       └── src/                # TypeScript types and module wrapper
├── ios/                        # iOS native project
│   └── CronoActivityWidget/    # Widget Extension for Live Activities
├── assets/                     # Static assets (images, icons)
├── package.json
├── app.json                    # Expo configuration
├── tsconfig.json
└── .env                        # Firebase config (see below)
```

---

## Build and Development Commands

```bash
# Start Expo development server
npm run start

# Run on iOS (requires Xcode)
npm run ios

# Run on Android (requires Android Studio)
npm run android

# Start web build
npm run web
```

**Prerequisites:**
- Node.js with npm
- Xcode (for iOS development)
- Android Studio (for Android development)
- Firebase project configured

---

## Environment Configuration

Create a `.env` file in the project root with these variables:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

**Note:** The `.env` file is gitignored. Never commit Firebase credentials.

---

## Data Model

### Firestore Collections

**`users/{uid}`**
- `email`: string
- `displayName`: string (optional)
- `onboarded`: boolean
- `createdAt`: timestamp

**`lifeAreas/{id}`**
- `name`: string
- `color`: hex string
- `userId`: string (owner)
- `createdAt`: timestamp

**`activities/{id}`**
- `name`: string
- `lifeAreaId`: reference
- `color`: hex string
- `userId`: string (owner)
- `createdAt`: timestamp

**`timeEntries/{id}`**
- `activityId`: reference
- `userId`: string (owner)
- `startTime`: timestamp
- `endTime`: timestamp | null
- `createdAt`: timestamp

---

## Navigation Structure

```
/                    → Redirects based on auth state
├── /login           → Authentication (login/register)
├── /onboarding      → First-time setup (template selection)
├── /(tabs)          → Main app (requires auth)
│   ├── /timer       → Activity timer (default tab)
│   ├── /calendar    → Timeline view
│   ├── /reports     → Analytics
│   └── /settings    → Profile & data management
└── /manage-data     → Standalone data management screen
```

**Auth Flow:**
1. Unauthenticated users → `/login`
2. Authenticated but not onboarded → `/onboarding`
3. Fully onboarded → `/(tabs)`

---

## Code Style Guidelines

### Formatting
- **Indentation:** 4 spaces (no tabs)
- **Quotes:** Double quotes for strings
- **Semicolons:** Required

### Naming Conventions
- **Components:** PascalCase (e.g., `TimerScreen`)
- **Hooks/Functions:** camelCase (e.g., `useAppColorScheme`)
- **Files:** camelCase for screens, PascalCase for components
- **Types/Interfaces:** PascalCase (e.g., `TimeEntry`, `LifeArea`)

### Import Organization
Group imports by origin (external first, then internal, then local):

```typescript
// 1. External libraries
import { View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

// 2. Internal modules
import { colors, spacing } from "../../src/theme/tokens";
import { api } from "../../src/lib/api";
import { auth } from "../../src/lib/firebase";

// 3. Types
import { TimeEntry, Activity } from "../../src/types";
```

### Styling Pattern
Use StyleSheet.create with theme-aware colors:

```typescript
const colorScheme = useAppColorScheme();
const themeColors = colors[colorScheme];

// In render
<View style={[styles.container, { backgroundColor: themeColors.background }]}>

// Styles at bottom
const styles = StyleSheet.create({
    container: { flex: 1 },
});
```

---

## Key Libraries Usage

### TanStack Query (React Query)
All Firestore data fetching uses React Query with proper cache invalidation:

```typescript
const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["activities", user?.uid],
    queryFn: () => api.getActivities(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutations with cache invalidation
const createActivityMutation = useMutation({
    mutationFn: (data) => api.createActivity(data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["activities"] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
    }
});
```

### Zustand Stores
- `useI18nStore`: Language preference (persisted)
- `useSettingsStore`: Theme preference, notifications (persisted)
- `useAppColorScheme()`: Computed "light" | "dark" based on preference + system

### iOS Live Activities
The custom `LiveMonitor` native module manages Dynamic Island updates:

```typescript
import LiveMonitor from "../../modules/live-monitor";

// Start live activity
await LiveMonitor.start({
    activityName: "Coding",
    activityColor: "#06B6D4",
    startTime: Date.now(),
});

// Update
await LiveMonitor.update({ ... });

// Stop
await LiveMonitor.stop();
```

---

## Testing Guidelines

**Current Status:** No automated tests are configured.

If adding tests:
- Document the framework in `package.json`
- Add test scripts (e.g., `npm run test`)
- Include scope (unit/integration/e2e) in documentation

---

## Security Considerations

1. **Firebase Rules:** Ensure Firestore security rules restrict data access to the authenticated owner (`request.auth.uid == resource.data.userId`)

2. **API Authorization:** All API functions check for authenticated user before executing:
   ```typescript
   const user = auth.currentUser;
   if (!user) throw new Error("Unauthorized");
   ```

3. **Environment Variables:** Firebase config uses `EXPO_PUBLIC_` prefix for client-side access. Never expose server secrets.

4. **Data Isolation:** All collections are user-scoped with `userId` field for filtering.

---

## Common Tasks

### Adding a New Screen
1. Create file in `app/` or `app/(tabs)/`
2. Use file-based routing conventions (e.g., `new-screen.tsx` → `/new-screen`)
3. Add to `_layout.tsx` if needed
4. Follow existing screen patterns (SafeAreaView, theme colors, StyleSheet)

### Adding a Firestore Collection
1. Define TypeScript interface in `src/types/index.ts`
2. Add CRUD methods in `src/lib/api.ts`
3. Use React Query for data fetching with proper `queryKey`
4. Invalidate related queries on mutations

### Modifying Native iOS Code
1. Edit files in `modules/live-monitor/ios/`
2. Rebuild iOS: `cd ios && pod install && cd .. && npm run ios`
3. For Widget Extension changes, see `WIDGET_SETUP.md`

---

## Important Notes

- **Primary Language:** UI text is primarily in Italian. English is available as fallback.
- **iOS Only Feature:** Live Activities/Dynamic Island requires iPhone 14 Pro or newer and only works on physical devices.
- **Theme System:** Supports system, light, and dark modes with automatic switching.
- **Onboarding:** New users must select a template (Standard, Freelance, or Student) to initialize their life areas and activities.
- **Timer Limitation:** Sessions shorter than 60 seconds are deleted instead of saved when stopped.
