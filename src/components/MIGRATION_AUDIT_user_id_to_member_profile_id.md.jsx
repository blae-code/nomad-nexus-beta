# Migration Audit: `user_id` → `member_profile_id`

**Scope:** Complete refactor replacing all `user_id` references with `member_profile_id` (MemberProfile becomes the primary internal user table)

**Status:** Pending Implementation

---

## ENTITIES TO MIGRATE

### Core Identity
- **MemberProfile** ✓ (Already primary; currently has `user_id` field - needs removal or repurposing)
  - Remove: `user_id` field (this entity IS the identity now)
  - Keep: `callsign`, `rank`, `roles`, onboarding/disclaimer flags

### Communications
- **Message**
  - `user_id` → `member_profile_id` (who sent message)
  - `deleted_by` → `deleted_by_member_profile_id`
  - `mentions[]` → `mentions[]` (array of member_profile_ids)
  - `read_by[]` → `read_by[]` (array of member_profile_ids)
  - `thread_participants[]` → `thread_participants[]` (array of member_profile_ids)
  - `reactions[].user_ids[]` → `reactions[].member_profile_ids[]`
  - `whisper_metadata.sender_id` → `whisper_metadata.sender_member_profile_id`
  - `whisper_metadata.recipient_user_ids[]` → `whisper_metadata.recipient_member_profile_ids[]`

- **Channel**
  - `group_owner_id` → `group_owner_member_profile_id`
  - `dm_participants[]` → `dm_participants[]` (array of member_profile_ids)

- **ChannelMute**
  - `user_id` → `member_profile_id` (who is muted)
  - `muted_by` → `muted_by_member_profile_id` (who did the muting)

- **PinnedMessage**
  - `pinned_by` → `pinned_by_member_profile_id`

- **Notification**
  - `user_id` → `member_profile_id` (who receives it)

- **VoiceMute**
  - `user_id` → `member_profile_id` (who is muted)
  - `muted_by` → `muted_by_member_profile_id`

### Events & Operations
- **Event**
  - `host_id` → `host_member_profile_id`
  - `assigned_user_ids[]` → `assigned_member_profile_ids[]`
  - `command_staff.commander_id` → `command_staff.commander_member_profile_id`
  - `command_staff.xo_id` → `command_staff.xo_member_profile_id`
  - `command_staff.comms_officer_id` → `command_staff.comms_officer_member_profile_id`

- **EventDutyAssignment**
  - `user_id` → `member_profile_id`

- **EventLog**
  - `user_id` → `member_profile_id` (created_by context)

- **EventReport**
  - `user_id` → `member_profile_id` (created by, reviewed by fields)

- **EventParticipant**
  - `user_id` → `member_profile_id`

- **OpParticipant**
  - `user_id` → `member_profile_id`

- **OpBinding**
  - `user_id` → `member_profile_id`

### Status & Presence
- **PlayerStatus**
  - `user_id` → `member_profile_id`

- **UserPresence**
  - `user_id` → `member_profile_id`

- **VoicePrefs**
  - `user_id` → `member_profile_id`

### Squad/Team
- **SquadMembership**
  - `user_id` → `member_profile_id`

- **SquadApplication**
  - `user_id` → `member_profile_id` (applicant)
  - `reviewed_by` → `reviewed_by_member_profile_id` (if present)

- **SquadRecruitment**
  - `recruiter_user_id` → `recruiter_member_profile_id`

### Fleet & Assets
- **FleetAsset**
  - `assigned_user_id` → `assigned_member_profile_id`

### Access & Security
- **AccessKey**
  - `redeemed_by_user_ids[]` → `redeemed_by_member_profile_ids[]`
  - `created_by_user_id` → `created_by_member_profile_id`

- **AccessKeyAudit**
  - `user_id` → `member_profile_id` (who performed audit action)

- **AdminAuditLog**
  - `actor_user_id` → `actor_member_profile_id`
  - `executed_by` → `executed_by_member_profile_id`

### Voice & Comms
- **VoiceNet**
  - `allowed_role_ids[]` (stays the same - these are Role entity IDs, not users)

- **NetPatch**
  - `created_by` → `created_by_member_profile_id`

- **VoiceNetStatus**
  - Fields referencing user state → member_profile_id equivalents

### Finance & Resources
- **CofferTransaction**
  - `user_id` → `member_profile_id`

### Audit & Logging
- **AuditLog** (if exists separately)
  - `user_id` → `member_profile_id`

---

## BACKEND FUNCTIONS TO MIGRATE

### Critical Path (Auth/Access)
- `redeemAccessKey.js` ✓ (Already updated - creates MemberProfile)
- `createAccessKey.js` (update created_by_user_id)
- `revokeAccessKey.js` (audit logging)

### User/Member Management
- `getUserDirectory.js` (query MemberProfile instead of User)
- `validateRankChangePermission.js` (MemberProfile rank checks)
- `validateVoyagerNumber.js` (MemberProfile validation)
- `validatePioneerUniqueness.js` (MemberProfile uniqueness)

