# ZEKE AI Companion Dashboard

## Overview

ZEKE AI is a mobile companion app built with Expo/React Native that serves as an always-on extension of the main ZEKE web application on a dedicated mobile device (Google Pixel 8). The app provides quick access to daily essentials (calendar, tasks, contacts), conversation memory capture from AI wearables, communication via SMS/Voice through Twilio, and an AI chat assistant. It follows a dark-themed design with gradient accents and supports iOS, Android, and web platforms.

**Key Concept**: Mobile handles native device features (voice input, location, notifications) and serves as the primary communication interface. The ZEKE web server handles data persistence, AI processing, Twilio integration, and complex features.

**Communication Priority**: 1st App Chat, 2nd SMS, 3rd Voice calls

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Expo SDK 54 with React Native 0.81, using the new React 19 architecture with React Compiler enabled.

**Navigation**: React Navigation v7 with a hybrid structure:
- Root stack navigator containing main tabs and modal screens (Chat, SMS Compose)
- Bottom tab navigator with 7 tabs: Home, Contacts, Inbox, Calendar, Tasks, Memories, Settings
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
- Contact cards with initials, access levels, and quick actions
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

### Communication Services
- **Twilio**: SMS and Voice calling via main ZEKE backend
  - SMS sending/receiving through `/api/twilio/sms/send`
  - Voice call initiation through `/api/twilio/call/initiate`
  - Supports 3-way calling with ZEKE AI participation

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
│   ├── zeke-api-adapter.ts  # ZEKE backend API adapter (contacts, SMS, calls)
│   ├── storage.ts           # AsyncStorage utilities
│   └── mockData.ts          # Development mock data
├── navigation/
│   ├── RootStackNavigator.tsx    # Root navigator with modals
│   ├── MainTabNavigator.tsx      # Bottom tabs + FAB (7 tabs)
│   ├── HomeStackNavigator.tsx    # Home tab stack
│   ├── ContactsStackNavigator.tsx # Contacts tab stack
│   ├── CommunicationStackNavigator.tsx # Inbox/SMS tab stack
│   ├── CalendarStackNavigator.tsx # Calendar tab stack
│   ├── TasksStackNavigator.tsx    # Tasks tab stack
│   ├── MemoriesStackNavigator.tsx # Memories tab stack
│   └── SettingsStackNavigator.tsx # Settings tab stack
└── screens/
    ├── HomeScreen.tsx       # Quick dashboard with daily summary
    ├── ContactsScreen.tsx   # Contact list with search and quick actions
    ├── ContactDetailScreen.tsx # Contact info and interaction history
    ├── CommunicationLogScreen.tsx # Unified inbox (SMS/Voice/Chat)
    ├── SmsConversationScreen.tsx  # SMS thread view
    ├── SmsComposeScreen.tsx # Send new SMS message
    ├── CalendarScreen.tsx   # Today's events timeline
    ├── TasksScreen.tsx      # Task management with filters
    ├── MemoriesScreen.tsx   # Memory feed with filters
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
- Dynamic greeting based on time of day
- Connection status indicator (green = connected, red = offline)
- Stats grid: Today's Events, Pending Tasks, Grocery Items, Memories
- Today's Schedule preview
- Tasks preview (pending tasks)
- Recent memories

### Contacts Screen
- Alphabetical contact list with section headers (A, B, C...)
- Search bar to filter by name, email, or phone
- Each contact shows: Avatar with initials, full name, relationship badge
- Quick action buttons: Phone (call), Message (SMS), chevron (detail)
- Color-coded by access level (family, close friend, friend, acquaintance)
- Add contact FAB button

### Contact Detail Screen
- Large avatar with initials and access level color
- Full name and relationship/organization
- Quick action row: Message, Call, Email buttons
- Contact info card: Phone, Email, Organization, Birthday, Notes
- Permissions card: Access level and permission flags
- Interaction history: Recent conversations with source icons
- Delete contact button

