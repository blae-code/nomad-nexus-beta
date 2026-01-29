# Nexus Mission Console — Component Manifest

**Last Updated:** Phase 3C (2026-01-29)  
**Platform:** Base44 React App

---

## Architecture Overview

The Nexus Mission Console is a multi-phase React application providing organizational comms, event management, voice networking, and tactical systems for distributed operations. Built on Base44 platform with minimal external dependencies.

---

## Phase Progression

### Phase 1A — Foundation (Shell + Navigation)
- Core layout structure (Header, SidePanel, ContextPanel, CommsDock)
- Command Palette system with keyboard shortcuts
- Basic authentication guards and permission system
- Responsive design foundations

### Phase 1B — Access Control + Membership
- Membership tiers (Casual, Member, Affiliate, Partner)
- Rank system (Vagrant → Commander)
- Permission-gated navigation and features
- Access request workflows

### Phase 1C — Comms Console Foundation
- Text-based communication channels
- Channel types (Casual, Focused, Admin, Squad, Public)
- Message composer with real-time updates
- Channel list with unread indicators

### Phase 1D — Roster + Presence
- User directory with filtering and search
- Real-time presence tracking (online/offline)
- Heartbeat system with configurable intervals
- Presence-aware roster displays

### Phase 2A — Comms Enhancements
- Read state tracking per user per channel
- Unread count aggregation by tab
- Inline message actions (future: reactions, threads)
- Improved message composer UX

### Phase 2B — Telemetry + Readiness
- Latency probe with health indicators
- Readiness derivation (presence + latency)
- Diagnostics panel in ContextPanel
- Header telemetry strip (compact, single-row)

### Phase 3A — Voice Nets (Mock Transport)
- Voice net data model (Casual, Focused, Temporary)
- Mock voice transport with simulated participants
- VoiceNetProvider state machine
- PTT controls and mic enablement
- Session heartbeat and speaking indicators

### Phase 3B — LiveKit Integration (Real Voice)
- Backend token minting (mintVoiceToken function)
- LiveKitTransport implementation (livekit-client SDK)
- Device selection hook (useAudioDevices)
- Device persistence (localStorage)
- Reconnect resilience (RoomEvent handlers)
- Fallback to mock when LiveKit unconfigured

### Phase 3C — Active Net Monitor + Discipline (Current)
- Server-side token policy enforcement (membership checks)
- Voice health module (useVoiceHealth hook)
- Rate-limited join/leave notifications
- Active net monitor UI (enhanced ContextPanel)
- Focused net confirmation sheet (one-time per session)
- Header voice status chip with participant count

---

## Directory Structure

```
components/
├── constants/
│   ├── channelTypes.js          # Comms channel type constants
│   ├── labels.js                # Rank, membership, role labels
│   ├── membership.js            # Membership tier definitions
│   ├── ranks.js                 # Rank hierarchy and permissions
│   ├── roles.js                 # Role definitions
│   └── voiceNet.js              # Voice net constants and defaults
├── hooks/
│   ├── useAlertSimulator.js     # Dev helper for notification testing
│   ├── useLatency.js            # Network latency probe
│   ├── useLayoutPreferences.js  # UI layout persistence
│   ├── usePresenceHeartbeat.js  # Presence write automation
│   ├── usePresenceRoster.js     # Online user polling
│   ├── useReadiness.js          # Derived readiness state
│   └── useUnreadCounts.js       # Unread message aggregation
├── layout/
│   ├── CommsDock.js             # Bottom comms panel (text messages)
│   ├── CommsDockShell.js        # Comms dock container
│   ├── ContextPanel.js          # Right sidebar (systems, voice, roster)
│   ├── Header.js                # Top navigation bar with telemetry
│   ├── LayoutSettings.js        # Layout customization UI
│   └── SidePanel.js             # Left navigation menu
├── models/
│   ├── comms.js                 # Comms channel and message models
│   ├── presence.js              # Presence data model
│   └── voiceNet.js              # Voice net and session models
├── providers/
│   ├── CommandPaletteContext.js # Global command palette state
│   ├── CommandPaletteUI.js      # Command palette modal
│   ├── NotificationContext.js   # Global notification system
│   └── ShellUIContext.js        # Shell UI state (panel visibility)
├── services/
│   ├── commsService.js          # Text comms operations
│   ├── latencyProbe.js          # Network latency measurement
│   ├── presenceService.js       # Presence read/write/cleanup
│   └── voiceService.js          # Voice session management
├── utils/
│   ├── commsAccessPolicy.js     # Comms channel access logic
│   ├── readiness.js             # Readiness derivation function
│   └── voiceAccessPolicy.js     # Voice net access policy
├── voice/
│   ├── components/
│   │   └── FocusedNetConfirmation.js  # Focused net discipline sheet
│   ├── health/
│   │   └── voiceHealth.js             # Voice connection health tracking
│   ├── hooks/
│   │   └── useAudioDevices.js         # Audio device enumeration + selection
│   ├── notifications/
│   │   └── voiceNotifications.js      # Rate-limited voice event notifications
│   ├── transport/
│   │   ├── VoiceTransport.js          # Transport adapter interface
│   │   ├── MockVoiceTransport.js      # Simulated voice transport
│   │   └── LiveKitTransport.js        # Real LiveKit transport
│   ├── utils/
│   │   └── devicePersistence.js       # localStorage for device prefs
│   └── VoiceNetProvider.js            # Voice net state machine
├── comms/
│   ├── ChannelList.js           # Channel sidebar
│   ├── CommsTab.js              # Main comms view (channels + messages)
│   ├── MessageComposer.js       # Message input + send
│   └── MessageView.js           # Message list with scrolling
├── notifications/
│   └── NotificationCenter.js    # Toast/alert display
├── common/
│   ├── AuthGuard.js             # Authentication wrapper
│   ├── EmptyState.js            # Placeholder UI component
│   ├── LoadingScreen.js         # Loading state UI
│   └── PageHeader.js            # Reusable page header
├── PermissionGuard.js           # Role/rank access control
├── useCurrentUser.js            # Current user hook (with mock fallback)
├── UserNotRegisteredError.js    # Onboarding error state
└── MANIFEST.md                  # This file
```

