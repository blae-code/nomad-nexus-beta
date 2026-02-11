# NomadNexus Audit Loop Log (2026-02-10)

## Communications

- **Voice PTT + Mic State – FIXED**
  - Reworked PTT from toggle-only behavior to hold-to-transmit behavior in `src/components/voice/VoiceControlPanel/VoiceControlsSection.jsx`.
  - Added provider-level `startPTT`/`stopPTT` actions and keyboard hold support (Space key down/up) in `src/components/voice/VoiceNetProvider.jsx`.
  - Added `localUserId` tracking in `src/components/voice/VoiceNetProvider.jsx` to support correct local speaker highlighting.
  - Added blur safety stop so transmit state is not left active after focus loss.

- **Voice Connection Health + Fallback Visibility – FIXED**
  - Exposed transport mode (`livekit` vs `mock`) in `src/components/voice/VoiceNetProvider.jsx`.
  - Surfaced transport mode status in `src/components/layout/ContextPanel.jsx` to make degraded/fallback state explicit.

- **Whisper/Direct Voice Routing – TODO**
  - Added explicit implementation marker in `src/components/voice/VoiceNetProvider.jsx`: `TODO(voice-whisper): Add scoped whisper/direct routing lanes with explicit recipient authorization.`

- **Voice Scope/Access Policy – OK**
  - Verified enforcement entry point in `src/components/utils/voiceAccessPolicy.jsx`.
  - Confirmed join checks are applied in `src/components/voice/VoiceNetProvider.jsx`.

- **Text Comms Scope/Access – OK**
  - Verified canonical policy surface exists in `src/components/utils/commsAccessPolicy.jsx`.
  - Confirmed targeted backend/member-function tests already pass (`tests/comms/*.test.ts` and `tests/nexus-os/serviceHardening.test.ts`).

## UI/UX and Shell

- **Duplicate Overlay/Dock Contradiction – FIXED**
  - Removed forced auto-open behavior for comms dock and context panel from `src/components/providers/ShellUIContext.jsx`.
  - Added safe state normalization + persistence helpers so shell state honors user/session preferences.
  - Added tests covering malformed/legacy shell state fallback in `tests/nexus-os/shellUiState.test.ts`.

- **Shell Persistence and Stability – FIXED**
  - Added `normalizeShellUIState` and `readShellUIState` in `src/components/providers/ShellUIContext.jsx`.
  - Persist writes are normalized to avoid legacy malformed values causing layout regressions.

- **Industrial Theme Consistency – OK**
  - Verified global foundation wiring remains active via `src/main.jsx` and `src/nexus-os/ui/theme/nexus-foundation.css`.
  - Confirmed shell texture/motion layer remains centralized in `src/nexus-os/ui/theme/nexus-shell.css`.

- **Reduced Motion Coverage – OK**
  - Verified reduced motion clamps in `src/globals.css`.
  - Verified shell/theme animation suppression under `prefers-reduced-motion` in `src/nexus-os/ui/theme/nexus-foundation.css` and `src/nexus-os/ui/theme/nexus-shell.css`.

## Operations and Lifecycle

- **Operation Service Guardrails – OK**
  - Verified operation/RSVP/cross-org/decision and audit hardening tests pass in `tests/nexus-os/serviceHardening.test.ts`.

- **Operation Focus Wiring – OK**
  - Reviewed `src/nexus-os/ui/ops/OperationFocusApp.tsx` for stage/posture, roster, narrative, coalition, and decision surfaces.

## Legacy Purge / Deepscan Cleanup

- **Obsolete Duplicate Artifacts – FIXED**
  - Removed unused legacy auth context: `src/lib/AuthContext.jsx`.
  - Removed unused duplicate boot overlay: `src/components/common/BootOverlay.jsx`.
  - Removed unused duplicate scroll guard utility: `src/components/utils/scrollGuards.jsx`.
  - Removed unused duplicate app entry HTML artifact: `src/index.html`.

## Validation

- **Build – OK**
  - `npm run build` passed.

