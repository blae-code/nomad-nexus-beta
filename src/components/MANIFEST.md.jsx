# Mission Control Spine — Component Manifest

**Last Updated:** 2026-01-28  
**Phase:** 1D (AppShell Geometry + Right Context Panel + Dock Toggles)

---

## Core Layout Shell

### AppShell (Global Wrapper)
- **File:** `Layout.js`
- **Responsibility:** Single authoritative shell layout wrapping all routes
- **Structure:**
  - NotificationProvider (outer)
  - ShellUIProvider (manages sidepanel/context panel/dock state)
  - CommandPaletteProvider (command registry + execution)
  - Header (fixed, h-16)
  - Main body (flex row: sidepanel | main | contextpanel)
  - CommandPaletteUI (modal overlay)
- **State Management:**
  - Uses `useShellUI()` for panel toggles
  - Uses `useCommandPalette()` for command execution
  - Uses `useNotification()` for system alerts

---

## Providers & Context

### ShellUIProvider
- **File:** `components/providers/ShellUIContext.js`
- **Exports:** `ShellUIProvider`, `useShellUI()`
- **State:**
  ```
  isSidePanelOpen: boolean
  isContextPanelOpen: boolean
  isCommsDockOpen: boolean
  loaded: boolean
  toggleSidePanel: function
  toggleContextPanel: function
  toggleCommsDock: function
  ```
- **Persistence:** localStorage (`nexus.shell.state`)
- **Defaults:** SidePanel open, ContextPanel open, CommsDock closed

### CommandPaletteProvider
- **File:** `components/providers/CommandPaletteContext.js`
- **Exports:** `CommandPaletteProvider`, `useCommandPalette()`
- **Action Registry:** Includes navigation, toggles, alerts
- **Callbacks Accepted:**
  - `onNavigate(page)` → navigate to page
  - `onToggleSidePanel()` → toggle left panel
  - `onToggleContextPanel()` → toggle right panel
  - `onOpenAccessRequest()` → open access gate modal
  - `onTriggerTestAlert(type)` → trigger test notifications

### NotificationProvider
- **File:** `components/providers/NotificationContext.js`
- **Exports:** `NotificationProvider`, `useNotification()`
- **Manages:** Stack of notifications (alerts, success, error, info)
- **Features:** Auto-dismiss, action buttons, customizable duration

---

## Header & Controls

### Header
- **File:** `components/layout/Header.js`
- **Fixed Height:** h-16 (64px)
- **Layout:** Single row, no wrap
- **Left Section:** Callsign + Rank badge + Membership tag + Role pills
- **Right Section:** Telemetry (hidden on mobile) + Panel toggles + Command palette
- **Controls:**
  - PanelLeft button → Toggle SidePanel
  - PanelRight button → Toggle ContextPanel
  - Search button → Open Command Palette (Ctrl+K)

---

## Navigation & Panels

### SidePanel
- **File:** `components/layout/SidePanel.js`
- **Width:** w-64 (collapsible)
- **Content:** Navigation links with icon + label
- **Features:** Access gating for "Focused Comms" feature
- **Visibility:** Controlled by `useShellUI().isSidePanelOpen`

### ContextPanel (NEW — Phase 1D)
- **File:** `components/layout/ContextPanel.js`
- **Width:** w-64 (collapsible)
- **Sections:** 5 accordion sections (Active Nets, Voice Controls, Roster, Riggsy, Diagnostics)
- **Scrolling:** Internal overflow-y-auto
- **Visibility:** Controlled by `useShellUI().isContextPanelOpen`
- **Close Button:** Toggles context panel off

### CommsDock
- **File:** `components/layout/CommsDock.js`
- **Status:** Exists; toggle state ready (Phase 1D does not wire voice functionality)
- **Visibility:** Controlled by `useShellUI().isCommsDockOpen`

---

## Command Palette Actions

### Action Registry (CommandPaletteContext.js)

#### Navigation Actions
- `nav:hub` → Hub page
- `nav:events` → Events page
- `nav:comms` → Comms Console
- `nav:directory` → User Directory
- `nav:recon` → Recon/Archive

#### Toggle Actions (NEW — Phase 1D)
- `toggle:sidepanel` → Toggle Sidebar (always visible)
- `toggle:contextpanel` → Toggle Systems Panel (always visible)
- `toggle:comms-dock` → Toggle Comms Dock (always visible)

#### Alert Actions
- `alert:view` → View Alerts (scroll to notification center)
- `alert:test-event` → Trigger sample event notification (dev)
- `alert:test-system` → Trigger sample system notification (dev)

#### Access Actions
- `open:request-access` → Apply for Focused Comms (conditional visibility)

---

## Supporting Utilities

### Labels & Display Names
- **File:** `components/constants/labels.js`
- **Functions:**
  - `getRankLabel(rank)` → Display label for rank
  - `getMembershipLabel(membership)` → Display label with "Vagrant" → "Prospect" alias
  - `getRoleLabel(role)` → Display label for role

### Channel Types & Access
- **File:** `components/constants/channelTypes.js`
- **Exports:** `COMMS_CHANNEL_TYPES`, `requiresPermissionGating(type)`

