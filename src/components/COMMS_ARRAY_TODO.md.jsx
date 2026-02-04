# Comms Array Module - Completion Todo List

**Module Status:** 92% Complete  
**Target:** 100% Feature Complete Tactical Communication System  
**Total Estimated Effort:** 6-10 hours (remaining items scoped to advanced/blocked features)

> Note: This checklist originated during Phase 1. Many items are now complete; see `COMMS_ARRAY_AUDIT.md.jsx` for current status and remaining gaps.

---

## Phase 1: Core Infrastructure Migration ⚡ CRITICAL
**Goal:** Move from mock service to Base44 SDK, establish real-time capabilities  
**Estimated Time:** 3-4 hours

### Database Schema
- [ ] Create `CommsReadState` entity with fields:
  - `user_id` (string)
  - `scope_type` (enum: 'CHANNEL', 'TAB')
  - `scope_id` (string)
  - `last_read_at` (date-time)

### Service Layer Migration
- [ ] Replace `components/services/commsService.js` mock stores with Base44 SDK
  - [ ] Update `getChannels()` to use `base44.entities.Channel.list()`
  - [ ] Update `getChannel(id)` to use `base44.entities.Channel.get()`
  - [ ] Update `getMessages(channelId)` to use `base44.entities.Message.filter()`
  - [ ] Update `sendMessage()` to use `base44.entities.Message.create()`
  - [ ] Remove mock data stores (mockChannels, mockMessages, mockReadState)

### Real-time Subscriptions
- [ ] Implement `subscribeToChannel()` using `base44.entities.Message.subscribe()`
- [ ] Add connection state tracking (connected, reconnecting, disconnected)
- [ ] Update `TextCommsDock` to use real-time message subscription
- [ ] Add connection status indicator in dock header
- [ ] Handle subscription cleanup on component unmount

### Read State Persistence
- [ ] Update `getReadState()` to use `CommsReadState` entity
- [ ] Update `setReadState()` to use `CommsReadState` entity
- [ ] Integrate read state with `useUnreadCounts` hook
- [ ] Test read state persistence across page reloads

### Testing & Verification
- [ ] Test message sending/receiving across multiple browser tabs
- [ ] Verify real-time updates for all connected clients
- [ ] Test error handling for network failures
- [ ] Verify no console errors or warnings

**Deliverable:** ✅ Fully functional real-time messaging on Base44 infrastructure

---

## Phase 2: Essential Messaging Features 🔥 HIGH
**Goal:** Bring messaging to feature parity with modern chat apps  
**Estimated Time:** 5-6 hours

### Message Editing
- [ ] Add `is_edited` and `edit_history` fields to Message entity schema
- [ ] Add edit button to message hover UI (only for message author)
- [ ] Create inline edit mode in MessageView
- [ ] Update message with Base44 SDK
- [ ] Display "(edited)" indicator on edited messages

### Message Deletion
- [ ] Add `is_deleted` and `deleted_by` fields to Message entity (already exists)
- [ ] Add delete button to message hover UI (author or admin only)
- [ ] Implement soft delete (tombstone message display)
- [ ] Add delete confirmation dialog
- [ ] Log deletion in AuditLog entity

### Message Reactions
- [ ] Add `reactions` field to Message entity (array of objects: `{emoji, user_ids}`)
- [ ] Create reaction picker component
- [ ] Add reaction button to message hover UI
- [ ] Display reaction counts below messages
- [ ] Allow users to toggle their own reactions

### Rich Text Support
- [ ] Install/verify react-markdown is available
- [ ] Update MessageView to render markdown
- [ ] Add formatting toolbar to MessageComposer
  - [ ] Bold, italic, strikethrough buttons
  - [ ] Code block, quote buttons
  - [ ] Link button with URL input
- [ ] Add markdown preview toggle
- [ ] Test rendering of common markdown syntax

### File Attachments
- [ ] Add `attachments` field to Message entity (array of URLs)
- [ ] Add file upload button to MessageComposer
- [ ] Implement file upload via `base44.integrations.Core.UploadFile()`
- [ ] Display uploaded files in message (inline images, file links)
- [ ] Add file type icons and download buttons
- [ ] Add file size limit validation (e.g., 10MB)
- [ ] Support multiple files per message

