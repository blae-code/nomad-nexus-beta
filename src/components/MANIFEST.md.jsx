# Nexus Mission Console — Component Manifest

**Last Updated:** 2026-01-29  
**Phase:** 4A — Active Op System

---

## Core System Components

### Authentication & User Management
- `useCurrentUser.js` — Current user hook with mock data support
- `UserNotRegisteredError.js` — Error boundary for unregistered users
- `PermissionGuard.jsx` — Permission-based access control

### Layout & Shell
- `layout.js` — Main app shell (Header, SidePanel, ContextPanel, CommsDock)
- `layout/Header.js` — Top navigation with telemetry strip
- `layout/SidePanel.js` — Left navigation with active op tile
- `layout/ContextPanel.js` — Right panel with systems, contacts, voice controls, active op section
- `layout/CommsDock.js` — Right dock with live ops, channels, binding status
- `layout/CommsDockShell.js` — CommsDock wrapper with tab routing

---

## Active Operations System (Phase 4A)

### Core Provider
- `ops/ActiveOpProvider.js` — Single source of truth for active operation
  - State: activeEvent, binding, participants, loading
  - Actions: setActiveEvent, clearActiveEvent, bindVoiceNet, bindCommsChannel, joinOp
  - Persistence: localStorage (nexus.ops.activeEventId)

### Entities
- `entities/OpBinding.json` — Voice net + comms channel binding
- `entities/EventParticipant.json` — Operation participants

### UI Integration Points
- **Header** — Active op chip (Op: <title>)
- **SidePanel** — Active op tile with participant count
- **ContextPanel** — Active Op section with binding dropdowns
- **CommsDock** — Binding status display
- **Events Page** — Set Active + Join Op buttons

---

## Voice Communications (Phase 3C)

### Core Provider
- `voice/VoiceNetProvider.js` — Voice connection state machine
  - LiveKit transport integration
  - MockVoiceTransport fallback
  - PTT + mic controls

### Transport Layer
- `voice/transport/VoiceTransport.js` — Base interface
- `voice/transport/LiveKitTransport.js` — Real LiveKit integration
- `voice/transport/MockVoiceTransport.js` — Development fallback

### Voice Health & Monitoring
- `voice/health/voiceHealth.js` — Connection health monitoring
- `voice/notifications/voiceNotifications.js` — Voice event notifications

### Hooks & Utilities
- `voice/hooks/useAudioDevices.js` — Audio device management
- `voice/utils/devicePersistence.js` — Device selection persistence

### Components
- `voice/components/FocusedNetConfirmation.jsx` — Focused net join confirmation

### Access Control
- `utils/voiceAccessPolicy.js` — Voice net access rules

### Services
- `services/voiceService.js` — Voice session management

### Backend Functions
- `functions/mintVoiceToken.js` — LiveKit token generation

---

## Text Communications

### Comms Provider
- `comms/CommsTab.jsx` — Text channel interface

### Components
- `comms/ChannelList.jsx` — Channel navigation
- `comms/MessageView.jsx` — Message display
- `comms/MessageComposer.jsx` — Message input

### Access Control
- `utils/commsAccessPolicy.js` — Channel access rules

### Services
- `services/commsService.js` — Channel/message operations

---

## Presence & Telemetry

### Presence System
- `hooks/usePresenceHeartbeat.js` — User presence updates
- `hooks/usePresenceRoster.js` — Online users list
- `services/presenceService.js` — Presence CRUD operations
- `models/presence.js` — Presence data model

### Telemetry
- `hooks/useLatency.js` — Connection latency monitoring
- `hooks/useReadiness.js` — System readiness state
- `services/latencyProbe.js` — Latency measurement
- `utils/readiness.js` — Readiness state machine

---

## Notifications

### Core System
- `providers/NotificationContext.js` — Global notification state
- `notifications/NotificationCenter.jsx` — Toast display
- `hooks/useNotificationActions.js` — Notification actions

---

## Command Palette

### Core System
- `providers/CommandPaletteContext.js` — Command state + actions
- `providers/CommandPaletteUI.jsx` — Command palette modal

---

## UI State Management

### Shell UI
- `providers/ShellUIContext.js` — Panel visibility state

---

## Constants & Configuration

### Labels
- `constants/labels.js` — User-facing text (ranks, memberships, roles)

### Voice
- `constants/voiceNet.js` — Voice net types + defaults

### Membership
- `constants/membership.js` — Membership levels + access policies

### Ranks
- `constants/ranks.js` — Rank hierarchy

### Roles
- `constants/roles.js` — User roles + permissions

### Channels
- `constants/channelTypes.js` — Channel types (casual/focused)

---

## Data Models

### Voice
- `models/voiceNet.js` — Voice net + session models

### Comms
- `models/comms.js` — Channel + message models

### Presence
- `models/presence.js` — User presence model

---

## Common Components

### UI Elements
- `common/EmptyState.jsx` — Empty state placeholder
- `common/AuthGuard.jsx` — Authentication guard
- `common/PageHeader.jsx` — Standard page header
- `common/LoadingScreen.jsx` — Loading state