---

## Backend Functions

```
functions/
├── mintVoiceToken.js            # LiveKit token generation (Phase 3B)
│                                # - Validates user authentication
│                                # - Enforces membership policy (Phase 3C)
│                                # - Generates JWT with 1-hour expiry
│                                # - Returns {url, token, roomName} or error
└── (other functions not in scope for current phases)
```

---

## Key Integrations

### Base44 SDK
- `base44.entities.*` — Database operations (CRUD)
- `base44.auth.me()` — Current user authentication
- `base44.functions.invoke()` — Backend function calls
- Real-time subscriptions (future phases)

### LiveKit (Phase 3B+)
- `livekit-client` — WebRTC voice communication
- Room-based voice nets with pub/sub
- Automatic reconnection and recovery
- Metadata for participant identification

### localStorage
- Device preferences (`nexus.audio.inputDeviceId`)
- Layout preferences (panel visibility)
- Session-level flags (focused net confirmation)

---

## State Management Patterns

### Context Providers
- **VoiceNetProvider** — Voice connection state machine
- **CommandPaletteContext** — Global command palette
- **NotificationContext** — Toast notifications
- **ShellUIContext** — Panel visibility state

### Custom Hooks
- **useVoiceNet()** — Access voice net state and actions
- **useVoiceHealth()** — Track connection health metrics
- **useAudioDevices()** — Audio device enumeration and selection
- **usePresenceRoster()** — Online user roster
- **useReadiness()** — Derived system readiness
- **useLatency()** — Network latency monitoring

---

## Access Control Layers

### 1. Client-Side (UI Gating)
- **PermissionGuard** — Component-level access control
- **canJoinVoiceNet()** — Voice net membership checks
- **canAccessFocusedComms()** — Comms tier gating

### 2. Server-Side (Token Minting)
- **mintVoiceToken** — Enforces membership for Focused nets
- Returns 403 ACCESS_DENIED if unauthorized
- Temporary Focused nets allow all users

---

## Voice Net Flow (Phase 3C)

### Join Flow
1. User clicks "Join" on voice net
2. If Focused (non-temp): Show confirmation sheet (one-time)
3. User confirms → Request token from backend
4. Backend validates membership/rank
5. If authorized: Mint LiveKit token
6. If denied: Return ACCESS_DENIED error
7. If env vars missing: Return VOICE_NOT_CONFIGURED
8. Frontend: Connect transport (LiveKit or Mock)
9. Create VoiceSession record
10. Start heartbeat interval
11. Load initial participants

### Health Monitoring
- **useVoiceHealth()** tracks:
  - Connection state (IDLE/JOINING/CONNECTED/RECONNECTING/ERROR)
  - Reconnect count (session-level)
  - Last connected timestamp
  - Last error message
  - Latency (from existing probe)

