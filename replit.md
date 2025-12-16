# ZEKE AI Companion Dashboard

## Overview
ZEKE AI is a mobile companion app (Expo/React Native) designed as an extension of the main ZEKE web application, running on a dedicated mobile device. It provides quick access to daily essentials (calendar, tasks, contacts), captures conversation memory from AI wearables, facilitates communication via SMS/Voice (Twilio), and includes an AI chat assistant. The app features a dark-themed design with gradient accents and supports iOS, Android, and web platforms. Its core purpose is to leverage native mobile features (voice input, location, notifications) for communication and real-time data capture, while the ZEKE web server handles data persistence, AI processing, and complex integrations. Communication priority is App Chat, then SMS, then Voice calls.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with Expo SDK 54 and React Native 0.81, utilizing React 19 architecture with the React Compiler. Navigation is managed by React Navigation v7, featuring a root stack navigator, a bottom tab navigator with 7 tabs (Home, Contacts, Inbox, Calendar, Tasks, Memories, Settings), and a central floating action button for the Chat modal. Each tab contains its own native stack navigator for nested views. State management combines TanStack React Query for server state and caching, `useState` for local component state, and AsyncStorage for persistent local data. The styling enforces a dark-mode theme with gradient accents (indigo→purple, purple→pink) using `expo-linear-gradient` and `Reanimated` for smooth animations. Key UI components include custom themed elements, gradient text, and specialized cards for contacts, memories, and chat bubbles, along with a `VoiceInputButton` for voice-to-text.

### Backend Architecture
The backend is an Express.js server, featuring a minimal `/api` route structure and dynamic CORS configuration. It employs an interface-based storage abstraction (`IStorage`) currently using in-memory storage (`MemStorage`) but designed for migration to PostgreSQL with Drizzle ORM. The Drizzle ORM schema is defined in `shared/schema.ts` with Zod validation. Path aliases (`@/*` for client and `@shared/*` for shared code) are configured for streamlined development.

### Data Storage Solutions
Client-side data is persisted using AsyncStorage with namespaced keys, storing devices, memories, chat messages, and settings. Server-side, Drizzle ORM is configured for PostgreSQL, with an in-memory fallback. The shared schema includes a `users` table.

### Feature Specifications
- **Home Screen (Command Center):** Dynamic greeting with "ZEKE Command Center" subtitle, Quick Action Widgets (Call, Message, Record, Command buttons with gradient backgrounds), GPS Status card with live location tracking, Activity Timeline showing recent ZEKE actions, connection status, stats grid, and device management.
- **Communications Hub:** Elevated as primary communications interface with three tabs (SMS, Voice, Chat), replacing the old Inbox. SMS tab shows conversations with navigation to detail screens, Voice tab shows call history with details, Chat tab links to ZEKE AI chat.
- **Contacts:** Alphabetical list with search, contact cards showing avatar, name, relationship, quick actions (call, message), color-coded by access level, and contact detail view with interaction history.
- **SMS Screens:** Chat-style conversation view with bubbles and date separators, and a modal for composing new SMS messages with character count.
- **Calendar:** Timeline view for daily events with current time indicator, event details, and voice input for adding events.
- **Tasks:** Filterable task lists (All, Pending, Completed) grouped by urgency, with priority indicators, completion toggles, and voice input for adding tasks.
- **Memories:** Filterable (All, Starred), date-grouped memory cards with star toggles and swipe actions.
- **Settings:** Device configuration, preference toggles, and app information.
- **Chat Screen:** Full-screen ZEKE AI chat with message history and keyboard-aware text input.
- **Real-Time Transcription:** Integrates Deepgram via a secure WebSocket proxy for real-time transcription from BLE audio devices (Omi, Limitless), with a dedicated `LiveCaptureScreen` for display and saving to ZEKE.
- **Real-Time WebSocket Sync:** Uses `/ws/zeke` endpoint for real-time updates between app and ZEKE backend. Client hook (`useZekeSync`) with auto-reconnect and React Query cache invalidation. `SyncStatus` component shows connection status with colored indicators. Messages validated with Zod schema.

## External Dependencies

### Device Integrations
- **Omi**: AI wearable for conversation capture.
- **Limitless**: Wearable pendant for lifelogging.

### Communication Services
- **Twilio**: Independent Twilio integration via Replit connector for SMS and Voice calling. Server-side service layer in `server/twilio.ts` manages Twilio client authentication using Replit's secure connector API. API endpoints include:
  - `POST /api/twilio/sms/send` - Send SMS messages
  - `GET /api/twilio/sms/conversations` - Fetch SMS conversation list
  - `GET /api/twilio/sms/conversation/:phoneNumber` - Fetch single conversation
  - `POST /api/twilio/call/initiate` - Initiate voice calls
  - `GET /api/twilio/calls` - Fetch call history
  - `GET /api/twilio/calls/:callSid` - Fetch call details
  - `GET /api/twilio/phone-number` - Get configured Twilio phone number
  - `POST /api/twilio/webhook/sms` - Inbound SMS webhook
  - `POST /api/twilio/webhook/voice` - Inbound voice webhook
- Client-side API adapter functions in `client/lib/zeke-api-adapter.ts` for Twilio data fetching with TypeScript interfaces for SMS conversations, messages, and call records.

### Third-Party Services
- **Expo Services**: Utilized for splash screen, haptics, image handling, web browser, blur effects, and audio recording.
- **React Navigation**: Core library for app navigation.
- **Deepgram**: Real-time audio transcription via a secure WebSocket proxy.

### Database
- **PostgreSQL**: Target database, configured with Drizzle ORM.

### Build & Development
- **Replit Environment**: Detected for deployment URLs.
- **Metro Bundler**: Configured with module-resolver for path aliases.
- **esbuild**: Used for server-side bundling.