---

## Pages

### Core Pages
- `pages/Hub.js` — Dashboard home
- `pages/Events.js` — Operations management (Set Active, Join Op)
- `pages/CommsConsole.js` — Text comms interface
- `pages/UserDirectory.js` — Member roster
- `pages/UniverseMap.js` — Tactical map
- `pages/FleetManager.js` — Asset management
- `pages/Treasury.js` — Financial tracking
- `pages/Settings.js` — User preferences
- `pages/Recon.js` — Intelligence hub

### Special Pages
- `pages/AccessGate.js` — Access request page
- `pages/PageNotFound.js` — 404 handler

---

## Backend Functions

### Voice
- `functions/mintVoiceToken.js` — LiveKit token generation

### Access Management
- `functions/redeemAccessKey.js` — Access key redemption
- `functions/issueAccessKey.js` — Access key generation
- `functions/revokeAccessKey.js` — Access key revocation

### Utilities
- `functions/generateDiscordInvitation.js` — Discord invite link
- `functions/populateSampleData.js` — Sample data seeding
- `functions/wipeAppData.js` — Data cleanup

---

## Verification & Documentation

### Phase Reports
- `PHASE_1B_GUIDE.md` — Phase 1B implementation guide
- `PHASE_1C_VERIFICATION.md` — Phase 1C verification
- `PHASE_1D_VERIFICATION.md` — Phase 1D verification
- `PHASE_2A_VERIFICATION.md` — Phase 2A verification
- `PHASE_2B_VERIFICATION.md` — Phase 2B verification
- `PHASE_3A_VERIFICATION.md` — Phase 3A verification
- `PHASE_3B_VERIFICATION.md` — Phase 3B verification
- `PHASE_3C_VERIFICATION.md` — Phase 3C verification
- `PHASE_4A_VERIFICATION.md` — Phase 4A verification (Active Op system)

### Architecture
- `ARCHITECTURE.md` — System architecture overview
- `MANIFEST.md` — This file

---

## Key Integrations

### Active Op → Voice
- ContextPanel binds voice net to active event
- "Join Bound Net" button triggers voiceNet.joinNet()
- CommsDock shows bound voice net status

### Active Op → Comms
- ContextPanel binds comms channel to active event
- CommsDock shows bound channel status
- Future: Auto-select bound channel in CommsDock

### Active Op → Presence
- EventParticipant tracks op participants
- ContextPanel displays participant count
- SidePanel shows active op tile with count

---

## File Organization Rules

### Mandatory Build Rules
- ✅ NO `src/` directory (components live in `components/`)
- ✅ NO file deletions or renames
- ✅ NO moving files outside `components/`
- ✅ Additive changes only

### Component Structure
```
components/
├── ops/                    # Active operations
├── voice/                  # Voice system
├── comms/                  # Text comms
├── layout/                 # Shell components
├── providers/              # Context providers
├── hooks/                  # Custom hooks
├── services/               # Data services
├── utils/                  # Utilities
├── constants/              # Configuration
├── models/                 # Data models
├── common/                 # Shared UI
├── notifications/          # Notification system
└── ui/                     # shadcn/ui components
```

---

## State Management Summary

### Global Providers (wrap app in layout.js)
1. NotificationProvider
2. ShellUIProvider
3. ActiveOpProvider ⭐ (Phase 4A)
4. VoiceNetProvider
5. CommandPaletteProvider

### Provider Hierarchy
```
Layout
  └─ NotificationProvider
       └─ ShellUIProvider
            └─ ActiveOpProvider ⭐
                 └─ VoiceNetProvider
                      └─ CommandPaletteProvider
                           └─ (page content)
```

---

## LocalStorage Keys

- `nexus.ops.activeEventId` — Active operation ID
- `nexus.voice.selectedDeviceId` — Audio device selection
- `nexus.shell.sidePanelOpen` — SidePanel visibility
- `nexus.shell.contextPanelOpen` — ContextPanel visibility
- `nexus.shell.commsDockOpen` — CommsDock visibility

---

## Access Control Policies

### Voice Nets
- **Casual nets:** All users
- **Focused nets:** MEMBER/AFFILIATE/PARTNER only
- **Temporary Focused nets:** All users (briefings, etc.)

### Comms Channels
- **Casual channels:** All users
- **Focused channels:** MEMBER/AFFILIATE/PARTNER only
- **Temporary Focused channels:** All users

### Operations (Phase 4A)
- **View events:** All users
- **Set Active:** All users (for visible events)
- **Join Op:** All users (for visible events, access rules inherited from Event entity)
- **Bind voice/comms:** No additional gating (access enforced at net/channel level)

---

## Known Limitations (Phase 4A)

- Auto-channel selection in CommsDock not implemented (avoids focus steal)
- Single active op only (by design)
- No server-side binding validation (client-side only)
- No participant limit enforcement
- Manual op deactivation only (no auto-deactivate on event completion)

---

*Last updated: Phase 4A — Active Op System complete*