### Comms
- `comms.js` (Message creation - user_id → member_profile_id)
- `sendWhisper.js` (recipient lookup)
- `moderateMessage.js` (deleted_by)
- `translateMessage.js` (message.user_id)
- `analyzeMessage.js` (message.user_id)
- `channelAIAssistant.js` (message author context)

### Events
- `initializeEventComms.js` (host_id, assigned_user_ids)
- `autoUpdateEventStatus.js` (event user references)
- `generateEventReport.js` (event.host_id, participants)
- `generateEventAAR.js` (attendees)
- `provisionCommsFromFormation.js` (user assignments)

### Voice/Presence
- `updateUserPresence.js` (user_id → member_profile_id)
- `cleanupStalePresence.js` (presence user references)
- `generateLiveKitToken.js` (user identity)
- `mintVoiceToken.js` (user identity)

### Notifications
- `processEventNotifications.js` (notification.user_id)
- `notifyFeatureCompletion.js`
- `notifyRoadmapUpdate.js`

### Analytics & Reporting
- `generateCommsSummary.js` (message user references)
- `generateMultiChannelSummary.js`
- `generateReport.js` (audit user fields)

### Data Management
- `populateSampleData.js` (seed with member_profile_ids)
- `populateTestAccessKeys.js` (update test data)
- `seedWeekOfActivity.js` (user assignments)
- `setupDemoScenario.js` (demo user setup)

### Admin/Ops
- `logAccessKeyAudit.js` (user_id field)
- `issueAccessKey.js` (created_by_user_id)
- `wipeAppData.js` (references to clean)

---

## FRONTEND COMPONENTS TO MIGRATE

### Authentication/Access
- `pages/AccessGate.js` (auth logic)
- `components/providers/AuthProvider.js` (user context)
- `components/auth/RouteGuard.js` (user checks)

### User/Profile Display
- `components/members/MemberList.js` (display members)
- `components/members/MemberProfile.js` (profile view)
- `components/useCurrentUser.js` (hook to fetch current member)

### Comms Components
- `components/comms/MessageItem.js` (message author, reactions)
- `components/comms/MessageComposer.js` (sender identity)
- `components/comms/TextCommsDock.js` (message authorship)

### Events
- `pages/Events.js` (event.host_id, assigned users)
- `components/events/EventNotificationManager.js`

### Navigation & Layout
- `components/layout/Header.js` (current user display)
- `components/layout/ContextPanel.js` (user info)

---

## MIGRATION STRATEGY

### Phase 1: Entity Schema Updates
1. Update all entity JSON schemas to replace `user_id` with `member_profile_id`
2. For array fields: update descriptions to clarify these are member_profile_ids
3. Remove `user_id` field from MemberProfile itself

### Phase 2: Backend Function Updates
1. Update `redeemAccessKey` (✓ done) - foundation
2. Update `createAccessKey` and access control functions
3. Update user lookup functions (`getUserDirectory`)
4. Update comms-related functions (Message, Channel)
5. Update event functions
6. Update voice/presence functions
7. Update audit/logging functions

### Phase 3: Frontend Updates
1. Update AuthProvider to work with member_profile_id
2. Update component queries (useCurrentUser, member lookups)
3. Update display logic to show member info from MemberProfile
4. Update form submissions to use member_profile_id

### Phase 4: Data Migration (if running against existing data)
1. Create data migration scripts
2. Map existing user_ids to member_profile_ids
3. Backfill all entity references

### Phase 5: Testing
1. Test AccessGate flow (new member creation)
2. Test authenticated operations (message creation, event assignment)
3. Test all comms, events, voice features
4. Test audit logging

---

## NOTES

- **MemberProfile.user_id**: Currently this field exists. Decision needed:
  - Option A: Remove entirely (MemberProfile ID is the identity)
  - Option B: Keep for backward compatibility / future User integration
  
- **Array Fields**: All arrays of "user IDs" become arrays of "member_profile_ids"
  - Examples: `assigned_user_ids[]`, `mentions[]`, `read_by[]`

- **Built-in User Entity**: The standard Base44 User entity will not be used for this app. MemberProfile is the exclusive user table.

- **Naming Convention**: All fields should use `member_profile_id` suffix consistently (not `member_id` or `member_user_id`)

- **Audit Trail**: AdminAuditLog and AccessKeyAudit must use `member_profile_id` to track who performed actions

---

## PRIORITY ORDER FOR IMPLEMENTATION

1. **Critical:** Entity schemas + redeemAccessKey ✓
2. **High:** createAccessKey, AuthProvider, getUserDirectory
3. **High:** Message/Channel/Comms functions
4. **Medium:** Event functions
5. **Medium:** Voice/Presence functions
6. **Low:** Reporting/Analytics functions