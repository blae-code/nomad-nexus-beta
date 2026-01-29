# Text Comms Dock — Architecture & Implementation Manifest

## Overview
The Text Comms Dock is a persistent, collapsible bottom-anchored dock providing unified access to text communications, polls, AI assistants, and direct messages. It integrates with the main layout via `ShellUIProvider` state and toggles via header button and command palette.

---

## Core Architecture

### Layout Integration
- **Location**: `Layout.js` (AppShell bottom dock section)
- **Mount Point**: Fixed bottom div, only rendered when `isCommsDockOpen === true`
- **State Management**: Persistence via `ShellUIProvider`
- **Toggle Triggers**:
  - Header button (MessageSquare icon with unread badge)
  - Command palette: "Toggle Comms Dock" (Cmd+Shift+C)
  - Minimize/expand button within dock header

### State Persistence
- `isCommsDockOpen` → localStorage (`nexus.shell.commsDockOpen`)
- `dockMinimized` → localStorage (minimized state)
- Channel selection → session state (auto-select bound channel)
- Device selection → localStorage (future enhancement)

### Provider Integration
```
Layout.js (AppShell)
├── ShellUIProvider (isCommsDockOpen, dockMinimized, toggles)
├── NotificationProvider (unread count updates)
└── CommandPaletteProvider (Cmd+Shift+C hotkey)
```

---

## Component Structure

### Main Container
- **File**: `components/comms/TextCommsDock.js`
- **Responsibility**: Bottom dock wrapper, tab management, channel/message orchestration
- **Key Features**:
  - Fixed bottom anchoring (h-96, flex-shrink-0)
  - Internal scrolling (no horizontal scroll)
  - Minimize/close toggles
  - Four tabs: Comms, Polls, Riggsy, Inbox
  - Unread badge per tab
  - Active Op binding auto-selection

### Tab: Comms (Full Implementation)
**Purpose**: Text channel browsing, message history, and composition

**Structure**:
1. **Channel List (Left Sidebar, w-40)**
   - Search input with debounce
   - Three groups: Casual, Focused, Temporary
   - Channel selection with visual highlight
   - Unread count badges per channel
   - Lock icons for gated channels (red/disabled state)

2. **Message View (Center/Right, flex-1)**
   - Channel header with name + status
   - Scrollable message list (auto-scroll to bottom on new messages)
   - Message format: timestamp, sender, content
   - Empty state: "No messages yet"

3. **Composer (Bottom)**
   - Text input with Send button
   - Keyboard support: Enter to send, Shift+Enter for new line
   - Disabled when channel locked or no channel selected
   - Auto-clears on successful send

### Tab: Polls (Stub)
- Placeholder: "Polls appear here"
- Unread count badge supported

### Tab: Riggsy (Stub)
- Placeholder: "Riggsy AI assistant appears here"
- Unread count badge supported

### Tab: Inbox (Stub)
- Placeholder: "Direct messages appear here"
- Unread count badge supported

---

## Data Flow & State Management

### Channel Data
```javascript
channels → [{id, name, category, access_min_rank, allowed_role_tags, ...}, ...]
selectedChannelId → Currently active channel
filteredChannels → Searched subset of channels
```

### Message Data
```javascript
messages → [{id, channel_id, user_id, content, created_date, ...}, ...]
messageInput → Composer text state
loadingMessages → Loading indicator
```

### Access Control
```javascript
canAccessChannel(channel) → Boolean based on category + user membership
- Casual: Always true
- Focused: User must pass canAccessFocusedComms()
- Temporary: Open to all
```

### Unread Tracking
```javascript
unreadByTab → {comms: 5, polls: 0, riggsy: 2, inbox: 1}
markChannelRead(channelId) → Mark channel as read (debounced 500ms)
refreshUnreadCounts() → Force refresh from backend
```

---

## Access Control & Gating

### Comms Access Policy
- **File**: `components/utils/commsAccessPolicy.js`
- **Function**: `canAccessFocusedComms(user, channel)`
- **Rules**:
  - Casual channels: Open to all ranks (Vagrant+)
  - Focused channels: Member+ rank required (not Guest/Vagrant)
  - Temporary Focused: Open to all (for temporary briefings)
  - Admin-restricted: Explicit allowlist via `allowed_role_tags`