- **Unit Tests – OK**
  - `npm run test:unit` passed.

- **Visual Smoke – OK**
  - `npx playwright test tests/visual.spec.js` passed.

---

## Pass 2 (Deep Loop Continuation)

### Communications

- **Text Channel Scope Enforcement – FIXED**
  - Added centralized full-channel policy in `src/components/utils/commsAccessPolicy.jsx` via `canAccessCommsChannel`.
  - Enforced focused, DM participant, role-tag, and min-rank checks in one path instead of fragmented UI checks.
  - Added tests in `tests/comms/commsAccessPolicy.test.ts`.

- **Text Comms Unauthorized Fetch Guard – FIXED**
  - Updated `src/components/comms/TextCommsDock.jsx` to block message fetch/subscribe when selected channel access is no longer valid.
  - Updated initial channel selection logic to pick the first accessible channel and avoid binding users to inaccessible channels.
  - Added fallback channel reselection when permissions/context change.

- **Threaded Op Comments – FIXED**
  - Added parent-linked reply support to op thread data model (`parentCommentId`) in `src/nexus-os/schemas/opSchemas.ts`.
  - Added parent validation and reply listing helper in `src/nexus-os/services/opThreadService.ts`.
  - Added coverage for parent reply behavior in `tests/nexus-os/opThreadService.test.ts`.

- **Op Thread Nested UX Completion – TODO**
  - Added explicit marker in `src/nexus-os/services/opThreadService.ts`: `TODO(threading-ui): Add dedicated thread panel + reply notifications for op comments beyond flat timeline view.`

- **Immersive Notification UX (Comms Actions) – FIXED**
  - Replaced browser `confirm/alert` flows in `src/components/comms/TextCommsDock.jsx` for delete/pin actions with in-app notification feedback.

### Operations Lifecycle

- **Plan-Phase Edit Guardrails – FIXED**
  - Added planning-stage lock behavior in `src/nexus-os/ui/ops/OperationFocusApp.tsx` to disable planning artifact and policy editor mutations outside `PLANNING`.
  - Added status-specific lock banner in the PLAN tab.

- **Stage-Policy Granularity – TODO**
  - Added explicit marker in `src/nexus-os/ui/ops/OperationFocusApp.tsx`: `TODO(stage-policy): Split locks per stage with role-aware overrides (PLANNING/ACTIVE/WRAPPING) for finer control.`

- **RSVP/Crew Audit Trail – FIXED**
  - Wired RSVP service mutations into operation event audit stream in `src/nexus-os/services/rsvpService.ts`.
  - Logged major actions: `RSVP_SUBMITTED`, `RSVP_UPDATED`, `RSVP_ASSET_SLOT_ADDED`, `RSVP_CREW_SEAT_REQUESTED`, `RSVP_CREW_SEAT_JOINED`.
  - Added coverage in `tests/nexus-os/serviceHardening.test.ts`.

- **Asset Withdrawal Cascade – TODO**
  - Added explicit marker in `src/nexus-os/services/rsvpService.ts`: `TODO(rsvp-withdrawal): Add explicit withdrawal flow that cascades cleanup for linked asset slots and seat assignments.`

### Validation (Pass 2)

- **Build – OK**
  - `npm run build` passed after this pass.

- **Unit Tests – OK**
  - `npm run test:unit` passed (`35` files, `182` tests).

- **Visual Smoke – OK**
  - `npx playwright test tests/visual.spec.js` passed (`6` visual tests).

---

## Pass 4 (Tactical Map Wargame Immersion + Structure Expansion)

### Tactical Map Layout and Interactivity

- **Three-System Tactical Basemap – FIXED**
  - Rebuilt tactical board topology in `src/nexus-os/ui/map/mapBoard.ts` with three operational systems (`Stanton`, `Pyro`, `Nyx`), canonical body clusters, and jump/orbital routes.
  - Added system-level and body-level edge graph for command navigation context.

