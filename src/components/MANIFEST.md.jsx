# Nomad Nexus — Architecture Manifest

## Phase Overview

### Phase 1A — Canon Access Layer (Completed)
- **Ranks**: Vagrant, Scout, Voyager, Founder, Pioneer (tier-based hierarchy)
- **Roles**: Shamans, Rangers, Industry, Racing, Rescue (skill/dept tags)
- **PermissionGuard**: Rank + role-based content gating

**Files**:
- `components/constants/ranks.js` — rank enum & validation
- `components/constants/roles.js` — role enum & validators
- `components/PermissionGuard.js` — access control wrapper

### Phase 1B — Membership & Comms Policy (Completed)
- **Membership Tiers**: Guest, Prospect (Vagrant alias), Member, Affiliate, Partner
- **Canonical Comms Policy**: `canAccessFocusedComms(user, channel)` — single source of truth
- **SidePanel Navigation**: Left sidebar with Focused comms gating + Request Access modal
- **Collision Guard**: VAGRANT rank ≠ VAGRANT membership (both exist orthogonally)

**Files**:
- `components/constants/membership.js` — membership enum + access validator
- `components/constants/channelTypes.js` — channel types (casual, focused)
- `components/utils/commsAccessPolicy.js` — canonical comms access logic
- `components/layout/SidePanel.js` — left nav with permission gates
- `components/useCurrentUser.js` — user hook (mock variants for dev testing)
- `Layout.js` — wraps app with Layout + SidePanel

### Phase 1C — Header & Command Palette (Current)
- **Label Maps**: Canonical UI text for ranks, roles, memberships (no collisions)
- **Header v1**: Single-row control plane (callsign, badges, telemetry, cmd palette trigger)
- **Command Palette**: Global action registry with access filtering + hotkeys
- **Keyboard Shortcuts**: Ctrl/⌘+K to open, Esc to close, arrow keys + Enter

**Files**:
- `components/constants/labels.js` — canonical UI label maps (rank, role, membership)
- `components/layout/Header.js` — control plane v1 (callsign, badges, cmd trigger)
- `components/providers/CommandPaletteContext.js` — palette state + action registry
- `components/providers/CommandPaletteUI.js` — modal UI + keyboard handling
- `Layout.js` — updated to wrap with CommandPaletteProvider + wire hotkeys

---

## File Structure

```
components/
├── constants/
│   ├── ranks.js                  # Rank enum (VAGRANT, SCOUT, VOYAGER, FOUNDER, PIONEER)
│   ├── roles.js                  # Role enum + validators
│   ├── membership.js             # Membership enum (GUEST, PROSPECT/VAGRANT, MEMBER, AFFILIATE, PARTNER)
│   ├── channelTypes.js           # Channel types (CASUAL, FOCUSED)
│   └── labels.js                 # ⭐ NEW: Canonical UI label maps + helpers
│
├── utils/
│   ├── commsAccessPolicy.js      # Canonical comms access logic (Phase 1B)
│   └── timeout.js
│
├── layout/
│   ├── Header.js                 # ⭐ NEW: Control plane v1 (callsign, badges, cmd trigger)
│   ├── SidePanel.js              # Left nav with gating (Phase 1B)
│   ├── CommsDock.js              # Right panel (live ops data)
│   └── headerStyles.js
│
├── providers/
│   ├── CommandPaletteContext.js  # ⭐ NEW: Palette provider + action registry
│   └── CommandPaletteUI.js       # ⭐ NEW: Modal UI + keyboard handling
│
├── useCurrentUser.js             # User hook (mock variants for testing)
├── PermissionGuard.js            # Rank + role gating wrapper
└── ... (other components)

pages/
├── Hub.js                        # Dashboard
├── Events.js                     # Operations
├── CommsConsole.js               # Comms channels (Phase 1B demo)
├── UserDirectory.js              # Member roster
├── UniverseMap.js                # Tactical map
├── FleetManager.js               # Asset management
├── Treasury.js                   # Financial tracking
├── Settings.js                   # User profile
├── AccessGate.js                 # Auth entry
├── Recon.js                      # Archive
└── PageNotFound.js

Layout.js                         # ⭐ UPDATED: Top-level shell (Provider + Header + SidePanel)

entities/
├── MemberProfile.json
├── Channel.json
├── Message.json
├── Event.json
└── ... (20+ entity schemas)

functions/
└── ... (backend functions for integrations)

agents/
└── ... (AI agents)
```

---

## Key Concepts

### Access Control Axes (Orthogonal)
1. **Rank** (tier 0–4): Operational hierarchy — determines seniority
2. **Role** (tags): Skill/department — independent of rank
3. **Membership** (tier): Org-level access — determines Focused comms

### Label Collision Guard
**Problem**: VAGRANT exists as both rank (tier 0) and membership (trial).
**Solution**: 
- `RANK_LABELS[VAGRANT]` → "Vagrant" (rank UI)
- `MEMBERSHIP_LABELS[VAGRANT]` → "Prospect" (membership UI)
- Both use label maps, never raw enum values in UI

