# Phase 1A — Canon Access Layer

## Architecture Reference

### Constants & Types
- **`components/constants/ranks.js`**
  - `RANKS`: Enum of rank tiers (Vagrant, Scout, Voyager, Founder, Pioneer)
  - `isRankSufficient()`: Check if user rank >= required rank
  
- **`components/constants/roles.js`**
  - `ROLES`: Set of role tags (Shamans, Rangers, Industry, Racing, Rescue)
  - `hasRequiredRole()`: Check if user has any required role
  - `hasAllRequiredRoles()`: Check if user has all required roles

- **`components/constants/channelTypes.js`**
  - `COMMS_CHANNEL_TYPES`: Casual, Focused
  - `FOCUSED_MIN_RANK`: Minimum rank for Focused content (Scout)

### User & Auth
- **`components/useCurrentUser.js`**
  - Hook that returns `{ user, loading, error }`
  - User object includes: id, email, full_name, callsign, rank, roles
  - **Dev toggle**: `MOCK_USER_VARIANT` — change to 'VAGRANT' / 'SCOUT' / 'VOYAGER' to test

### Access Control
- **`components/PermissionGuard.js`**
  - Wraps content with rank/role gating
  - Props: `minRank`, `allowedRanks`, `requiredRoles`, `requireAllRoles`, `fallback`
  - Renders fallback if unauthorized

### Demo Implementation
- **`pages/CommsConsole`**
  - Shows current user rank/callsign
  - Gate demo: Focused Comms section (Scout+ required)
  - Change `MOCK_USER_VARIANT` to 'VAGRANT' to see fallback

## Quick Start

### Test Different Ranks
Edit `components/useCurrentUser.js` line ~25:
```js
const MOCK_USER_VARIANT = 'SCOUT';  // Try: 'VAGRANT', 'SCOUT', 'VOYAGER'
```

### Gate a Route/Component
```jsx
import PermissionGuard from '@/components/PermissionGuard';

<PermissionGuard minRank="SCOUT" requiredRoles={['Rangers']}>
  <YourComponent />
</PermissionGuard>
```

## Rank Hierarchy
- Tier 0: Vagrant (all new members)
- Tier 1: Scout (Recon/navigation)
- Tier 2: Voyager (Mid-tier operators)
- Tier 3: Founder (Early project members)
- Tier 4: Pioneer (Founders/leadership)

## Next Phase
- Real authentication integration (connect useCurrentUser to base44.auth.me())
- Role-based UI restrictions (hide buttons/menus)
- Voice net discipline gating (Focused vs Casual voice comms)