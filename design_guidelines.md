# ZEKE AI Companion Dashboard - Design Guidelines

## Platform Focus: Android (Pixel 8)

This app is designed specifically for **Android Pixel 8** devices, following **Google Material Design 3** principles while maintaining the ZEKE brand identity.

### Target Device Specifications
- **Device:** Google Pixel 8
- **Screen:** 6.2" OLED, 1080 x 2400 pixels (20:9 ratio)
- **Density:** 428 ppi (~2.75x density)
- **Status bar height:** 24dp
- **Navigation bar height:** 48dp
- **Safe area considerations:** Punch-hole camera cutout (top-left)

---

## Core Architecture

### ZEKE Branding Requirements
**CRITICAL: Every screen must display ZEKE branding in the header.**

**Main Tab Screens (Home, Comms, Calendar, Geo, Tasks):**
- Header left: ZEKE logo + title + connection status
- Header right: Chat button + Settings button

**Sub-Screens (Settings, AudioUpload, Notifications, etc.):**
- Header left: Back arrow
- Header center: "ZEKE" branding (small) + Screen title
- Consistent branding ensures users always know they're in the ZEKE app

**Modal Screens (Chat, Compose):**
- Header center: "ZEKE AI" or "ZEKE" prefix with screen purpose
- Close/back button on left

### Authentication
- **Required:** Google Sign-In (primary for Android)
- **Login UI:** Gradient background (indigo→purple), centered auth buttons, Privacy/Terms links at bottom
- **Account Deletion:** Settings > Account > Delete Account with double confirmation

**Account Screen Elements:**
- User avatar (3-4 AI-themed preset avatars with gradient backgrounds)
- Display name, connected devices status (Omi/Limitless), notification settings
- Theme: Dark mode only
- Log out + delete account options

### Navigation Structure
**Bottom Navigation Bar (Material Design 3 style):**
1. **Home** - Dashboard with device status
2. **Comms** - Communications hub
3. **Calendar** - Schedule and events
4. **Geo** - Location tracking
5. **Tasks** - Tasks and lists

**Tab Bar Specifications (Android/Pixel 8):**
- Height: 80dp (including gesture navigation area)
- Background: `#1E293B` with subtle elevation
- Active indicator: Pill-shaped with gradient fill
- Active icon: Filled style with primary color
- Inactive icon: Outlined style with muted color
- Label: Always visible, 12sp medium weight
- Touch targets: Minimum 48dp

---

## Screen Specifications

### 1. Home (Dashboard)
**Header:** ZEKE logo + title + status indicator (left), action buttons (right)

