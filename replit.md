# ZEKE AI Companion Dashboard

## Overview

ZEKE AI is a mobile companion app built with Expo/React Native that serves as an always-on extension of the main ZEKE web application on a dedicated mobile device (Google Pixel 8). The app provides quick access to daily essentials (calendar, tasks, grocery list), conversation memory capture from AI wearables, and an AI chat assistant. It follows a dark-themed design with gradient accents and supports iOS, Android, and web platforms.

**Key Concept**: Mobile handles native device features (voice input, location, notifications), while the ZEKE web server handles data persistence, AI processing, and complex features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Expo SDK 54 with React Native 0.81, using the new React 19 architecture with React Compiler enabled.

**Navigation**: React Navigation v7 with a hybrid structure:
- Root stack navigator containing main tabs and modal screens
- Bottom tab navigator with 7 tabs: Home, Calendar, Grocery, Tasks, Memories, Search, Settings
- Center floating action button for Chat modal
- Each tab wraps its own native stack navigator for nested navigation

**State Management**: 
- TanStack React Query for server state and API caching
- React's built-in useState for local component state
- AsyncStorage for persistent local data (devices, memories, chat history, settings)

**Styling Approach**:
- Dark mode only (enforced via theme constants)
- Gradient accents using expo-linear-gradient (indigo→purple primary, purple→pink accent)
- Reanimated for smooth animations with spring physics
- Consistent spacing/typography tokens in `client/constants/theme.ts`

**Key UI Components**:
- Custom themed components (ThemedText, ThemedView, Card, Button)
- Gradient text using masked views
- Device cards with status indicators and battery levels
- Memory cards with transcript previews and speaker tags
- Chat bubbles with user/assistant styling differentiation
- VoiceInputButton for voice-to-text recording

### Backend Architecture

**Framework**: Express.js server running alongside Expo development server.

**API Structure**: 
- Routes prefixed with `/api` (currently minimal, placeholder for expansion)
- CORS configured dynamically based on Replit environment variables
- HTTP server created via Node's native `http.createServer`

**Storage Layer**:
- Interface-based storage abstraction (`IStorage`) allowing swappable implementations
- Currently uses in-memory storage (`MemStorage`) with Map-based collections
- Database schema defined with Drizzle ORM for PostgreSQL (ready for migration)

### Data Storage Solutions

**Client-Side**:
- AsyncStorage for persistent local data with namespaced keys (`@zeke/*`)
- Stores: devices, memories, chat messages, settings, recent searches, API keys

**Server-Side**:
- Drizzle ORM configured for PostgreSQL
- Schema in `shared/schema.ts` with Zod validation via drizzle-zod
- Currently only users table defined (id, username, password)
- In-memory storage used as default until database is provisioned

### Path Aliases

The project uses path aliases configured in both TypeScript and Babel:
- `@/*` → `./client/*` (client-side code)
- `@shared/*` → `./shared/*` (shared types and schemas)

## External Dependencies

### Device Integrations
- **Omi**: AI wearable device for conversation capture
- **Limitless**: Wearable pendant for lifelogging
- API key storage prepared in AsyncStorage

### Third-Party Services
- **Expo Services**: Splash screen, haptics, image handling, web browser, blur effects, audio recording
- **React Navigation**: Full navigation stack with bottom tabs and native stack navigators

### Database
- **PostgreSQL**: Target database (Drizzle config expects `DATABASE_URL` environment variable)
- **Drizzle ORM**: Schema definition and migrations in `./migrations` directory

### Build & Development
- **Replit Environment**: Build scripts detect `REPLIT_DEV_DOMAIN` and `REPLIT_INTERNAL_APP_DOMAIN` for deployment URLs
- **Metro Bundler**: Configured with module-resolver for path aliases
- **esbuild**: Server-side bundling for production

## Project Structure

