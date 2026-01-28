# Phase 1C — Mission Control Spine (Header + Command Palette)

## Overview
Restored the app's "command surface" control plane with a dense Header, global Command Palette system, and canonical label maps to prevent UI collisions (esp. Rank.VAGRANT vs Membership.VAGRANT).

## Components & Locations

### 1. Canonical Label Maps
- **File:** `components/constants/labels.js`
- **Exports:**
  - `RANK_LABELS` — maps rank enum → display string ("The Pioneer", "Founder", "Voyager", "Scout", "Vagrant")
  - `MEMBERSHIP_LABELS` — maps membership enum → display string (guards VAGRANT → "Prospect" collision)
  - `ROLE_LABELS` — maps role enum → display string
  - `getRankLabel(rank)` — helper to get rank display label
  - `getMembershipLabel(status)` — helper to get membership display label (collision-safe)
  - `getRoleLabel(role)` — helper to get role display label

### 2. Membership Collision Guard
- **File:** `components/constants/membership.js`
- **Constants:**
  - `MEMBERSHIP_STATUS.PROSPECT` — canonical tier (new)
  - `MEMBERSHIP_STATUS.VAGRANT` — legacy alias, but UI renders as "Prospect" via labels helper
  - `grantsFocusedAccess(membership)` — checks if membership unlocks Focused comms
- **Design:** Preserves backward-compatibility while preventing VAGRANT ambiguity in UI.

### 3. Header Component (v1)
- **File:** `components/layout/Header.js`
- **Features:**
  - Single-row dense layout (no wrapping, no horizontal scroll)
  - Displays: Callsign | Rank Badge | Membership Tag | Role Pills (2 max on md+)
  - Telemetry strip: Comms OK | Active Ops (static placeholders)
  - Command Palette trigger button with Ctrl+K hint
  - Responsive: callsign always visible, role pills collapse on smaller screens
  - Uses label helpers for collision-free display

### 4. Command Palette System

#### Provider
- **File:** `components/providers/CommandPaletteContext.js`
- **Exports:**
  - `CommandPaletteProvider` — wraps app with context
  - `useCommandPalette()` — hook to access palette state
- **State:**
  - `isOpen`, `closePalette()`, `openPalette()`
  - `search` (filter text)
  - `filteredActions` (search-filtered action list)
  - `groupedActions` (actions grouped by category)
- **Action Registry:**
  - Actions are filtered by access predicates (`isVisible(user)`)
  - Supports membership/rank/role gating
  - Built-in actions: Navigate (Hub, Events, CommsConsole, Recon), Toggle (CommsDock), Open (Request Access), Alerts

#### Modal UI
- **File:** `components/providers/CommandPaletteUI.js`
- **Features:**
  - Overlay modal with search input
  - Keyboard navigation (↑/↓, Enter, Esc)
  - Global Ctrl/⌘+K listener (cleans up on unmount)
  - Category-grouped action display
  - Footer hints for keyboard shortcuts
  - Click to execute action or dismiss

### 5. Integration into Layout Shell
- **File:** `Layout.js` (updated)
- **Structure:**
  - `NotificationProvider` (outermost)
  - `CommandPaletteProvider` (wraps content area)
  - `Header` (always visible, top)
  - `PermissionGuard` (around main content)
  - `CommandPaletteUI` (modal overlay)
- **No duplicates:** Single global shell path.

### 6. Access Filtering
- **Location:** `CommandPaletteContext.js` (action registry)
- **Rules:**
  - Actions with `isVisible(user)` predicates are conditionally shown
  - "Focused Comms" actions check via `canAccessFocusedComms(user, channel)`
  - Import/reuse existing comms policy utilities (no duplication)

## File Summary

| File | Status | Change |
|------|--------|--------|
| `components/constants/labels.js` | ✅ | Created/Updated |
| `components/constants/membership.js` | ✅ | Updated collision guard |
| `components/layout/Header.js` | ✅ | Created/Implemented |
| `components/providers/CommandPaletteContext.js` | ✅ | Created/Implemented |
| `components/providers/CommandPaletteUI.js` | ✅ | Created/Implemented |
| `Layout.js` | ✅ | Updated (integrated providers) |
| `components/useCurrentUser.js` | ✅ | Mock variants preserved |

## Acceptance Criteria

- [✅] App builds and runs
- [✅] Ctrl/⌘ + K opens the palette from any route
- [✅] Palette actions route correctly and respect access filtering
- [✅] Header shows callsign + rank + membership with no VAGRANT ambiguity
- [✅] No horizontal scrolling; header remains single-row
- [✅] All imports resolve; no dangling references

## Known Gaps / Deferred

- Telemetry strip values are static placeholders (can be hooked to `TelemetryProvider` later)
- CommsDock toggle is a safe stub (no-op) if CommsDock component doesn't exist
- "Request Focused Access" modal is routed to SidePanel or placeholder page
- LiveKit integration (VoiceNet) not yet wired to header status

## Next Safe Step

Wire Notification System → Command Palette integration: Add notification action cards to the palette (e.g., "Acknowledge Alert", "View Incident") and persist alert state via NotificationContext for quick access.