**Content:**
- Device cards (Omi/Limitless): Name, gradient dot status, battery %, last sync
- Recent activities: Timestamp, action description, device badge
- Real-time transcription: Pulsing gradient badge when active
- Card style: Surface (#1E293B) with 16dp border radius

**Safe Areas (Pixel 8):** Top: `statusBar + headerHeight + 24dp`, Bottom: `navBarHeight + tabBarHeight + 24dp`

### 2. Communications Hub
**Header:** ZEKE branding (left), action buttons (right)
**Content:**
- Recent conversations list
- Quick action buttons (Call, Message)
- Contact cards with status indicators

### 3. Calendar
**Header:** ZEKE branding (left), action buttons (right)
**Content:**
- Month/week/day view selector
- Event cards with color coding
- Today indicator

### 4. Geo (Location)
**Header:** ZEKE branding (left), action buttons (right)
**Content:**
- Current location display
- Map integration
- Location history

### 5. Tasks
**Header:** ZEKE branding (left), grocery/lists shortcuts, action buttons (right)
**Content:**
- Task list with checkboxes
- Priority indicators
- Due date badges

### 6. Chat (Modal)
**Header:** Gradient background, "ZEKE AI" title, close button (left)

**Messages:**
- User: Right-aligned, gradient bubble (indigo→purple)
- ZEKE: Left-aligned, surface color (#1E293B)
- Code blocks: JetBrains Mono
- Typing indicator: Three animated gradient dots
- Input bar: Fixed bottom with safe area inset

**Interactions:** Auto-scroll to bottom, tap to copy, long-press for actions

### 7. Settings (Sub-screen)
**Header:** Back arrow (left), "ZEKE" small branding + "Settings" title (center)

**Sections:**
- **Devices:** Omi/Limitless cards (status, battery, configure), "Add Device" button
- **App Preferences:** Notifications, auto-sync, data retention toggles
- **Account:** Display name, avatar picker, connected accounts
- **Danger Zone:** Log out, delete account
- **About:** Version, legal links, backend status

---

## Design System

### Colors
**Core Palette:**
- Primary: `#6366F1` (Indigo) - CTAs, active states
- Secondary: `#8B5CF6` (Purple) - Secondary actions
- Accent: `#EC4899` (Pink) - Highlights, notifications
- Background: `#0F172A`, Surface: `#1E293B`
- Text: `#F1F5F9` (primary), `#94A3B8` (secondary)
- Border: `#334155`
- Status: Success `#10B981`, Warning `#F59E0B`, Error `#EF4444`

**Gradients:**
- Primary: `#6366F1 → #8B5CF6`
- Accent: `#8B5CF6 → #EC4899`
- Background: `#0F172A → #1E293B`

### Typography (Android)
**Fonts:** Roboto (system default for Android), JetBrains Mono (code)
- H1: 32sp Bold (gradient text)
- H2: 24sp SemiBold
- H3: 20sp SemiBold
- Body: 16sp Regular, line-height 1.5
- Small: 14sp, Caption: 12sp
- Code: 14sp JetBrains Mono

### Spacing
`xs:4dp, sm:8dp, md:12dp, lg:16dp, xl:24dp, 2xl:32dp, 3xl:48dp`

### Components

**Cards (Material Design 3):**
- Background: `#1E293B`, Border radius: 16dp, Padding: `lg`
- Elevation: 1dp (subtle shadow)
- Border: None (use elevation instead)

**Buttons (Material Design 3):**
- Primary (Filled): Gradient background, white text, 48dp height
- Secondary (Outlined): Gradient border + text, transparent
- Tertiary (Text): Gradient text only
- Border radius: 24dp (fully rounded ends for pill shape)
- Press state: Ripple effect with primary color

**Icons:**
- Material Icons or Feather icons (no emojis), 24dp default
- Filled style for active states
- Outlined style for inactive states

**Bottom Navigation (Material Design 3):**
- Background: `#1E293B`
- Height: 80dp
- Active: Pill indicator + filled icon + primary color
- Inactive: Outlined icon + muted color
- Labels: Always visible

**App Bar / Header (Material Design 3):**
- Height: 64dp
- Background: Semi-transparent with blur (or solid surface color)
- Title: Left-aligned or center-aligned
- Icons: 24dp with 48dp touch target

### Interactions (Android-specific)
- Touch feedback: Material ripple effect
- Press state: Scale 0.98 + ripple
- Transitions: 300ms ease-in-out (screens), 250ms slide-up (modals)
- Pull-to-refresh: Material refresh indicator with primary color
- Lists: Virtualized, swipe gestures, subtle dividers

### Accessibility
- Minimum touch target: **48dp x 48dp** (Material Design requirement)
- Text contrast: WCAG AA compliant
- TalkBack: Descriptive labels for all icons/buttons
- Font scaling: Support Android accessibility settings
- Focus indicators: 2dp outline with primary color

---

## Critical Assets

**User Avatars (3-4 presets):**
- AI/tech-themed, gradient backgrounds, abstract geometric patterns
- 200x200dp minimum

**Device Icons:**
- Omi DevKit 2 + Limitless AI badges (simple pendant shapes)
- Gradient fills matching brand colors

**Empty State Illustrations:**
- No memories: Abstract gradient waves
- Search empty: Magnifying glass with gradient
- Disconnected: Unplugged icon with gradient
- Style: Simple, geometric, dark theme compatible

**App Icon:**
- Gradient background (indigo→purple)
- "Z" letterform or geometric AI symbol in white
- Adaptive icon format for Android 8+

---

## Platform Notes (Android/Pixel 8)
- **Android-first:** Follow Material Design 3 guidelines
- **Dark mode only:** Light status bar content, dark navigation bar
- **Gestures:** Support Android gesture navigation (swipe from edge)
- **Safe areas:** Account for punch-hole camera (top-left) and gesture navigation bar
- **Status bar:** Transparent, light content icons
- **Navigation bar:** Dark, consistent with app background
- **Edge-to-edge:** Content extends behind system bars with proper insets
