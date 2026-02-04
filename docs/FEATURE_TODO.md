# Nomad Nexus — Cutting-Edge Feature Todo

This list tracks all future‑facing features discussed and where they stand. Items are grouped by outcome and ordered roughly by impact. Items marked **[BLOCKED]** need Base44 schema/config or product approval.

## Communication & Presence
- [x] **Smart mentions** — `@callsign`, `@role:medic`, `@rank:scout`, `@membership:member` (notifications)  
  Status: Implemented via `processMessageMentions` with channel mute checks.
- [x] **Mentions view** — in‑app list + jump‑to channel  
  Status: Implemented in Comms Dock Mentions tab.
- [x] **Realtime notifications** — in‑app + desktop + sound honoring channel preferences  
  Status: Implemented with preference cache.
- [x] **Presence heartbeat** — member‑auth function + online roster  
  Status: Implemented (`updateUserPresence`, `getOnlinePresence`, `getPresenceSnapshot`).
- [x] **Presence context cards** — hover card showing active net/op + last seen  
  Status: Implemented on message headers with presence + profile data.
- [x] **Thread follow** — follow/unfollow in thread panel  
  Status: Implemented with localStorage fallback + optional entity.
- [x] **Thread reply notifications** — notify parent + followers  
  Status: Implemented via `processThreadReplyNotifications`.
- [x] **Channel routing rules** — `#ops`/`#intel` auto‑route  
  Status: Implemented via `routeChannelMessage` with safe defaults.
- [x] **Channel routing admin UI** — manage routing rules in System Admin  
  Status: Implemented with safe fallback; editing enabled when `ChannelRoutingRule` exists.

## Ops & Events
- [ ] **Op timeline** — structured log with pinned comms  
  Status: **[BLOCKED]** (needs `OperationLog` entity + MissionControl UI).
- [ ] **AAR templates** — guided After‑Action Reports  
  Status: Partially available (AI functions exist), needs UI + storage.
- [ ] **Readiness checklist** — per‑event launch checklist  
  Status: **[BLOCKED]** (needs `EventChecklist` entity).

## Governance & Membership
- [ ] **Auto‑rank review** — periodic promotion recommendations  
  Status: **[BLOCKED]** (needs scheduled function + data model).
- [ ] **Role‑based channel packs** — auto‑subscribe channels by role  
  Status: **[BLOCKED]** (needs `ChannelPack` entity + membership hooks).
- [ ] **Membership enforcement expansion** — enforce membership across all modules  
  Status: Partially in place; needs full audit pass.

## Knowledge Base
- [ ] **SOP library** — versioned docs, tags, search  
  Status: **[BLOCKED]** (needs `SOP` entity + revision schema).
- [ ] **Mission brief generator** — template + AI, export to PDF  
  Status: Partially in place (report tools exist), needs UI.

## UX & Reliability
- [ ] **Incident mode** — streamlined UI for emergencies  
  Status: **[BLOCKED]** (UI only; needs design decision).
- [ ] **Comms health dashboard** — LiveKit status, packet loss, jitter  
  Status: Partially in place; needs LiveKit stats integration.
- [ ] **Offline read‑only cache** — last channel/messages  
  Status: **[BLOCKED]** (needs local cache strategy).

## Mobile & PWA
- [ ] **PWA badge counts** — unread indicators on app icon  
  Status: **[BLOCKED]** (browser support varies; needs UX decision).
- [ ] **Quick action tiles** — join net / mark op / ping command  
  Status: **[BLOCKED]** (UI only; needs design decision).

---
## Schema/Config Dependencies (Base44)
These entities or configs should be added in Base44 to fully unlock features:
- `ChannelRoutingRule` (tag, target_channel_names[]) — optional; unlocks routing admin edits
- `ThreadSubscription` (thread_message_id, user_id/member_profile_id, is_following)
- `OperationLog` (event_id, actor_id, type, content, created_at)
- `EventChecklist` (event_id, items[])
- `SOP` (title, body, tags[], version, author_id)
- `ChannelPack` (role_id, channel_ids[])

---
## Implementation Notes
- All new logic uses MemberProfile identity as the primary user ID.
- Functions are safe‑guarded; if schema is missing, UI falls back gracefully.