### Canonical Comms Policy
```js
canAccessFocusedComms(user, channel)
├─ CASUAL channels: always accessible
└─ FOCUSED channels:
   ├─ isTemporary: true → open to all (demo/event mode)
   └─ isTemporary: false → requires MEMBER/AFFILIATE/PARTNER
```

### Command Palette
**Registry**: Action objects with id, label, category, description, onExecute, isVisible predicate
**Filtering**: By membership/rank/role via isVisible callback
**Keyboard**:
- Ctrl/⌘+K: open
- Esc: close
- ↑↓: navigate
- Enter: execute

**Built-in Actions**:
- Navigate: Hub, Events, Comms, Directory, Recon
- Toggle: CommsDock
- Open: Request Focused Access (appears only if unauthorized)

---

## Dev Quick Start

### Test Different User Tiers
Edit `components/useCurrentUser.js` line ~27:
```js
const MOCK_USER_VARIANT = 'MEMBER';
// Options: 'GUEST', 'VAGRANT', 'MEMBER', 'AFFILIATE', 'PARTNER'
```

Each variant has predefined rank, roles, membership to simulate different access scenarios.

### Use Header + Palette
1. Open app → Header displays user callsign + rank badge + membership tag
2. Press Ctrl+K → Command palette opens
3. Search "Comms" → routes to CommsConsole
4. Try "Request Access" → only visible if membership doesn't grant Focused

### Gate Content with Labels
```jsx
import { getRankLabel, getMembershipLabel } from '@/components/constants/labels';

const rankDisplay = getRankLabel(user.rank);     // "Scout"
const memberDisplay = getMembershipLabel(user.membership);  // "Prospect"
```

### Gate Content with Policy
```jsx
import { canAccessFocusedComms } from '@/components/utils/commsAccessPolicy';

const allowed = canAccessFocusedComms(user, {
  type: COMMS_CHANNEL_TYPES.FOCUSED,
  isTemporary: false
});
```

---

## Known Gaps & Deferred Work

### Phase 1C
- [ ] Palette action pinning (favorites)
- [ ] Custom command registry extension (let features register actions)
- [ ] Palette history/recent actions
- [ ] Mobile collapse (always-visible SidePanel; mobile hamburger menu in Phase 1D)

### Future Phases
- Real auth integration (replace useCurrentUser mock fallback)
- Access request workflow (modal → backend email/notification)
- Voice net discipline gating (Focused vs Casual voice comms)
- Role-based UI visibility (hide buttons/menus by role, not just content)
- Persistent user settings (sidebar width, dock state, etc.)

---

## Testing Checklist

- [ ] App builds without errors
- [ ] Ctrl/⌘+K opens palette from any route
- [ ] Palette actions navigate correctly
- [ ] Header shows non-colliding labels (rank "Vagrant" ≠ membership "Prospect")
- [ ] "Request Access" action only appears for unauthorized users
- [ ] No horizontal scrolling on Header
- [ ] Arrow keys navigate palette correctly
- [ ] Esc closes palette
- [ ] Enter executes selected action

---

## Recent Changes (Phase 1C)

**Added:**
1. `components/constants/labels.js` — RANK_LABELS, MEMBERSHIP_LABELS, ROLE_LABELS + helpers
2. `components/layout/Header.js` — control plane v1 with badges & cmd trigger
3. `components/providers/CommandPaletteContext.js` — provider + action registry
4. `components/providers/CommandPaletteUI.js` — modal + keyboard handling
5. `components/constants/membership.js` — updated with PROSPECT alias + collision guard note

**Updated:**
1. `Layout.js` — wrapped with CommandPaletteProvider, includes Header, wire handlers

**No deletions or renames.**

---

## Architecture Diagram (Phase 1C Complete)

```
Layout.js (Top-Level Shell)
├── CommandPaletteProvider
│   ├── Header
│   │   ├── Callsign
│   │   ├── Rank Badge (from RANK_LABELS)
│   │   ├── Membership Tag (from MEMBERSHIP_LABELS)
│   │   ├── Role Pills (from ROLE_LABELS)
│   │   ├── Telemetry Strip
│   │   └── Cmd Palette Trigger
│   │
│   ├── SidePanel (left nav with gates)
│   │
│   ├── Main Content
│   │   └── Route outlet + PermissionGuard
│   │
│   ├── CommsDock (right panel)
│   │
│   └── CommandPaletteUI (modal overlay)
│       ├── Search input
│       ├── Action groups (Navigate, Toggle, Open)
│       └── Keyboard: Ctrl+K, Esc, ↑↓, Enter
│
User (useCurrentUser)
├── id, email, callsign
├── rank (with RANK_LABELS)
├── membership (with MEMBERSHIP_LABELS)
└── roles (with ROLE_LABELS)

Access Policy
├── canAccessFocusedComms(user, channel)
├── canAccessByRank(user, minRank)
└── canAccessByRole(user, requiredRoles)
```

---

End of Manifest