### Client Directory (`client/`)
```
client/
├── app.json                 # Expo configuration
├── index.js                 # App entry point
├── App.tsx                  # Root component with providers
├── components/              # Reusable UI components
│   ├── ThemedText.tsx       # Typography with theme support
│   ├── ThemedView.tsx       # Themed container views
│   ├── Card.tsx             # Base card component
│   ├── Button.tsx           # Styled button variants
│   ├── GradientText.tsx     # Gradient-filled text
│   ├── DeviceCard.tsx       # Device status display
│   ├── MemoryCard.tsx       # Memory item display
│   ├── ChatBubble.tsx       # Chat message bubble
│   ├── FloatingActionButton.tsx # Center FAB for chat
│   ├── SearchBar.tsx        # Search input component
│   ├── SettingsRow.tsx      # Settings list item
│   ├── EmptyState.tsx       # Empty state display
│   ├── PulsingDot.tsx       # Animated status indicator
│   ├── HeaderTitle.tsx      # Custom header with logo
│   ├── VoiceInputButton.tsx # Voice recording button
│   └── ErrorBoundary.tsx    # App crash handler
├── constants/
│   └── theme.ts             # Colors, spacing, typography tokens
├── hooks/
│   ├── useTheme.ts          # Theme context hook
│   └── useScreenOptions.ts  # Navigation header config
├── lib/
│   ├── query-client.ts      # TanStack Query setup with sync mode detection
│   ├── zeke-api-adapter.ts  # ZEKE backend API adapter
│   ├── storage.ts           # AsyncStorage utilities
│   └── mockData.ts          # Development mock data
├── navigation/
│   ├── RootStackNavigator.tsx    # Root navigator with modals
│   ├── MainTabNavigator.tsx      # Bottom tabs + FAB (7 tabs)
│   ├── HomeStackNavigator.tsx    # Home tab stack
│   ├── CalendarStackNavigator.tsx # Calendar tab stack
│   ├── GroceryStackNavigator.tsx  # Grocery tab stack
│   ├── TasksStackNavigator.tsx    # Tasks tab stack
│   ├── MemoriesStackNavigator.tsx # Memories tab stack
│   ├── SearchStackNavigator.tsx   # Search tab stack
│   └── SettingsStackNavigator.tsx # Settings tab stack
└── screens/
    ├── HomeScreen.tsx       # Quick dashboard with daily summary
    ├── CalendarScreen.tsx   # Today's events timeline
    ├── GroceryScreen.tsx    # Grocery list with categories
    ├── TasksScreen.tsx      # Task management with filters
    ├── MemoriesScreen.tsx   # Memory feed with filters
    ├── SearchScreen.tsx     # Search with recent queries
    ├── SettingsScreen.tsx   # App/device preferences
    ├── ChatScreen.tsx       # ZEKE AI chat modal
    └── AudioUploadScreen.tsx # Audio file upload/transcription
```

### Server Directory (`server/`)
```
server/
├── index.ts                 # Express server entry
├── routes.ts                # API route definitions
├── storage.ts               # Storage abstraction layer
└── vite.ts                  # Vite middleware for dev
```

### Shared Directory (`shared/`)
```
shared/
├── schema.ts                # Drizzle ORM schema definitions
└── types.ts                 # Shared TypeScript types
```

## Screen Details

### Home Screen (Quick Dashboard)
In sync mode displays:
- Dynamic greeting based on time of day ("Good morning/afternoon/evening")
- Connection status indicator (green = connected, red = offline)
- Stats grid: Today's Events, Pending Tasks, Grocery Items, Memories
- Today's Schedule preview (first 3 events)
- Tasks preview (first 4 pending tasks)
- Grocery List preview (first 5 unpurchased items)
- Upload audio card and recent memories

In standalone mode displays:
- Device status cards for Omi DevKit 2 and Limitless AI Pendant
- Live transcription indicator with pulsing animation
- Recent memories list

### Calendar Screen
- Today's date prominently displayed at top
- Timeline view (6 AM - 11 PM) with events
- Current time indicator (red line)
- Events show time, title, location, color-coded
- Add Event modal with title, start/end time, location
- Voice input for adding events
- Pull-to-refresh

### Grocery Screen
- Items grouped by category (Produce, Dairy, Meat, Bakery, Pantry, etc.)
- Filter toggles: All / Unpurchased
- Each item shows: name, quantity/unit, category badge, purchased checkbox
- Tap to toggle purchased status
- Long-press to delete with confirmation
- Add Item modal with name, quantity, unit, category
- Voice input for adding items
- Category color coding

### Tasks Screen
- Filter toggles: All / Pending / Completed
- Tasks grouped by: Today, Tomorrow, This Week, Later, No Due Date
- Each task shows: title, due date, priority indicator, checkbox
- Priority colors: high = red, medium = orange, low = green
- Tap checkbox to toggle completion
- Swipe to delete
- Add Task modal with title, due date, priority
- Voice input for adding tasks