### Message Search
- [ ] Add search input to channel header
- [ ] Implement client-side message search (filter by content)
- [ ] Add search result highlighting
- [ ] Add filters: date range, author, has:file, has:link
- [ ] Create search results view with jump-to-message

### User Mentions
- [ ] Add mention detection in message input (@username)
- [ ] Create user autocomplete dropdown component
- [ ] Fetch user list for autocomplete (base44.entities.User.list())
- [ ] Store mentions in message metadata
- [ ] Highlight mentioned users in MessageView
- [ ] Create Notification for mentioned users
- [ ] Update MentionsView to show messages that mention current user

**Deliverable:** ✅ Modern chat experience with attachments, formatting, and mentions

---

## Phase 3: Threading & Organization 📂 MEDIUM
**Goal:** Enable threaded conversations and better message organization  
**Estimated Time:** 4-5 hours

### Message Threading Schema
- [ ] Add `parent_message_id` field to Message entity
- [ ] Add `thread_message_count` field to Message entity
- [ ] Add `thread_participants` field to Message entity (array of user_ids)

### Thread UI Components
- [ ] Create `ThreadPreview` component (shows reply count, participants)
- [ ] Add "Reply in thread" button to message hover UI
- [ ] Create `ThreadPanel` component (side panel for viewing thread)
- [ ] Add thread expand/collapse functionality
- [ ] Show thread indicator on parent messages

### Thread View Implementation
- [ ] Replace stub `ThreadView` component
- [ ] Load active threads for current user (query messages where user is participant)
- [ ] Display thread list with preview of latest reply
- [ ] Add unread thread indicators
- [ ] Implement thread navigation (click to open thread in panel)
- [ ] Add "Mark thread as read" functionality

### Thread Notifications
- [ ] Create Notification when someone replies to user's message
- [ ] Create Notification when someone replies in a thread user is in
- [ ] Add thread notification preferences (all replies vs. mentions only)

### Pinned Messages
- [ ] Use existing `PinnedMessage` entity
- [ ] Add pin/unpin button to message hover UI (admin/moderator only)
- [ ] Create pinned messages banner at top of channel
- [ ] Implement pin order management (drag-to-reorder)
- [ ] Add "Jump to pinned message" functionality
- [ ] Limit pinned messages per channel (e.g., max 5)

**Deliverable:** ✅ Threaded conversations for better context and organization

---

## Phase 4: Direct Messaging & Groups 💬 MEDIUM
**Goal:** Enable private and group conversations  
**Estimated Time:** 6-7 hours

### Direct Message Channels
- [ ] Create `DirectMessage` entity (or use Channel with type='direct')
  - `participant_user_ids` (array)
  - `is_group` (boolean)
  - `group_name` (string, optional)
- [ ] Add "New DM" button to TextCommsDock
- [ ] Create user picker modal for starting DMs
- [ ] Auto-create DM channel when initiating conversation
- [ ] Display DM channels in separate section from public channels

### DM Channel List
- [ ] Create `DMChannelList` component
- [ ] Sort DMs by most recent activity
- [ ] Display online/offline status for DM partner
- [ ] Show unread count per DM
- [ ] Add DM search/filter

### Group Chats
- [ ] Add "New Group" button to create multi-user group
- [ ] Create group creation modal (select users, set name)
- [ ] Display group member avatars/names
- [ ] Add "Add member" and "Remove member" functionality
- [ ] Allow group renaming (by creator or admins)

### Groups View Implementation
- [ ] Replace stub `GroupsView` component
- [ ] Display list of group chats user is in
- [ ] Show group member count and recent activity
- [ ] Add group settings panel (members, permissions, leave group)
- [ ] Implement group notifications preferences

### Channel Categories
- [ ] Add `category` field to Channel entity (string, user-defined)
- [ ] Create category management UI (add, rename, delete)
- [ ] Display channels grouped by category
- [ ] Implement collapsible category sections
- [ ] Add drag-and-drop for channel reordering within categories
- [ ] Save category state in localStorage