- **Stations / Lagrange / OM Coverage – FIXED**
  - Added station nodes and route links in `src/nexus-os/ui/map/mapBoard.ts`.
  - Added generated `L1-L5` Lagrange nodes and `OM-1..OM-6` orbital marker nodes around primary bodies.
  - Added runtime map controls in `src/nexus-os/ui/map/TacticalMapPanel.tsx` to toggle Stations, Lagrange, and OM visibility for command decluttering.

- **Node Category Rendering – FIXED**
  - Added category-aware node schema fields (`category`, `importance`) in `src/nexus-os/schemas/mapSchemas.ts`.
  - Updated tactical rendering in `src/nexus-os/ui/map/TacticalMapPanel.tsx` to style systems/planets/moons/stations/lagrange/OM with differentiated visual signatures.

### Command Inference and AI Integration

- **Deterministic Command Estimate Layer – FIXED**
  - Added `src/nexus-os/services/mapInferenceService.ts` to compute command risk/confidence/load and action recommendations from scoped control/comms/intel evidence.
  - Added command-estimate UI surface in `src/nexus-os/ui/map/TacticalMapPanel.tsx` with evidence counts and top recommendations.

- **Scoped AI Estimate Hook – FIXED**
  - Added map AI prompt builder (`buildMapAiPrompt`) and integrated `AI Context Sync` action in `src/nexus-os/ui/map/TacticalMapPanel.tsx`.
  - Wired AI request via `commsAssistant` using operation-scoped context and explicit no-fabrication UI labeling (`AI Estimate (Scoped Records Only)`).

### Asset Catalog and Design System Inputs

- **Industrial/Military Placeholder Asset Catalog – FIXED**
  - Added comprehensive map placeholder asset specification in `src/nexus-os/specs/map-placeholder-asset-catalog.md`.
  - Catalog includes system/bodies, comms topology, tactical markers, logistics symbols, and HUD command overlays to support art pipeline lock-in.

### Validation (Pass 4)

- **Typecheck – OK**
  - `npm run typecheck` passed.

- **Build – OK**
  - `npm run build` passed.

- **Lint – OK**
  - `npm run lint` passed.

- **Unit Tests – OK**
  - `npm run test:unit` passed (`38` files, `191` tests).
  - Added and passed:
    - `tests/nexus-os/mapBoardLayout.test.ts`
    - `tests/nexus-os/mapInferenceService.test.ts`

- **Visual Smoke – OK**
  - `npx playwright test tests/visual.spec.js` passed (`6` visual tests).

- **AccessGate/Onboarding Guard Flow – OK**
  - Preview smoke confirmed `/AccessGate` renders authorization screen.
  - Unauthenticated navigation to `/Onboarding` redirects to `/AccessGate` as expected.
  - Unauthenticated navigation to `/Hub` redirects to `/AccessGate` as expected.

---

## Pass 3 (Tactical Map Deep Audit)

### Tactical Map + Comms Overlay

- **Tactical Map Comms Layer Integration – FIXED**
  - Replaced stub-only comms hook in `src/nexus-os/ui/map/TacticalMapPanel.tsx` with live topology pull via `updateCommsConsole` (`get_comms_topology_snapshot`).
  - Added hardened payload normalization + map adapter service in `src/nexus-os/services/mapCommsOverlayService.ts`.
  - Added scoped filtering so focused operation map views show only authorized operation comms nets/callouts.

- **Comms Overlay Rendering + Utility Controls – FIXED**
  - Added on-map net nodes, bridge link lines, and priority callout glyphs in `src/nexus-os/ui/map/TacticalMapPanel.tsx`.
  - Added comms utility controls (priority floor and link visibility toggle) in the map side rail.
  - Added comms degraded-mode status handling (`LOADING`/`ERROR`/`STALE`) with explicit operator-facing copy.

- **Comms Topology Edge Behavior – FIXED**
  - Added callout stale-age handling and deterministic fallback node assignment in `src/nexus-os/services/mapCommsOverlayService.ts`.
  - Added lane-to-net mapping to preserve callout visibility for lane-tagged events without explicit `net_id`.