### Comms Access Policy
- **File:** `components/utils/commsAccessPolicy.js`
- **Functions:**
  - `canAccessFocusedComms(user, channel)` → Boolean
  - `getAccessDenialReason(user, channel)` → String explanation

### Current User Hook
- **File:** `components/useCurrentUser.js`
- **Exports:** `useCurrentUser()` hook, `MOCK_USER_VARIANTS`
- **Returns:** User object with callsign, rank, membership, roles

---

## Notifications & Alerts

### NotificationCenter
- **File:** `components/notifications/NotificationCenter.js`
- **Display:** Top-right corner, stacked
- **Types:** info, success, warning, error, alert
- **Features:** Icon, title, message, action buttons, auto-dismiss

### Alert Simulator Hook (Dev)
- **File:** `components/hooks/useAlertSimulator.js`
- **Functions:**
  - `triggerEventAlert()` → Sample event notification
  - `triggerSystemAlert()` → Sample system notification
  - `triggerSuccessNotification()` → Sample success
  - `triggerErrorNotification()` → Sample error

---

## Responsive Design

### Breakpoints
- **Mobile (< 640px):** Single column; panels hidden by default; toggleable via command palette
- **Tablet (640px–1024px):** 3-column layout visible; header controls shown
- **Desktop (1024px+):** Full layout + telemetry strip visible

### No Horizontal Scroll
- SidePanel w-64 (fixed)
- ContextPanel w-64 (fixed)
- Main flex-1 (fills remaining)
- Body overflow-hidden; internal panels scroll

---

## File Tree (Phase 1D)

```
Layout.js                                    (app shell)
├── components/
│   ├── providers/
│   │   ├── ShellUIContext.js               (state management)
│   │   ├── CommandPaletteContext.js        (command registry)
│   │   ├── CommandPaletteUI.js             (modal)
│   │   └── NotificationContext.js          (notifications)
│   ├── layout/
│   │   ├── Header.js                       (fixed, h-16)
│   │   ├── SidePanel.js                    (left nav)
│   │   ├── ContextPanel.js                 (right sidebar, NEW)
│   │   └── CommsDock.js                    (right panel, toggle ready)
│   ├── notifications/
│   │   └── NotificationCenter.js           (toast stack)
│   ├── constants/
│   │   ├── labels.js                       (canonical labels)
│   │   ├── channelTypes.js                 (access rules)
│   │   └── membership.js                   (membership tiers)
│   ├── utils/
│   │   └── commsAccessPolicy.js            (permission logic)
│   ├── hooks/
│   │   ├── useShellUI.js                   (exported from context)
│   │   ├── useAlertSimulator.js            (dev alerts)
│   │   └── useLayoutPreferences.js         (legacy, to deprecate)
│   ├── useCurrentUser.js                   (user data)
│   ├── PermissionGuard.js                  (access control wrapper)
│   └── PHASE_1D_VERIFICATION.md            (this phase's report)
└── pages/
    ├── Hub.js
    ├── Events.js
    ├── CommsConsole.js
    ├── Settings.js
    ├── AccessGate.js
    └── ...
```

---

## Phase Timeline

### Phase 1A — Core Shell Wiring
- Header layout
- Basic navigation

### Phase 1B — User Profiles & Access Control
- Rank/membership system
- Access gating for focused comms

### Phase 1C — Command Palette
- Global command registry
- Access-based filtering
- Ctrl+K shortcut

### Phase 1D — AppShell Geometry + Context Panel (Current)
- ShellUIProvider (centralized state)
- ContextPanel (right sidebar)
- 3-column flex layout
- Header toggle controls
- Persistence to localStorage

### Phase 1E (Future) — Voice & Real-Time
- LiveKit integration for voice nets
- Real roster data
- Riggsy AI agent chat
- CommsDock voice controls

---

## Maintenance Notes

### Adding New Command Palette Actions
1. Edit `components/providers/CommandPaletteContext.js`
2. Add action object to `createActionRegistry()` array
3. Implement callback in provider (if needed)
4. Test visibility & execution

### Adding New ContextPanel Sections
1. Edit `components/layout/ContextPanel.js`
2. Add section key to `expandedSections` state
3. Add `SectionHeader` + content JSX
4. Add toggle handler

### Persisting New Panel States
- Already supported by ShellUIContext
- Add state key to `DEFAULT_STATE` and toggle function
- localStorage auto-persists

### Testing Across Breakpoints
- Tailwind: sm (640px), md (768px), lg (1024px), xl (1280px)
- Test on: iPhone (375px), iPad (768px), Desktop (1440px)
- Verify no horizontal scroll at any breakpoint

---

## Known Issues & Workarounds

### Issue: Hook called outside provider scope
**Workaround:** Added null checks in components using `useShellUI()`, `useCommandPalette()`

### Issue: localStorage unavailable in SSR
**Workaround:** Checked for typeof window before accessing localStorage

### Issue: State sync across tabs
**Note:** Not implemented; each tab has independent state. Could use `storage` event listener in future.

---

*Last verified: 2026-01-28*  
*Maintained by: Mission Control Dev Team*