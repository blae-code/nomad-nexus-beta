# NexusOS Voice/Comms 20-Feature Implementation Todo

Date: 2026-02-11  
Owner: Codex (implementation authority)

Status legend:
- `[ ]` Not started
- `[~]` In progress
- `[x]` Implemented and verified

## 1) Audio Whisper (voice lanes by user/role/rank/squad)
- `[x]` Add whisper voice target model (`member|role|rank|squad`) in voice control plane state.
- `[x]` Add press-and-hold whisper transmit pathway in `VoiceNetProvider`.
- `[x]` Add scoped whisper control packets over LiveKit data channel.
- `[x]` Add backend audit entry for whisper voice transmissions and delivery targets.
- `[x]` Add UI target selector + active whisper indicator.
- `[x]` Test: non-target participants do not receive whisper payload metadata; target receives indicator.

## 2) Cross-channel voice routing (monitor multiple nets + one TX bus)
- `[x]` Refactor provider from single `activeNetId` to `monitoredNetIds[]` + `transmitNetId`.
- `[x]` Allow dynamic monitor subscriptions and TX bus toggle.
- `[x]` Add UI for monitor badges and explicit TX net selection.
- `[x]` Test: monitor `#flight`, transmit `#ops` persists and survives reconnect.

## 3) Role-based gates + discipline modes (OPEN/PTT/RTS/COMMAND_ONLY)
- `[x]` Add per-net discipline mode state.
- `[x]` Add request-to-speak queue and approval actions.
- `[x]` Enforce speak eligibility in provider prior to TX activation.
- `[x]` Persist mode/queue in comms backend logs.
- `[x]` Test: non-command cannot transmit in `COMMAND_ONLY`; RTS can be approved.

## 4) Voice moderation controls + audit integration
- `[x]` Add remote hard-mute/deafen/timed penalty state model.
- `[x]` Expand moderation action handling for timed penalties and radio checks.
- `[x]` Surface active moderation restrictions in roster and controls.
- `[x]` Test: timed mute auto-expires; audit record emitted.

## 5) Priority override (break-in/emergency ducking)
- `[x]` Add emergency override action in provider and command bus.
- `[x]` Add participant ducking/gain policy in transport.
- `[x]` Auto-create linked text `[ALERT]` log entry for emergency override.
- `[x]` Test: emergency sender gains priority state; others show ducked state.

## 6) Network quality/intelligibility telemetry
- `[x]` Add transport telemetry sampler (RTT/jitter/loss approximation).
- `[x]` Expose telemetry snapshots via provider state.
- `[x]` Add UI health panel with thresholds and remediation hints.
- `[x]` Test: reconnect/error state emits degraded telemetry status.

## 7) Output-device selection + per-user normalization
- `[x]` Add output device preference and persistence.
- `[x]` Add per-participant gain map and normalization toggle.
- `[x]` Add UI controls for output route and participant volume trim.
- `[x]` Test: preference persists reload; gain map updates roster state.

## 8) Channelized submixes within a net
- `[x]` Add submix model (`command|squad|local`) and monitor toggles.
- `[x]` Add TX submix tagging in control packets.
- `[x]` Add UI to monitor/unmonitor submixes.
- `[x]` Test: submix monitor state affects visibility/filtering in provider.

## 9) Op-bound voice+text+presence one-click sync
- `[x]` Add provider action to bind/join operation comms topology.
- `[x]` Update presence status to `in-call` with active op/net metadata.
- `[x]` Open bound text channel and apply op comms presets.
- `[x]` Test: one-click join sets net/channel/presence coherently.

## 10) Voice-to-text transcription + searchable radio log
- `[x]` Add backend radio log append/list/search actions.
- `[x]` Add transcription ingestion action (manual/system pipeline compatible).
- `[x]` Add UI panel for searchable transcript entries with timestamps.
- `[x]` Test: searchable by keyword and speaker.

## 11) Clip/recording capture with retention + permissions
- `[x]` Add clip metadata model (owner, scope, ttl, permissions).
- `[x]` Add capture-last-N-seconds action (metadata workflow).
- `[x]` Add role checks for clip visibility.
- `[x]` Test: unauthorized user cannot list/access restricted clips.

## 12) AI Comms Officer (voice -> structured SITREP/ORDERS/STATUS draft)
- `[x]` Add backend action to transform radio log/transcript into structured draft.
- `[x]` Add clear “AI draft” labeling and source timestamp citations.
- `[x]` Add confirm-before-post flow to text comms.
- `[x]` Test: no draft posted without user confirmation.

## 13) Hotkey + hardware integration (PTT chords/profiles)
- `[x]` Add hotkey profile model per net.
- `[x]` Add support for alternate key bindings/chords and persistence.
- `[x]` Add audible side-tone toggle state.
- `[x]` Test: profile switching updates active bindings without reload.

## 14) Comms loadout presets (EQ/noise suppression/codec/AGC profiles)
- `[x]` Add loadout preset registry and per-role/environment assignment.
- `[x]` Apply selected preset metadata in transport/provider session state.
- `[x]` Add UI to select and clone presets.
- `[x]` Test: preset persistence and applied-profile indicator.

## 15) Voice presence semantics in UI badges
- `[x]` Publish canonical transmitting/monitoring presence updates from provider.
- `[x]` Expose presence flags to message badges and roster.
- `[x]` Add jump-to-net affordance from presence badge.
- `[x]` Test: transmitting badge appears while keyed and clears after stop.

## 16) Server-authoritative roster + multi-client session consistency
- `[x]` Add authoritative session reconciliation model (provider + backend logs).
- `[x]` Add multi-tab device handover policy (single active TX device).
- `[x]` Add deterministic roster merge logic from snapshot + live events.
- `[x]` Test: second client takeover demotes first client TX authority.

## 17) Cross-net command whisper escalation (voice + text + receipts)
- `[x]` Add dual-delivery command whisper action (voice metadata + private text summary).
- `[x]` Add ACK/NAK receipt actions and unread indicators.
- `[x]` Add audit entries for delivery/receipt state.
- `[x]` Test: sender sees delivery and ACK/NAK status updates.

## 18) Secure comms mode (E2EE policy metadata, rotation, recording restrictions)
- `[x]` Add secure mode policy model on net sessions.
- `[x]` Add key-version rotation metadata and role-scoped access checks.
- `[x]` Enforce recording disabled policy when secure mode is active.
- `[x]` Test: secure mode metadata appears in token and UI lock indicators.

## 19) Comms-aware UX (voice-linked threads + speak-to-thread)
- `[x]` Add voice event anchor model that links transcript snippets to thread roots.
- `[x]` Add “thread this” action from radio log entries.
- `[x]` Render linked-thread chip in thread/message UI.
- `[x]` Test: thread opens from radio log anchor.

## 20) LiveKit data-channel command bus
- `[x]` Implement signed control-message publish/receive in transport.
- `[x]` Handle discipline controls (`silence`, `clear`, `priority`, `rts`) across clients.
- `[x]` Reflect command bus state transitions in operation voice workbench.
- `[x]` Test: command packets update clients consistently and append audit records.

## Regression/Validation Gate
- `[x]` Build: `npm run build`
- `[x]` Unit tests: `npm run test:unit`
- `[x]` Typecheck: `npm run typecheck`
- `[x]` Smoke verify: AccessGate and Onboarding flow unchanged
- `[x]` Smoke verify: existing comms + operation workflows still load