### Communication Log (Inbox) Screen
- Filter tabs: All, SMS, Voice, App Chat
- Unified list of all communication interactions
- Each item shows: Avatar/icon, contact name, message preview, timestamp
- Source badge (SMS, Voice, Chat)
- Unread indicator dot
- Tap to open conversation

### SMS Conversation Screen
- Chat-style message bubbles
- Outbound messages on right with gradient
- Inbound messages on left with dark background
- Date separators between message groups
- Text input with send button at bottom
- Call button in header

### SMS Compose Screen (Modal)
- Recipient row showing contact name
- Large text input for message composition
- Character counter (1600 limit)
- Send Message button with gradient

### Calendar Screen
- Today's date displayed at top
- Timeline view (6 AM - 11 PM)
- Current time indicator (red line)
- Events with time, title, location
- Add Event functionality with voice input

### Tasks Screen
- Filter toggles: All / Pending / Completed
- Tasks grouped by: Today, Tomorrow, This Week, Later
- Priority indicators (red/orange/green)
- Tap checkbox to toggle completion
- Add Task with voice input

### Memories Screen
- Filter tabs: All, Starred
- Date-grouped memory cards
- Star toggle for favorites
- Swipe actions for delete/share

### Settings Screen
- Device configuration
- Preference toggles
- About section with version info

### Chat Screen (Modal)
- Full-screen ZEKE AI chat
- Message history with chat bubbles
- Text input with send button
- Keyboard-aware scrolling

## ZEKE Sync Configuration

This mobile app connects to the main ZEKE web deployment for data synchronization.

### Environment Variables

- `EXPO_PUBLIC_ZEKE_BACKEND_URL`: URL of the main ZEKE backend
  - Example: `https://zekeai.replit.app` or `https://zekeassistant.aisyncservice.repl.co`
  - Enables syncing all data between mobile app and web app

### API Adapter (`client/lib/zeke-api-adapter.ts`)

**Contacts:**
- `getContacts()` - GET `/api/contacts`
- `getContact(id)` - GET `/api/contacts/:id`
- `createContact(data)` - POST `/api/contacts`
- `updateContact(id, data)` - PATCH `/api/contacts/:id`
- `deleteContact(id)` - DELETE `/api/contacts/:id`

**Communication:**
- `getSmsConversations()` - GET `/api/sms-log`
- `sendSms(contactId, message)` - POST `/api/twilio/sms/send`
- `initiateCall(contactId)` - POST `/api/twilio/call/initiate`

**Chat/Conversations:**
- `getConversations()` / `createConversation()` - Manage chat conversations
- `sendMessage()` - Send chat messages to ZEKE
- `chatWithZeke()` - Direct chat endpoint

**Calendar:**
- `getTodayEvents()` - GET `/api/calendar/today`
- `createCalendarEvent()` - POST `/api/calendar`
- `deleteCalendarEvent()` - DELETE `/api/calendar/:id`

**Tasks:**
- `getAllTasks()` / `getPendingTasks()` - GET `/api/tasks`
- `createTask()` - POST `/api/tasks`
- `updateTask()` / `toggleTaskComplete()` - PATCH `/api/tasks/:id`
- `deleteTask()` - DELETE `/api/tasks/:id`

**Memories:**
- `getRecentMemories()` - Fetch Omi memories
- `searchMemories()` - Semantic search

**Status:**
- `getHealthStatus()` - Check backend connection

## Recent Changes (December 2025)

- Added Contacts system with list, detail, and quick action screens
- Created Communication Log (Inbox) for unified SMS/Voice/Chat view
- Implemented SMS Conversation and Compose screens
- Added Twilio integration via ZEKE backend for SMS/Voice calls
- Updated navigation to 7 tabs: Home, Contacts, Inbox, Calendar, Tasks, Memories, Settings
- Removed Grocery and Search tabs (available on main ZEKE web app)
- Built comprehensive ZEKE API adapter with contacts and communication endpoints
- Cross-platform SMS compose (replaced iOS-only Alert.prompt with modal screen)