### Visual Gating
- Lock icon replaces Hash icon for locked channels
- Disabled button state (opacity-50, cursor-not-allowed)
- Disabled composer when channel locked
- Tooltip: "Focused channels are for Members, Affiliates, and Partners"

---

## Integration Points

### Active Operation Binding (Phase 4A)
- When `activeOp.binding.commsChannelId` is set, auto-select that channel
- Do NOT steal focus if user is typing (check `document.activeElement`)
- Only auto-select once per binding change

### Unread Badge in Header
- Header file: `components/layout/Header.js`
- Badge element: Red circle with count (top-right of MessageSquare icon)
- Count source: `unreadByTab?.comms` from `useUnreadCounts()`
- Updates via `NotificationProvider` hook

### Command Palette Integration
- Action: `toggle:comms-dock`
- Shortcut: Cmd+Shift+C
- Calls: `onToggleCommsDock()` handler from `CommandPaletteProvider`

---

## File Locations & Dependencies

```
layout/
  Layout.js ← AppShell (mounts TextCommsDock)
  CommsDockShell.js ← LEGACY (deprecated, returns null)
  CommsDock.js ← LEGACY (deprecated, returns null)

components/comms/
  TextCommsDock.js ← Main dock container
  ChannelList.js ← Channel sidebar (future separation)
  MessageView.js ← Message history (future separation)
  MessageComposer.js ← Input field (future separation)
  CommsTab.js ← Full comms integration (integrated into TextCommsDock)
  CommsTabEnhanced.js ← Alt implementation (check for duplicates)

components/providers/
  ShellUIContext.js ← Dock open/closed + minimized state
  CommandPaletteContext.js ← Hotkey + action registry

components/hooks/
  useUnreadCounts.js ← Unread tracking per channel/tab

components/utils/
  commsAccessPolicy.js ← Access control rules

components/services/
  commsService.js ← Backend integration (getMessages, sendMessage, etc.)

components/constants/
  channelTypes.js ← Channel category enums
  membership.js ← Membership tier rules
```

---

## Key Constants & Enums

### Channel Categories
```javascript
COMMS_CHANNEL_TYPES = {
  CASUAL: 'casual',
  FOCUSED: 'focused',
  ADMIN: 'admin',
  SQUAD: 'squad',
  PUBLIC: 'public',
}
```

### Membership Tiers for Focused Access
```
Guest/Vagrant → NO access
Scout/Voyager → YES access
Partner/Alliance → YES access
Admin → YES access (all)
```

### Dock State Keys
```
localStorage:
  nexus.shell.commsDockOpen → Boolean
  nexus.shell.dockMinimized → Boolean
  nexus.commsDock.selectedChannelId → String (channel ID)
```

---

## LocalStorage Keys

| Key | Purpose | Scope |
|-----|---------|-------|
| `nexus.shell.commsDockOpen` | Dock open/closed state | Persistent |
| `nexus.shell.dockMinimized` | Minimized state | Persistent |
| `nexus.commsDock.selectedChannelId` | Last selected channel | Session |

---

## Layout Constraints & Scrolling

### Horizontal Overflow Prevention
✅ Fixed bottom positioning (bottom-0 left-0 right-0)
✅ Fixed h-96 height
✅ No horizontal scrollbar
✅ Channel list width: `w-40` (160px)
✅ Message/composer flex to remaining space

### Vertical Scrolling
✅ Channel list: `overflow-y-auto` (internal scroll)
✅ Message view: `overflow-y-auto` (internal scroll)
✅ Auto-scroll to bottom on new messages
✅ Header: `flex-shrink-0` (always visible)
✅ Tabs: `flex-shrink-0` (always visible when not minimized)
✅ Composer: `flex-shrink-0` (always visible when not minimized)

### Content Area Padding
✅ Layout.js applies `pb-96` to main content when dock is open
✅ Padding removed when dock is closed or minimized
✅ Smooth transition via Tailwind duration-200

---

## Testing & Validation

