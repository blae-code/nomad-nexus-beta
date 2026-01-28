# Phase 1B — Canon Comms Access Policy + SidePanel Gating

## Architecture Reference

### Constants & Types
- **`components/constants/ranks.js`**
  - `RANKS`: Rank tiers (Vagrant tier 0 → Pioneer tier 4)
  - `isRankSufficient()`: Check if user rank >= required rank

- **`components/constants/roles.js`**
  - `ROLES`: Role tags (Shamans, Rangers, Industry, Racing, Rescue)
  - `hasRequiredRole()` / `hasAllRequiredRoles()`: Role validators

- **`components/constants/membership.js`** ⭐ NEW
  - `MEMBERSHIP_STATUS`: GUEST, VAGRANT, MEMBER, AFFILIATE, PARTNER
  - `grantsFocusedAccess()`: Check if membership tier allows Focused comms

- **`components/constants/channelTypes.js`**
  - `COMMS_CHANNEL_TYPES`: CASUAL, FOCUSED
  - `requiresPermissionGating()`: True for FOCUSED type

### Access Policy (Canonical)
- **`components/utils/commsAccessPolicy.js`** ⭐ NEW
  - `canAccessFocusedComms(user, channel)`: Single source of truth
    - CASUAL: always accessible
    - FOCUSED: requires MEMBER / AFFILIATE / PARTNER membership
    - Temporary: isTemporary flag overrides, open to all
  - `getAccessDenialReason()`: Human-readable fallback text

### User & Auth
- **`components/useCurrentUser.js`** (updated)
  - Mock variants expanded: GUEST, VAGRANT, MEMBER, AFFILIATE, PARTNER
  - **Dev toggle**: `MOCK_USER_VARIANT` — change to test membership paths
  - User object now includes: id, email, callsign, rank, **membership**, roles

### Navigation & Gating
- **`components/layout/SidePanel.js`** ⭐ NEW
  - Left sidebar with permission-gated nav items
  - "Focused Comms" item shows locked/unlocked state
  - Lock icon + hint text for unauthorized users
  - "Request Access" button → modal stub (explains access pathways)

- **`Layout.js`** (updated)
  - Now includes SidePanel between Header and main content
  - Grid: Header (top) → SidePanel + Main + CommsDock (flex row)

### Demo Implementation
- **`pages/CommsConsole`** (updated)
  - Replaced Scout+ gate with canonical `canAccessFocusedComms()`
  - Shows Standard Focused & Temporary Focused sections
  - Temp toggle flips `isTemporary` → access changes for all variants
  - Icons: Unlock (authorized), Lock (denied), Unlock (temporary)

## Quick Start

### Test Different Membership Tiers
Edit `components/useCurrentUser.js` line ~27:
```js
const MOCK_USER_VARIANT = 'MEMBER';  // Try: 'GUEST', 'VAGRANT', 'MEMBER', 'AFFILIATE', 'PARTNER'
```

Variants:
- `GUEST`: No focused access
- `VAGRANT`: No focused access (trial tier)
- `MEMBER`: Focused enabled, rank SCOUT + Rangers role
- `AFFILIATE`: Focused enabled, rank VOYAGER + Rangers role
- `PARTNER`: Focused enabled, rank VOYAGER + Shamans/Rangers roles

### Gate Content with Policy
```jsx
import { canAccessFocusedComms } from '@/components/utils/commsAccessPolicy';
import { COMMS_CHANNEL_TYPES } from '@/components/constants/channelTypes';

const hasAccess = canAccessFocusedComms(user, { 
  type: COMMS_CHANNEL_TYPES.FOCUSED, 
  isTemporary: false 
});
```

## Access Axes
- **Rank**: Operational hierarchy (tier 0–4)
- **Role**: Skill/dept tags (independent of rank)
- **Membership**: Org-level tier (determines Focused access) — orthogonal to rank

## Architecture Diagram
```
User
├── rank (SCOUT, VOYAGER, …)
├── roles [Rangers, Shamans, …]
└── membership (MEMBER, AFFILIATE, PARTNER)
    ↓
canAccessFocusedComms(user, channel)
    ↓
    ├─ CASUAL → always true
    └─ FOCUSED
        ├─ isTemporary: true → always true
        └─ isTemporary: false → check membership tier
```

## Navigation Flow
1. SidePanel renders for all users
2. "Focused" item shows lock state based on membership
3. Unauthorized → hint text + "Request Access" button
4. Modal stub explains pathways: apply, request Affiliate, etc.
5. CommsConsole demo proves gate behavior changes with membership