- **Logistics Overlay Live Feed – TODO**
  - Added explicit marker in `src/nexus-os/ui/map/TacticalMapPanel.tsx`: `TODO(map-logistics-live): Replace dev stub with scoped corridor/feed adapter once logistics movement events are promoted to NexusOS services.`

### Validation (Pass 3)

- **Build – OK**
  - `npm run build` passed.

- **Typecheck – OK**
  - `npm run typecheck` passed.

- **Lint – OK**
  - `npm run lint` passed.

- **Unit Tests – OK**
  - `npm run test:unit` passed (`36` files, `186` tests).
  - Added and passed targeted map comms tests in `tests/nexus-os/mapCommsOverlayService.test.ts`.

- **Visual Smoke – OK**
  - `npx playwright test tests/visual.spec.js` passed (`6` visual tests).

---

## Pass 5 (Outstanding TODO Closure)

### Operations + Comms

- **Op Thread Nested UX Completion – FIXED**
  - Added thread summaries, unread notifications, and read markers in `src/nexus-os/services/opThreadService.ts`.
  - Added dedicated thread inbox + focused thread flow in `src/nexus-os/ui/ops/OperationFocusApp.tsx`.

- **Stage-Policy Granularity – FIXED**
  - Added explicit stage/role policy engine in `src/nexus-os/ui/ops/stagePolicy.ts`.
  - Applied policy-driven locks for plan/requirements/roster/comms surfaces in `src/nexus-os/ui/ops/OperationFocusApp.tsx`.

- **Asset Withdrawal Cascade – FIXED**
  - Added `withdrawRSVPEntry` cascade flow in `src/nexus-os/services/rsvpService.ts`.
  - Added withdrawal UI action in `src/nexus-os/ui/ops/OperationFocusApp.tsx`.

### Tactical Map

- **Logistics Overlay Live Feed – FIXED**
  - Replaced logistics stub with scoped adapter in `src/nexus-os/services/mapLogisticsOverlayService.ts`.
  - Wired logistics lane rendering + diagnostics into `src/nexus-os/ui/map/TacticalMapPanel.tsx`.

### Validation (Pass 5)

- **Typecheck – OK**
  - `npm run typecheck` passed.

- **Lint – OK**
  - `npm run lint` passed.

- **Unit Tests – OK**
  - `npm run test:unit` passed (`42` files, `206` tests).

- **Build – OK**
  - `npm run build` passed.

---

## Pass 6 (Service Hardening Continuation)

### Reporting

- **Report Schema Safety Validation – FIXED**
  - Added strict markdown/link safety checks in `src/nexus-os/services/reportService.ts` for narrative, evidence, and title text.

- **Report Scope Permissions + Delete Authority – FIXED**
  - Enforced OP-scope generation access checks in `src/nexus-os/services/reportService.ts`.
  - Enforced role/ownership checks for report deletion via `deleteReport(id, actorId)`.
  - Updated caller in `src/nexus-os/ui/reports/ReportsFocusApp.tsx`.

- **Reproducible Input Snapshot Persistence – FIXED**
  - Added snapshot persistence and retrieval (`getReportInputSnapshot`, `listReportInputSnapshots`) in `src/nexus-os/services/reportService.ts`.

### Fit / Force Design

- **Fit Attachment Permission Enforcement – FIXED**
  - Added ownership/command checks for roster-linked fit attachment in `src/nexus-os/services/fitProfileService.ts`.

- **Fit Attachment Citation Metadata – FIXED**
  - Added attachment citation payloads in `src/nexus-os/services/fitProfileService.ts` for downstream report linkage.

- **Force Coverage Trace Diagnostics – FIXED**
  - Added `sourceRefs` and `ruleTrace` metadata to coverage rows in `src/nexus-os/schemas/fitForceSchemas.ts` and `src/nexus-os/services/forceDesignService.ts`.
  - Added deterministic large-roster diagnostic gap for traceability in `src/nexus-os/services/forceDesignService.ts`.

### Validation (Pass 6)

- **Typecheck – OK**
  - `npm run typecheck` passed.