### Manual Acceptance Criteria
- [ ] Dock appears at bottom when `isCommsDockOpen === true`
- [ ] Dock toggles via header MessageSquare button
- [ ] Dock toggles via Command Palette (Cmd+Shift+C)
- [ ] Minimize/expand button works
- [ ] Close button works
- [ ] Channel list loads and displays channels
- [ ] Channels grouped by Casual/Focused/Temporary
- [ ] Lock icons show for locked channels
- [ ] Channel selection updates message view
- [ ] Unread badges display per channel
- [ ] Messages load and display chronologically
- [ ] Composer sends messages (Enter key)
- [ ] Auto-scroll to bottom on new message
- [ ] Access gating prevents locked channel interaction
- [ ] Bound channel auto-selects on Active Op change
- [ ] Unread counts update in header badge
- [ ] No horizontal scroll on any viewport
- [ ] Internal scrolling works smoothly
- [ ] State persists across page reload
- [ ] Minimize state persists across page reload

### Dev Checklist
- [ ] No console errors on dock toggle
- [ ] All imports resolve (no 404s)
- [ ] `canAccessFocusedComms()` called correctly
- [ ] Unread counts sync with backend
- [ ] Message send endpoint responsive
- [ ] No race conditions on channel switch
- [ ] Responsive on mobile (if applicable)

---

## Edge Cases & Fallbacks

### No Channels Loaded
→ Show empty state: "No channels available"

### User Without Focused Access
→ Show lock icon and disabled state
→ Tooltip: access denial reason

### Message Send Failure
→ Keep message in input
→ Show error toast

### Unread Sync Delay
→ Debounce read-state updates (500ms)
→ Prevents rapid API calls on channel switch

### Active Op Binding Change
→ Auto-select new channel only if not currently typing
→ Check: `document.activeElement === messageInput`

---

## Future Enhancements

1. **Message Threading**: Click message to expand inline replies
2. **Reactions & Emojis**: Add emoji picker and reaction buttons
3. **File Uploads**: Drag-drop or attachment button for media
4. **Channel Creation UI**: Admin-only interface to create channels
5. **Message Search**: Full-text search across channels
6. **Typing Indicators**: Show "X is typing..." in real-time
7. **Message Editing/Deletion**: Edit and delete own messages
8. **Polls Integration**: Full poll creation and voting UI
9. **Direct Messages**: Tab for 1-on-1 chats
10. **Mentions & @-Replies**: Highlight and notify mentioned users

---

## Deprecation Notes

### Legacy Files (Safe to Delete After Verification)
- `components/layout/CommsDockShell.js` → Now returns null, no longer used
- `components/layout/CommsDock.js` → Now returns null, no longer used
- `components/comms/CommsTab.js` → Functionality merged into TextCommsDock.js

### Migration Checklist
- [ ] Search codebase for imports of CommsDockShell → None found
- [ ] Search codebase for imports of CommsDock → None found
- [ ] Search codebase for imports of CommsTab → None found
- [ ] Verify TextCommsDock.js is only dock instance
- [ ] Confirm no duplicate dock implementations

---

## Troubleshooting

### Dock doesn't appear
→ Check `ShellUIProvider` wraps Layout
→ Check localStorage isn't corrupted: `localStorage.removeItem('nexus.shell.commsDockOpen')`
→ Verify `isCommsDockOpen` is true in ShellUI state

### Channels don't load
→ Check Channel entity exists in database
→ Verify permissions allow read access
→ Check console for entity fetch errors

### Messages don't send
→ Verify Message entity exists
→ Check user is authenticated (user?.id exists)
→ Verify channel is not locked
→ Check console for API errors

### Unread counts don't update
→ Verify `useUnreadCounts()` hook is initialized with user.id
→ Check backend is returning unread_count field
→ Confirm `markChannelRead()` is being called

### Access denied on Focused channel
→ User must have `rank >= SCOUT` (not Vagrant/Guest)
→ Check `canAccessFocusedComms()` logic in commsAccessPolicy.js
→ Verify channel category is 'focused'

---

**Last Updated**: 2026-01-29
**Version**: 1.0 (Complete)