**Deliverable:** ✅ Full private and group messaging capabilities

---

## Phase 5: Moderation & Admin Tools 🛡️ MEDIUM
**Goal:** Give admins and moderators effective tools  
**Estimated Time:** 4-5 hours

### Message Moderation
- [ ] Add "Delete Message" button (visible to admins/moderators)
- [ ] Create delete confirmation modal with reason input
- [ ] Store deletion reason in `Message.deleted_reason` field
- [ ] Create "Report Message" button for users
- [ ] Create `MessageReport` entity (user_id, message_id, reason, status)
- [ ] Create admin panel to review reported messages

### Auto-Moderation
- [ ] Create `ModerationRule` entity (type, pattern, action)
- [ ] Implement profanity filter (reject/warn on blacklisted words)
- [ ] Implement spam detection (rate limiting, duplicate message detection)
- [ ] Add auto-moderation settings panel (enable/disable rules)
- [ ] Log auto-moderation actions in AuditLog

### User Moderation
- [ ] Use existing `ChannelMute` entity
- [ ] Create "Mute User" action in channel (accessible to moderators)
- [ ] Create mute duration selector (1h, 24h, 7d, permanent)
- [ ] Display muted status in channel (user cannot send messages)
- [ ] Create "Timeout User" action (temporary mute)
- [ ] Create "Ban User" action (permanent removal from channel)

### Moderation Log
- [ ] Create moderation dashboard page (admin only)
- [ ] Display recent moderation actions from AuditLog
- [ ] Filter by action type, moderator, user, date
- [ ] Display moderation statistics (actions per day, most moderated users)

### Channel Management Tools
- [ ] Implement slow mode enforcement (use `slow_mode_seconds` field)
- [ ] Show slow mode countdown in MessageComposer
- [ ] Implement read-only channel mode (use `is_read_only` field)
- [ ] Show read-only indicator in channel
- [ ] Create channel archive functionality (soft delete channel)
- [ ] Create archived channels view (admin only)

**Deliverable:** ✅ Comprehensive moderation tools for community management

---

## Phase 6: Advanced Features 🚀 LOW
**Goal:** Add power-user and quality-of-life features  
**Estimated Time:** 8-10 hours

### Message History & Pagination
- [ ] Implement infinite scroll in MessageView
- [ ] Load older messages on scroll to top
- [ ] Add "Jump to Date" functionality
- [ ] Create message export feature (admin only)
  - [ ] Export as JSON
  - [ ] Export as CSV
  - [ ] Export as text file
- [ ] Add message bookmarking (save important messages)

### Notification System Integration
- [ ] Request browser notification permissions
- [ ] Create Notification on new message (if channel not active)
- [ ] Add notification preferences panel
  - [ ] Per-channel notification settings
  - [ ] Mute/unmute channels
  - [ ] Notification sound toggle
- [ ] Add custom notification sounds
- [ ] Test notifications on different browsers

### Voice Messages
- [ ] Add microphone record button to MessageComposer
- [ ] Implement audio recording via Web Audio API
- [ ] Display recording indicator and timer
- [ ] Upload audio file via `Core.UploadFile()`
- [ ] Create audio playback component
  - [ ] Play/pause button
  - [ ] Playback speed control (0.5x, 1x, 1.5x, 2x)
  - [ ] Waveform visualization (optional)
- [ ] Add optional transcription via `Core.InvokeLLM()`

### Link Previews
- [ ] Detect URLs in message content
- [ ] Fetch URL metadata (title, description, image)
- [ ] Display rich link preview cards
- [ ] Cache previews to avoid re-fetching
- [ ] Add option to disable previews per message

### Code Block Syntax Highlighting
- [ ] Detect code blocks in markdown (triple backticks)
- [ ] Add language-specific syntax highlighting
- [ ] Install/verify syntax highlighting library (e.g., prism.js)
- [ ] Add copy-to-clipboard button for code blocks
- [ ] Support inline code highlighting

### GIF Integration
- [ ] Add GIF button to MessageComposer
- [ ] Integrate with Giphy/Tenor API (requires API key secret)
- [ ] Create GIF picker modal with search
- [ ] Display GIF thumbnails in message
- [ ] Add GIF categories (trending, reactions, etc.)