- **Unit Tests – OK**
  - `npm run test:unit` passed (`42` files, `210` tests).

- **Lint – OK**
  - `npm run lint` passed.

- **Build – OK**
  - `npm run build` passed.

---

## Pass 7 (Final TODO / In-Progress Closure)

### Report Generators

- **AAR Generator Stability – FIXED**
  - Removed duplicate `citations` declaration in `src/nexus-os/services/reportGenerators/generateAAR.ts`, resolving transform failure during unit test/build pipeline.

### Data Adapter Hardening

- **Reference Data External Adapter Path – FIXED**
  - Replaced adapter TODO scaffold with concrete ingestion framework in `src/nexus-os/services/referenceDataService.ts`.
  - Added adapter registration/refresh APIs, provenance normalization/validation, ingestion health status, and deterministic dedupe by `id + gameVersion`.

- **Market Intel External Adapter Path – FIXED**
  - Replaced adapter TODO scaffold with concrete ingestion framework in `src/nexus-os/services/marketIntelService.ts`.
  - Added adapter registration/refresh APIs, per-observation metadata preservation (`gameVersion`, `importedAt`, `adapterId`), and ingestion health status.

### Core Policy Hook Closure

- **CQB TTL Override Policy – FIXED**
  - Added per-event TTL policy override support in `src/nexus-os/services/cqbTTLService.ts` for force-stale and TTL override behavior.

- **Command Authority Policy Graph Hook – FIXED**
  - Added pluggable authority validators in `src/nexus-os/services/commandIntentService.ts` to support role/policy-tag governance without hardcoding org rules.

- **Channel Access Resolver Hook – FIXED**
  - Added pluggable channel access resolver in `src/nexus-os/services/channelContextService.ts` for runtime membership/authority filtering.

### Validation (Pass 7)

- **Typecheck – OK**
  - `npm run typecheck` passed.

- **Unit Tests – OK**
  - `npm run test:unit` passed (`44` files, `217` tests).
  - Added and passed:
    - `tests/nexus-os/referenceAndMarketAdapters.test.ts`
    - `tests/nexus-os/corePolicyHooks.test.ts`

- **Lint – OK**
  - `npm run lint` passed.

- **Build – OK**
  - `npm run build` passed.

---

## Pass 8 (CQB Accessibility + Hands-Free Control)

### CQB UX / Control Surface

- **Hands-Free CQB Command Layer – FIXED**
  - Added `src/nexus-os/ui/cqb/CqbHandsFreeControl.tsx` to support press-and-hold PTT command capture with speech parsing and direct CQB macro emission.
  - Added focused-operation voice-discipline enforcement in the hands-free layer (PTT lock when op posture is focused and active).
  - Added radio-log write-through and high-priority STATUS draft refresh for background comms-agent synchronization.

- **Quick Radial Macro Access – FIXED**
  - Added `src/nexus-os/ui/cqb/CqbQuickRadialMenu.tsx` with prioritized one-tap CQB macros and keyboard shortcuts (`Alt+1..Alt+8`).

- **Deterministic CQB Voice Parser – FIXED**
  - Added `src/nexus-os/services/cqbVoiceCommandService.ts` to map spoken brevity phrases to canonical CQB event types and payloads.
  - Added payload extraction for direction/lane/destination/contact-count and deterministic fallback suggestions.

- **CQB Console Layout Rework – FIXED**
  - Updated `src/nexus-os/ui/cqb/CqbCommandConsole.tsx` to prioritize hands-free/radial control at the top of the command workflow.
  - Unified command dispatch path between order strip, radial menu, macro pad, and voice parser events.

### Validation (Pass 8)

- **Typecheck – OK**
  - `npm run typecheck` passed.

- **Unit Tests – OK**
  - `npm run test:unit` passed (`45` files, `220` tests).
  - Added and passed `tests/nexus-os/cqbVoiceCommandService.test.ts`.

- **Lint – OK**
  - `npm run lint` passed.

- **Build – OK**
  - `npm run build` passed.
