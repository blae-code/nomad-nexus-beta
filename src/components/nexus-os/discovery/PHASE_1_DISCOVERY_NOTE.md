# Nexus OS Discovery Note (Phase 1)

Date: 2026-02-09
Scope: inventory only, no behavior changes.

## Operations / Events Concepts Found

- Core operation page surfaces:
  - `src/pages/MissionControl.jsx`
  - `src/pages/Events.jsx`
  - `src/pages/FrontierOps.jsx`
  - `src/pages/CommandCenter.jsx`
- Active operation state is centralized in:
  - `src/components/ops/ActiveOpProvider.jsx`
- Frequent operation entities used by current UI/functions include:
  - `Event`, `EventLog`, `EventParticipant`, `EventReport`, `OpBinding`, `TacticalCommand`
- Command workflows are already scaffolded in:
  - `functions/issueTacticalOrder.ts`
  - `functions/acknowledgeTacticalOrder.ts`
  - `functions/escalateTacticalOrder.ts`

## Comms / Channels / Presence Concepts Found

- Primary comms UI surface:
  - `src/pages/CommsConsole.jsx`
- Supporting comms services/models:
  - `src/components/services/commsService.jsx`
  - `src/components/services/presenceService.jsx`
  - `src/components/models/comms.jsx`
  - `src/components/models/presence.jsx`
- Routing and policy hints exist in:
  - `src/components/constants/channelRouting.jsx`
  - `functions/_shared/channelRouting.ts`
- Presence update/query functions:
  - `functions/updateUserPresence.ts`
  - `functions/getPresenceSnapshot.ts`
  - `functions/getOnlinePresence.ts`

## Teams / Squads / Roles Concepts Found

- Role constants:
  - `src/components/constants/roles.jsx`
- Squads and memberships already appear in data registry and command flows:
  - `src/components/services/dataRegistry.jsx`
  - `src/pages/CommandCenter.jsx`
  - `functions/updateNomadRegistry.ts`
- Existing scope terms are inconsistent (`userId`, `member_profile_id`, rank/role labels), so Phase 2+ should normalize naming via schema interfaces first.

## PTT / STT Scaffolding Found

- PTT toggle and voice session shape:
  - `src/components/voice/VoiceNetProvider.jsx`
  - `src/components/voice/VoiceCommsDock.jsx`
  - `src/components/services/voiceService.jsx`
- Browser STT/TTS scaffolding:
  - `src/components/comms/SpeechEngine.jsx`
  - `src/components/comms/SpeechSettings.jsx`
- Backend transcription hook (placeholder, no real audio truth):
  - `functions/transcribeVoiceNet.ts`

## Base44 Entity + Service Location

- Frontend Base44 client:
  - `src/api/base44Client.js`
  - `src/api/memberFunctions.js`
- Server/service role auth and client bootstrap:
  - `functions/_shared/memberAuth.ts`
- Base44 entity usage is distributed across:
  - `src/pages/*` and `src/components/services/*` (frontend direct entity reads/writes)
  - `functions/*.ts` (authoritative writes, automation, moderation, comms control)

## Notes for Foundation Work

- Existing repo already contains multiple operation/comms implementations; do not refactor routes/pages in this phase.
- Foundation modules should remain additive and isolated until migration is explicitly planned.
- All new tactical truth should remain declared/inferred, TTL-bound, and confidence-scored.