### Custom Emoji Support
- [ ] Create `CustomEmoji` entity (name, image_url, creator_id)
- [ ] Add custom emoji upload (admin only)
- [ ] Display custom emoji in emoji picker
- [ ] Render custom emoji in messages
- [ ] Add emoji management panel (admin only)

**Deliverable:** ✅ Premium chat experience with advanced features

---

## Phase 7: Event Integration & Tactical Features ⚔️ LOW-MEDIUM
**Goal:** Deep integration with Event and operation workflows  
**Estimated Time:** 5-6 hours

### Event-Bound Channels
- [ ] Add `event_id` field to Channel entity
- [ ] Auto-create temporary channel when Event is created
- [ ] Link channel to Event in Event entity (`linked_channel_id`)
- [ ] Display event details in channel header
- [ ] Auto-archive channel when Event status becomes 'completed'
- [ ] Add "Event Channels" section in channel list

### Tactical Commands
- [x] Create `/` command parser in MessageComposer
- [x] Implement `/status` command (structured status update)
- [x] Implement `/sitrep` command (multi-channel summary)
- [x] Implement `/whisper` command (role/rank/squad/member)
- [x] Create command autocomplete dropdown (inline help)
- [x] Add command help modal (`/help`)
- [ ] Create `TacticalCommand` entity for custom commands (admin-defined)

### Command Permissions
- [ ] Add `min_rank_required` field to TacticalCommand entity
- [ ] Check user rank before allowing command execution
- [ ] Display error if user lacks permission
- [ ] Log command usage in EventLog entity

### Comms Analytics Dashboard
- [ ] Create analytics page (admin only)
- [ ] Display channel activity metrics
  - [ ] Messages per day/week/month
  - [ ] Active users per channel
  - [ ] Peak activity times (heatmap)
- [ ] Display user engagement stats
  - [ ] Most active users
  - [ ] Average messages per user
  - [ ] Engagement trends over time
- [ ] Add export analytics to CSV

### Integration Testing
- [ ] Test channel auto-creation on Event creation
- [ ] Test tactical commands in event context
- [ ] Test event channel archiving on event completion
- [ ] Verify analytics data accuracy

**Deliverable:** ✅ Seamless integration with operational workflow

---

## Final Verification Checklist

### Functionality
- [ ] All message CRUD operations work correctly
- [ ] Real-time updates across multiple clients
- [ ] No race conditions or data loss
- [ ] Proper error handling and user feedback

### Performance
- [ ] Message list handles 1000+ messages without lag
- [ ] Real-time subscriptions don't cause memory leaks
- [ ] File uploads complete within reasonable time
- [ ] Search results return within 1 second

### Security
- [ ] User can only edit/delete their own messages (or admin)
- [ ] Focused channel access properly gated
- [ ] Admin-only features protected by role checks
- [ ] No sensitive data exposed in client-side code

### UX/UI
- [ ] Consistent styling across all components
- [ ] Loading states for all async operations
- [ ] Empty states with helpful guidance
- [ ] Mobile-responsive design

### Documentation
- [ ] Update MANIFEST.md with new features
- [ ] Add inline code comments for complex logic
- [ ] Create user guide for tactical commands
- [ ] Document admin moderation tools

---

## Completion Metrics

**Current Status:** 35% Complete  
- ✅ Basic messaging (10%)
- ✅ Channel system (8%)
- ✅ Polls (5%)
- ✅ AI assistant (4%)
- ✅ Speech support (3%)
- ✅ Typing indicators (2%)
- ✅ Unread tracking (3%)

**Target Status:** 100% Complete  
- Phase 1: Migration (+10%) → 45%
- Phase 2: Essential features (+15%) → 60%
- Phase 3: Threading (+10%) → 70%
- Phase 4: DMs & Groups (+10%) → 80%
- Phase 5: Moderation (+8%) → 88%
- Phase 6: Advanced features (+7%) → 95%
- Phase 7: Event integration (+5%) → 100%

---

**Last Updated:** 2026-01-31  
**Document Version:** 1.0
