# Voice Control Panel Implementation

## Overview
The Voice Control Panel is a persistent right-sidebar interface for managing voice comms, accessed via the header button and command palette. Mounted once globally in `Layout.js`, controlled by `ShellUIProvider`.

## Components

### Core Panel
- **`components/layout/ContextPanel.js`** — Main right sidebar container
  - Manages section expansion state (localStorage: `nexus.contextPanel.expanded`)
  - Toggles via header button and command palette
  - Internal scrolling with fixed header

### Voice Control Panel Sections
Located in `components/voice/VoiceControlPanel/`:

1. **`ActiveNets.js`** — Available voice nets grouped by discipline
   - Casual nets
   - Focused nets (with membership gating)
   - Temporary focused nets
   - Shows participant counts and lock icons
   - Join/Leave buttons with loading state
   - Enforces `canAccessFocusedComms` policy

2. **`NetHealth.js`** — Connection telemetry and diagnostics
   - Connection state (CONNECTED, RECONNECTING, ERROR)
   - Participant count
   - Reconnect count
   - Last connected timestamp
   - Latency (ms)
   - Health indicator (Healthy/Degraded/Error)
   - Last error display

3. **`NetRoster.js`** — Active net participants
   - Sorted by: speaking first, then callsign
   - Shows: callsign, rank, membership
   - Speaking indicator with animation
   - Real-time participant updates

4. **`VoiceControlsSection.js`** — Microphone and PTT controls
   - Device selector (persists to localStorage: `nexus.voicePanel.selectedDeviceId`)
   - Mic enable/disable toggle
   - PTT controls (Space bar hint)
   - Connection status with warnings
   - Error display

5. **`CommsDiscipline.js`** — Focused net reminder
   - One-time per-session notice for joined Focused nets
   - Reminds users to use Casual nets for chatter
   - "Don't show again this session" checkbox
   - Session-scoped dismissal (resets on page reload)

## State Management

### ContextPanel State
- **Expanded sections**: `localStorage.nexus.contextPanel.expanded` (JSON)
- **Section defaults**: activeOp, nets, voice (expanded); health, contacts, riggsy, diagnostics (collapsed)

### Voice Device Persistence
- **Selected device ID**: `localStorage.nexus.voicePanel.selectedDeviceId`
- Restores on panel load

### Comms Discipline
- **Session-scoped**: Dismissed notices persist within session
- Resets on page reload for consistency

## Integration Points

### Providers
- **`ShellUIProvider`** — Manages panel open/closed state
  - `toggleContextPanel()` — Toggle visibility
  - `isContextPanelOpen` — Current state

- **`VoiceNetProvider`** — Voice connection state
  - `activeNetId` — Current joined net
  - `connectionState` — IDLE, JOINING, CONNECTED, RECONNECTING, ERROR
  - `participants` — Array of active speakers
  - `joinNet()`, `leaveNet()`, `togglePTT()`, `setMicEnabled()`

- **Hooks**:
  - `useVoiceHealth()` — Net health metrics
  - `useLatency()` — Network latency probe
  - `useAudioDevices()` — Input device enumeration
  - `useCurrentUser()` — User rank, membership for gating

### Access Control
- **`canJoinVoiceNet(user, net)`** — Membership gating
  - Returns false for Focused nets if user lacks membership
  - Enforced on Join button (disabled state + tooltip)

### Real-time Updates
- Participants update via `VoiceNetProvider` event handlers
- Speaking state via `participant.isSpeaking` flag
- Connection state changes trigger re-renders

## Layout
- **Width**: 320px (`w-80`)
- **Position**: Right sidebar, adjacent to main content
- **Scrolling**: Internal scroll on content, fixed header
- **Border**: Orange glow (`border-orange-500/20`)
- **No horizontal scroll**: All content fits within 320px width

## Acceptance Criteria
✅ Panel toggles open/closed via header button  
✅ Displays all five sections with live updates  
✅ Users can join/leave voice nets  
✅ Speaking indicator animates in real-time  
✅ Membership gating enforced for Focused nets  
✅ Focused net discipline notice shows once per session  
✅ Mic device and settings persist to localStorage  
✅ Health stats update live  
✅ No layout breakage or horizontal scroll  

## Migration Notes
- Supersedes legacy `VoiceCommsDock` for primary voice controls
- ContextPanel remains the single source of truth for voice UI
- All legacy right-sidebar components deprecated in favor of sections