### Memories Screen
- Filter tabs: All, Starred (sync mode) or All, Omi, Limitless, Starred (standalone)
- Date-grouped memory cards with transcript previews
- Star toggle for favorites
- Swipe actions for delete/share

### Search Screen
- Search input with gradient focus border
- Recent searches as horizontal chips
- Search results in memory card format

### Settings Screen
- Device configuration section
- Preference toggles (notifications, auto-sync)
- About section with version info

### Chat Screen (Modal)
- Full-screen modal with close button
- Message history with user/assistant bubbles
- Text input with send button
- Keyboard-aware scrolling

### Audio Upload Screen
- Upload audio files (MP3, M4A, WAV, OGG, WebM)
- OpenAI Whisper transcription
- Automatic memory creation with AI analysis
- Progress indicator during upload/transcription

## ZEKE Sync Configuration

This mobile app connects to the main ZEKE web deployment for data synchronization.

### Environment Variables

- `EXPO_PUBLIC_ZEKE_BACKEND_URL`: URL of the main ZEKE backend
  - Example: `https://zekeai.replit.app` or `https://zekeassistant.aisyncservice.repl.co`
  - When set, the app connects to the main ZEKE backend instead of its local backend
  - This enables syncing all data between the mobile app and web app

### Sync Mode Detection

The app uses `isZekeSyncMode()` from `query-client.ts` to detect sync mode:
- Returns `true` if `EXPO_PUBLIC_ZEKE_BACKEND_URL` is set
- UI adapts based on this setting (different features enabled/disabled)

### Sync Mode Features

When connected to the main ZEKE backend:
- Home screen shows Quick Dashboard with daily summaries
- Calendar, Grocery, and Tasks screens sync with ZEKE
- Chat conversations are synced with the main ZEKE AI
- Memories are fetched from the main ZEKE database
- Search uses ZEKE's semantic search capabilities

### API Adapter (`client/lib/zeke-api-adapter.ts`)

Provides a compatibility layer between the mobile app and main ZEKE backend:

**Chat/Conversations:**
- `getConversations()` / `createConversation()` - Manage chat conversations
- `sendMessage()` - Send chat messages to ZEKE
- `chatWithZeke()` - Direct chat endpoint

**Memories:**
- `getRecentMemories()` - Fetch Omi memories
- `searchMemories()` - Semantic search across memories

**Dashboard:**
- `getDashboardSummary()` - Aggregated dashboard data
- `getTodayEvents()` - Today's calendar events
- `getPendingTasks()` - Pending tasks
- `getGroceryItems()` - Grocery list items

**Calendar:**
- `getTodayEvents()` - GET `/api/calendar/today`
- `getUpcomingEvents()` - GET `/api/calendar/upcoming`
- `createCalendarEvent()` - POST `/api/calendar`
- `deleteCalendarEvent()` - DELETE `/api/calendar/:id`

**Tasks:**
- `getAllTasks()` - GET `/api/tasks`
- `getPendingTasks()` - GET `/api/tasks?status=pending`
- `createTask()` - POST `/api/tasks`
- `updateTask()` - PATCH `/api/tasks/:id`
- `deleteTask()` - DELETE `/api/tasks/:id`
- `toggleTaskComplete()` - PATCH to update status

**Grocery:**
- `getGroceryItems()` - GET `/api/grocery`
- `addGroceryItem()` - POST `/api/grocery`
- `updateGroceryItem()` - PATCH `/api/grocery/:id`
- `deleteGroceryItem()` - DELETE `/api/grocery/:id`
- `toggleGroceryPurchased()` - PATCH to update purchased status

**Status:**
- `getHealthStatus()` - Check backend connection status
- `getDevices()` - GET `/api/omi/devices`

## Recent Changes (December 2025)

- Added Quick Dashboard to HomeScreen with daily summaries and stats grid
- Created Calendar screen with timeline view and event management
- Created Grocery screen with category grouping and CRUD operations
- Created Tasks screen with due date grouping and priority indicators
- Added VoiceInputButton component for voice recording
- Expanded navigation to 7 tabs (Home, Calendar, Grocery, Tasks, Memories, Search, Settings)
- Built comprehensive ZEKE API adapter with all CRUD endpoints
- Implemented sync mode detection and adaptive UI based on connection status