### Notifications
- **useVoiceNotifications()** handles:
  - Participant join/leave (rate-limited: 3 per 10s)
  - Reconnecting/reconnected events
  - Error notifications
  - Uses existing NotificationContext

---

## UI Components Reference

### Header (Telemetry Strip)
- Comms readiness indicator
- Voice status chip (state + participant count)
- Online user count
- Network latency
- Command palette trigger

### ContextPanel (Right Sidebar)
- **Active Nets Section**
  - List of available voice nets
  - Join buttons with lock indicators
  - Active net: state pill, participant count, reconnect count
  - Leave button
- **Voice Controls Section**
  - Device selector dropdown
  - Microphone enable/disable
  - PTT toggle
- **Roster Section**
  - Voice participants (when connected) with speaking indicators
  - Online users (when not connected)
  - Sorted: speaking first, then alphabetical
- **Riggsy AI** (placeholder)
- **Diagnostics**
  - Route, readiness, latency, online count, build version

### SidePanel (Left Navigation)
- Navigation links (Hub, Events, Comms, Directory, etc.)
- Permission-gated visibility
- Focused comms access gate

### CommsDock (Bottom Panel)
- Text message channels
- Unread indicators
- Message composer

---

## Configuration & Environment

### Required Environment Variables (Voice)
```
LIVEKIT_URL              # WebSocket URL for LiveKit server
LIVEKIT_API_KEY          # API key for token signing
LIVEKIT_API_SECRET       # API secret for JWT signing
```

### Fallback Behavior
- If env vars not set: `VOICE_NOT_CONFIGURED` error
- Frontend falls back to MockVoiceTransport
- App remains stable and testable

---

## Testing Checklist (Phase 3C)

### Token Policy Enforcement
- [ ] Casual user cannot mint token for Focused net
- [ ] Member/Affiliate/Partner can mint token for Focused net
- [ ] All users can mint token for Temporary Focused net
- [ ] Server returns 403 ACCESS_DENIED with reason

### Voice Health Tracking
- [ ] Health hook tracks connection state changes
- [ ] Reconnect count increments on network loss
- [ ] Last error message displayed in ContextPanel
- [ ] Latency integrated from existing probe

### Active Net Monitor UI
- [ ] Active net shows state pill (Connected/Reconnecting/Error)
- [ ] Participant count accurate
- [ ] Reconnect count displayed when > 0
- [ ] Roster shows speaking indicators (pulsing mic icon)
- [ ] Participants sorted: speaking first

### Notifications
- [ ] Join/leave notifications appear (max 3 per 10s)
- [ ] Reconnecting notification persistent
- [ ] Reconnected notification shown on recovery
- [ ] Error notifications displayed

### Focused Net Confirmation
- [ ] Confirmation sheet shown first time joining Focused net
- [ ] Not shown for Casual or Temporary Focused nets
- [ ] Not shown again in same session
- [ ] Cancel button works (does not join)
- [ ] Confirm button proceeds with join

### Header Telemetry
- [ ] Voice status chip shows state
- [ ] Participant count shown when > 0
- [ ] Color-coded by state (green/yellow/orange/red)
- [ ] No horizontal overflow

---

## Known Limitations

### Phase 3C
- Jitter and packet loss metrics not yet available (LiveKit API future)
- No persistent "don't show again" for focused confirmation (session-only)
- Notification rate limiting is client-side only (no server-side dedup)
- Device hot-swap requires manual re-selection (auto-switch not implemented)

---

## Next Phase Preview (Phase 3D+)

### Planned Features
- Real-time roster updates (WebSocket/entity subscriptions)
- Voice activity detection (VAD) for auto-PTT
- Output device selection (speaker/headset)
- Voice volume controls (input/output gain)
- Network quality indicators (RTT, jitter, packet loss from LiveKit stats)
- Cross-net bridges (patch source → destination)
- Voice recording and playback (event debriefs)

---

## Maintenance Notes

### Updating Voice Net Defaults
- Edit `components/constants/voiceNet.js`
- Add/modify DEFAULT_VOICE_NETS array
- Ensure id, name, type, description present

### Adding New Membership Tiers
- Update `components/constants/membership.js`
- Adjust `mintVoiceToken.js` allowedMemberships array
- Update access policy in `voiceAccessPolicy.js`

### Modifying Notification Behavior
- Edit `components/voice/notifications/voiceNotifications.js`
- Adjust RATE_LIMIT_WINDOW_MS or MAX_EVENTS_PER_WINDOW
- Consider server-side deduplication for multi-tab scenarios

---

**End of Manifest**