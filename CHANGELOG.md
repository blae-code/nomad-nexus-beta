# Changelog

## 2026-02-11 - CQB Hands-Free + Radial Access Pass

- Reworked CQB command ergonomics for faster, lower-friction execution:
  - Added `src/nexus-os/ui/cqb/CqbHandsFreeControl.tsx` with hold-to-PTT command capture, speech parsing, and direct CQB macro dispatch.
  - Added focused-op voice discipline enforcement hook (auto-PTT discipline when posture is focused/active).
  - Added background comms-agent sync path for high-priority CQB voice events (radio-log append + STATUS draft refresh).
- Added quick-access radial control layer:
  - Added `src/nexus-os/ui/cqb/CqbQuickRadialMenu.tsx` for single-action macro dispatch with Alt+1..Alt+8 shortcuts.
- Added deterministic CQB voice parser service:
  - Added `src/nexus-os/services/cqbVoiceCommandService.ts` to map spoken brevity to canonical event types and payloads, including direction/count extraction and fallback suggestions.
  - Exported parser via `src/nexus-os/services/index.ts`.
- Integrated new hands-free/radial layer into CQB console layout:
  - Updated `src/nexus-os/ui/cqb/CqbCommandConsole.tsx` to include `CqbHandsFreeControl` and route all macro dispatches through a unified dispatch function.
  - Updated `src/nexus-os/ui/cqb/index.ts` exports.
- Added test coverage:
  - `tests/nexus-os/cqbVoiceCommandService.test.ts`.
- Validation:
  - `npm run typecheck` passed.
  - `npm run test:unit` passed (`45` files, `220` tests).
  - `npm run lint` passed.
  - `npm run build` passed.

## 2026-02-11 - Final TODO/In-Progress Closure Pass

- Closed remaining in-progress issues from the prior hardening cycle:
  - Fixed report generator syntax regression in `src/nexus-os/services/reportGenerators/generateAAR.ts` (duplicate `citations` field).
- Implemented adapter-driven ingestion for reference data and market intel:
  - Reworked `src/nexus-os/services/referenceDataService.ts` with adapter registry, refresh pipeline, provenance enforcement, ingestion health, and reset controls.
  - Reworked `src/nexus-os/services/marketIntelService.ts` with adapter registry, refresh pipeline, observation metadata preservation (`source` + `gameVersion` + `importedAt`), ingestion health, and reset controls.
- Closed remaining core service TODO scaffolds by adding concrete policy hooks:
  - `src/nexus-os/services/cqbTTLService.ts`: per-event TTL override policy resolver.
  - `src/nexus-os/services/commandIntentService.ts`: pluggable command authority validators + scoped policy evaluation.
  - `src/nexus-os/services/channelContextService.ts`: pluggable channel access resolver for membership/authority filtering.
- Added unit coverage for new ingestion and policy hooks:
  - `tests/nexus-os/referenceAndMarketAdapters.test.ts`
  - `tests/nexus-os/corePolicyHooks.test.ts`
- Validation:
  - `npm run typecheck` passed.
  - `npm run test:unit` passed (`44` files, `217` tests).
  - `npm run lint` passed.
  - `npm run build` passed.

## 2026-02-11 - Report + Fit/Force Hardening Pass

- Hardened report safety/authority/persistence in `src/nexus-os/services/reportService.ts`:
  - Added markdown/link safety validation checks for narrative/evidence/title inputs (`validateReport`).
  - Added OP-scope generation permission enforcement.
  - Added delete authorization checks (`deleteReport(id, actorId)`).
  - Added reproducible input snapshot persistence (`getReportInputSnapshot`, `listReportInputSnapshots`).
- Updated report UI deletion path to pass actor context:
  - `src/nexus-os/ui/reports/ReportsFocusApp.tsx`.
- Hardened fit attachment permissions and citation metadata in `src/nexus-os/services/fitProfileService.ts`:
  - Added slot ownership/command permission check for `attachFitProfileToAssetSlot` (now requires `actorId`).
  - Added attachment citation payloads for downstream reporting linkage.
- Wired actor-aware fit attachment call in:
  - `src/nexus-os/ui/ops/OperationFocusApp.tsx`.
- Added coverage-row provenance and deterministic rule trace diagnostics in force analysis:
  - Extended `CoverageRow` schema with `sourceRefs` and `ruleTrace` in `src/nexus-os/schemas/fitForceSchemas.ts`.
  - Populated row trace/provenance and large-roster diagnostics in `src/nexus-os/services/forceDesignService.ts`.
- Validation coverage updates:
  - Extended `tests/nexus-os/serviceHardening.test.ts` for report permission/deletion/snapshot safety, fit-attachment authority, and force-trace diagnostics.
- Validation:
  - `npm run typecheck` passed.
  - `npm run test:unit` passed (`42` files, `210` tests).
  - `npm run lint` passed.
  - `npm run build` passed.

## 2026-02-11 - Audit Loop TODO Closure Pass (Stage Policy, Threading, RSVP Withdrawal, Map Logistics)

- Closed remaining in-code TODOs from the prior comprehensive audit pass by implementing the missing features directly.
- Completed stage-aware, role-aware Operation Focus locking:
  - Added `src/nexus-os/ui/ops/stagePolicy.ts` with explicit PLANNING/ACTIVE/WRAPPING/ARCHIVED policy derivation.
  - Wired policy into `src/nexus-os/ui/ops/OperationFocusApp.tsx` for lifecycle controls and section edit locks (plan/requirements/roster/comms).
  - Added `tests/nexus-os/stagePolicy.test.ts`.
- Completed threaded op-comment inbox and unread handling:
  - Extended `src/nexus-os/services/opThreadService.ts` with thread summaries, unread notifications, and read-cursor updates.
  - Reworked COMMS tab thread UX in `src/nexus-os/ui/ops/OperationFocusApp.tsx` with a dedicated thread inbox, unread badges, focused thread view, and read-mark behavior.
  - Expanded `tests/nexus-os/opThreadService.test.ts` coverage.
- Completed explicit RSVP withdrawal cascade:
  - Added `withdrawRSVPEntry` to `src/nexus-os/services/rsvpService.ts` with asset-slot and seat-assignment cleanup plus audit event emission.
  - Added Operation Focus UI action to withdraw active RSVP in `src/nexus-os/ui/ops/OperationFocusApp.tsx`.
  - Expanded `tests/nexus-os/serviceHardening.test.ts` with cascade/seat-exit cases.
- Completed live logistics overlay adapter for Tactical Map:
  - Added `src/nexus-os/services/mapLogisticsOverlayService.ts` to build scoped logistics lanes from operation events and route hypotheses.
  - Replaced logistics stub path in `src/nexus-os/ui/map/TacticalMapPanel.tsx`, added tactical lane rendering and logistics diagnostics panel.
  - Added `tests/nexus-os/mapLogisticsOverlayService.test.ts`.
- Validation:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm run test:unit` passed (`42` files, `206` tests).
  - `npm run build` passed.

## 2026-02-11 - Voice Comms 20-Feature Control-Plane Expansion

- Added a new full-scope implementation tracker:
  - `src/nexus-os/discovery/VOICE_COMMS_20_FEATURE_IMPLEMENTATION_TODO.md`
- Expanded comms backend command surface in `functions/updateCommsConsole.ts`:
  - Added discipline-mode actions and request-to-speak lifecycle (`set_voice_discipline_mode`, `request_to_speak`, `resolve_speak_request`, `get_voice_discipline_state`).
  - Added voice telemetry persistence and query (`record_voice_telemetry`, `list_voice_telemetry`).
  - Added output/submix profile actions (`set_voice_output_profile`, `set_voice_submix_profile`).
  - Added op-bound sync action (`sync_op_voice_text_presence`).
  - Added radio log + clip + AI draft actions (`append_radio_log_entry`, `list_radio_log`, `capture_voice_clip`, `list_voice_clips`, `generate_voice_structured_draft`).
  - Added hotkey/loadout persistence actions (`set_voice_hotkey_profile`, `set_voice_loadout`).
  - Added command whisper escalation + receipts (`send_command_whisper`, `acknowledge_command_whisper`, `list_command_whispers`).
  - Added secure mode policy action (`set_voice_secure_mode`).
  - Added voice-thread linking actions (`link_voice_thread`, `list_voice_thread_links`).
  - Added command bus actions (`publish_command_bus_action`, `list_command_bus_actions`).
  - Expanded topology snapshot output with telemetry, discipline, request queue, and command-bus state.
- Hardened token policy metadata in `functions/mintVoiceToken.ts`:
  - Added discipline/secure/whisper/submix policy metadata in token.
  - Added publish grant gating tied to discipline mode and request-to-speak approval.
- Replaced and expanded voice transport/control-plane runtime:
  - `src/components/voice/transport/LiveKitTransport.jsx`
    - Added control data-channel publish/receive.
    - Added telemetry sampling events.
    - Added output-device routing and per-participant gain hooks.
    - Added submix routing state hooks.
  - `src/components/voice/transport/MockVoiceTransport.jsx`
    - Added control packet events, telemetry emit path, output/gain/normalization state.
  - `src/components/services/voiceService.jsx`
    - Added transmit-authority claim/release API, command-bus snapshot cache, and expanded session topology metadata.
  - `src/components/voice/VoiceNetProvider.jsx`
    - Added multi-net monitor list + explicit TX bus.
    - Added whisper press/hold control packets.
    - Added discipline enforcement and request-to-speak flows.
    - Added output/gain/normalization/submix control APIs.
    - Added command-bus publication, secure mode wrappers, radio-log/clip/AI wrappers, and op sync.
    - Added presence synchronization for monitoring/transmitting states.
- Expanded voice command UI surfaces:
  - `src/components/voice/VoiceControlPanel/ActiveNets.jsx`
    - Added monitor-only and TX-bus controls.
  - `src/components/voice/VoiceControlPanel/VoiceControlsSection.jsx`
    - Added discipline selector, whisper hold control, output routing, normalization, submix TX picker, and RTS/override actions.
  - `src/components/voice/VoiceControlPanel/NetRoster.jsx`
    - Added TX authority and transmitting/monitoring badges.
  - `src/components/voice/VoiceControlPanel/CommsDiscipline.jsx`
    - Added live discipline + pending RTS operational hints.
  - `src/components/comms/OperationVoiceWorkbench.jsx`
    - Added discipline workflow panel, telemetry feed, radio log search, clip capture, AI draft generation, secure mode toggles, command whisper dispatch, and voice-thread linking affordance.
- Added tests for the expanded surface:
  - `tests/comms/updateCommsConsole.voiceAdvanced.test.ts`
  - `tests/comms/voiceServiceAuthority.test.ts`
- Validation:
  - `npm run test:unit` passed (`40` test files, `197` tests).
  - `npm run build` passed.
  - `npm run typecheck` passed.
  - `npx playwright test tests/auth-routing-smoke.spec.js` passed (`3` smoke tests).

## 2026-02-11 - Tactical Map Command Immersion Expansion

- Implemented a full tactical-map layout baseline for three operational systems:
  - Expanded `src/nexus-os/ui/map/mapBoard.ts` to include `Stanton`, `Pyro`, and `Nyx` with celestial-body clusters.
  - Added primary planets and moon bodies, inter-system jump routes, and orbital/system routing edges.
  - Added station nodes and parent-body route links for command-level navigation context.
  - Added generated Lagrange point nodes (`L1-L5`) and orbital marker nodes (`OM-1..OM-6`) for primary bodies.
- Improved map node schema expressiveness:
  - Extended `src/nexus-os/schemas/mapSchemas.ts` with optional node `category` and `importance` fields for differentiated rendering/interaction.
- Upgraded TacticalMapPanel interactivity and immersion:
  - Added station/Lagrange/OM visibility controls in `src/nexus-os/ui/map/TacticalMapPanel.tsx`.
  - Added node-category styling so systems, planets, moons, stations, Lagrange points, and OM markers render with distinct tactical signatures.
  - Added map-side command estimate surface fed by deterministic inference.
- Added map inference + AI-assist integration:
  - Added `src/nexus-os/services/mapInferenceService.ts` for command-risk/confidence/load inference from scoped control/comms/intel evidence.
  - Added AI prompt builder (`buildMapAiPrompt`) and panel action to request scoped AI context estimates via `commsAssistant`.
  - Added explicit scoped labeling in UI (`AI Estimate (Scoped Records Only)`), preserving no-fabrication doctrine.
- Added placeholder asset catalog for industrial/military iconography:
  - Added `src/nexus-os/specs/map-placeholder-asset-catalog.md` with comprehensive placeholder asset IDs across systems, comms, tactical, logistics, and HUD kits.
- Added automated tests for map layout + inference:
  - Added `tests/nexus-os/mapBoardLayout.test.ts` for system/body/station/lagrange/OM coverage and location resolution.
  - Added `tests/nexus-os/mapInferenceService.test.ts` for inference metrics and deterministic AI prompt generation.
  - Existing and new map comms overlay coverage remains in `tests/nexus-os/mapCommsOverlayService.test.ts`.

## 2026-02-10 - Tactical Map Comms Layer Hardening Pass

- Replaced NexusOS tactical map comms stub wiring with live topology ingestion:
  - Added `src/nexus-os/services/mapCommsOverlayService.ts` to normalize `updateCommsConsole` topology payloads and project them into map-safe overlays.
  - Added operation-aware scope filtering so focused map views only render op-authorized comms nets/callouts.
  - Added stale callout handling (age-based) and net quality scoring for degraded awareness.
- Upgraded `src/nexus-os/ui/map/TacticalMapPanel.tsx` comms layer:
  - Added refresh loop for comms topology snapshots with degraded-mode error handling.
  - Added on-map comms rendering (net nodes, bridge links, callout markers) aligned to tactical nodes.
  - Added comms utility controls (priority floor, link visibility) and a dedicated Comms Layer status panel.
  - Added `TODO(map-logistics-live)` marker for replacing logistics overlay stubs with live scoped movement feeds.
- Extended test coverage:
  - Added `tests/nexus-os/mapCommsOverlayService.test.ts` for payload normalization, scope enforcement, lane mapping, stale handling, and deterministic fallback behavior.

## 2026-02-10 - Comprehensive Audit Loop Hardening Pass

- Fixed shell state contradictions that caused duplicate overlay behavior:
  - `src/components/providers/ShellUIContext.jsx` now respects persisted panel/dock preferences instead of force-enabling both on load.
  - Added state normalization/read helpers to prevent malformed legacy values from destabilizing the shell.
  - Added coverage in `tests/nexus-os/shellUiState.test.ts`.
- Hardened voice push-to-talk behavior to match hold-to-transmit expectations:
  - `src/components/voice/VoiceNetProvider.jsx` now provides `startPTT`/`stopPTT` and Space key hold handling with blur-safe stop behavior.
  - `src/components/voice/VoiceControlPanel/VoiceControlsSection.jsx` now uses press-and-hold interactions for PTT.
  - `src/components/layout/ContextPanel.jsx` PTT control now uses hold semantics and shows active transport mode.
  - Added `localUserId` exposure in voice context so local participant indicators can resolve correctly.
- Improved degraded-mode transparency:
  - Added explicit transport mode (`LiveKit` vs `Mock Fallback`) visibility in `ContextPanel` voice telemetry.
- Purged contradictory antiquated runtime artifacts confirmed unused by the active app:
  - Removed `src/lib/AuthContext.jsx`.
  - Removed `src/components/common/BootOverlay.jsx`.
  - Removed `src/components/utils/scrollGuards.jsx`.
  - Removed `src/index.html`.
- Added formal chronological audit output:
  - `src/nexus-os/discovery/COMPREHENSIVE_AUDIT_LOOP_LOG_2026-02-10.md`

## 2026-02-10 - Comprehensive Audit Loop Hardening Pass (Continuation)

- Strengthened comms scope enforcement:
  - Added unified channel access policy in `src/components/utils/commsAccessPolicy.jsx` (`canAccessCommsChannel`) with focused/DM participant/rank/role checks.
  - Added tests in `tests/comms/commsAccessPolicy.test.ts`.
  - Updated `src/components/comms/TextCommsDock.jsx` to avoid selecting inaccessible channels and to block unauthorized message loading/subscription.
- Improved immersive comms interactions:
  - Replaced browser-native confirm/alert flows for delete/pin actions in `src/components/comms/TextCommsDock.jsx` with in-app notifications.
- Expanded operation thread capabilities:
  - Added parent-linked reply support (`parentCommentId`) in `src/nexus-os/schemas/opSchemas.ts` and `src/nexus-os/services/opThreadService.ts`.
  - Added reply validation tests in `tests/nexus-os/opThreadService.test.ts`.
  - Added `TODO(threading-ui)` marker for dedicated nested thread panel/notifications in op-thread UX.
- Hardened operation lifecycle behavior:
  - Added planning-stage edit locks in `src/nexus-os/ui/ops/OperationFocusApp.tsx` so planning artifacts/policy edits are disabled outside `PLANNING`.
  - Added `TODO(stage-policy)` marker for role-aware stage lock granularity.
- Extended operation audit trail:
  - Wired RSVP and crew seat actions to operation events in `src/nexus-os/services/rsvpService.ts`.
  - Added test coverage in `tests/nexus-os/serviceHardening.test.ts` for RSVP audit event emission.
  - Added `TODO(rsvp-withdrawal)` marker for cascade cleanup on RSVP withdrawal.

## 2026-02-10 - Design Lock-In Foundation (App-Wide)

- Established a shared Redscar design foundation stylesheet in `src/nexus-os/ui/theme/nexus-foundation.css`:
  - Added centralized color tokens and shell surfaces for consistent industrial sci-fi styling.
  - Added reusable immersive/fullscreen treatment (`.nexus-immersive-screen`, `.nexus-immersive-panel`).
  - Added standard shell/page layers (`.nexus-shell-standard`, `.nexus-page-main`) for non-Hub routes.
  - Added shared typography/label/control affordances (`.nexus-section-title`, `.nexus-label`, `.nexus-control-*`).
- Wired the new foundation globally in `src/main.jsx` so styling applies across the full application runtime.
- Updated shell wrappers in `src/Layout.jsx` to apply foundation classes to fullscreen and standard route layouts.
- Refactored authentication-first experience pages to use shared foundation patterns:
  - `src/pages/AccessGate.jsx`
  - `src/pages/Onboarding.jsx`
  - Removed page-local duplicated scanline/glow style blocks in favor of shared classes.
- Normalized core UI controls for consistent look/interaction across modules:
  - `src/components/ui/button.jsx`
  - `src/components/ui/input.jsx`
  - `src/components/ui/textarea.jsx`
  - `src/components/ui/checkbox.jsx`

## 2026-02-10 - NexusOS Final Polish Pass

- Polished NexusOS shell motion and chrome in `src/nexus-os/preview/NexusOSPreviewPage.jsx` and `src/nexus-os/ui/theme/nexus-shell.css`:
  - Added an industrial tactical grid overlay layer (`.nexus-shell-grid`) with subtle drift.
  - Improved focus-app transition quality with smoother easing and reduced-motion fallback.
  - Added reduced-motion accessibility handling for shell sweep/grid/alert pulse effects.
  - Added compact hotkey hint chips for command deck and suspend actions.
- Improved command feedback UX:
  - `commandFeedback` now auto-clears after 4.2s to avoid stale status clutter.
  - Feedback surface now uses `aria-live="polite"` for assistive announcement.
- Added explicit operational posture chip:
  - Shows `Care-First Active` when online and `Rescue Priority` when degraded.
- Removed stale local backup debris not part of runtime or source of truth:
  - `.demo-purge-backups/`

## 2026-02-10 - Deep Schema Sweep (Contradiction Purge)

- Removed remaining empty legacy root directories that were no longer part of runtime:
  - `components/`
  - `pages/`
  - `lib/`
- Removed contradictory/unused duplicate artifacts:
  - `src/lib/PageNotFound.jsx` (duplicate not-found implementation superseded by `src/pages/PageNotFound.jsx`)
  - `src/components/voice/VoiceCommsDock.jsx` (unused legacy dock implementation)
- Fixed stale route hardcodes that still used pre-NexusOS URL patterns:
  - `src/components/hooks/useAlertSimulator.jsx` now navigates to `/CommsConsole`
  - `src/components/hooks/useNotificationActions.jsx` now navigates to `/Events`
- Updated tooling configs to target active code layout instead of deleted root scaffolding:
  - `eslint.config.js` now scopes linting to active app shell entry files (`src/App.jsx`, `src/Layout.jsx`, `src/pages.config.js`) instead of deleted root globs.
  - `jsconfig.json` now includes only active toolchain config files instead of deleted root globs, preserving current no-regression typecheck behavior.
- Updated visual regression route coverage to canonical route aliases:
  - `tests/visual.spec.js` now uses `/war-academy` and `/intel-nexus`.
- Regenerated and cleaned Playwright visual baselines:
  - Added `tests/visual.spec.js-snapshots/war-academy-chromium-win32.png`
  - Added `tests/visual.spec.js-snapshots/intel-nexus-chromium-win32.png`
  - Removed obsolete `academy` and `intelligence` snapshot artifacts.

## 2026-02-10 - NexusOS Audit and Legacy Cleanup

- Removed legacy root shell artifacts that were no longer used by the active `src` runtime:
  - `Layout.js`
  - `pages.config.js`
  - root-level `components/`, `pages/`, and `lib/` legacy files
- Removed unused `*.md.jsx` verification/manifests from `src/components/` and `src/components/qa/` that were not imported by runtime code.
- Removed duplicate dead UI artifacts:
  - `src/components/ui/toast.tsx.jsx`
  - `src/components/ui/toaster.tsx.jsx`
- Updated project hygiene configs to target live code paths:
  - `jsconfig.json` now resolves `@/*` to `src` first (with root fallback) while preserving existing no-regression typecheck scope.
  - `tailwind.config.js` now scans `src/**/*`.
- Updated `README.md` project structure to reflect the current `src/` + `src/nexus-os/` architecture.
- Fixed two latent syntax/parser defects in serverless functions surfaced during audit:
  - `functions/commsAssistant.ts` (unbalanced try/catch in request handler)
  - `functions/generateEventAAR.ts` (invalid escaped template literal expression)

### TODO

- TODO: Consolidate remaining non-NexusOS domain services in `src/components/services/` into `src/nexus-os/services/` in a dedicated follow-up migration with route-by-route regression testing.
- TODO: Migrate ESLint/typecheck coverage from legacy root globs to active `src/` + `functions/` in staged batches to avoid destabilizing CI.

## 2026-02-10 - NexusOS Shell Overhaul (Workspace UX)

- Resolved Hub shell duplication by making `src/Layout.jsx` render a NexusOS-only shell path for `currentPageName === 'Hub'`.
  - Prevents legacy `Header`, right `ContextPanel`, and bottom `TextCommsDock` from mounting over NexusOS.
  - Keeps legacy shell behavior unchanged for non-Hub routes.
- Introduced a new industrial Redscar visual layer:
  - Added `src/nexus-os/ui/theme/nexus-shell.css` with scan sweep, tactical vignette, terminal texture, and Redscar chrome surfaces.
  - Applied this theme in `src/nexus-os/preview/NexusOSPreviewPage.jsx`.
- Reworked NexusOS workspace composition in `src/nexus-os/preview/NexusOSPreviewPage.jsx`:
  - Added command-rail metadata (operator, bridge, focused op, scheduler state).
  - Elevated status telemetry and session feedback into shell-native panels.
  - Updated spacing and full-height behavior so the workspace acts as the authoritative shell.
- Refreshed core NexusOS primitives and shell modules to match the new language:
  - `src/nexus-os/ui/primitives/NexusButton.jsx`
  - `src/nexus-os/ui/primitives/NexusBadge.jsx`
  - `src/nexus-os/ui/primitives/PanelFrame.jsx`
  - `src/nexus-os/ui/workbench/WorkbenchGrid.jsx`
  - `src/nexus-os/ui/os/NexusTaskbar.tsx`
  - `src/nexus-os/ui/os/NexusCommandDeck.tsx`
  - `src/nexus-os/ui/os/NexusBootOverlay.tsx`
  - `src/nexus-os/ui/bridge/BridgeSwitcher.jsx`
  - `src/nexus-os/ui/ops/OpsStrip.tsx`
  - `src/nexus-os/ui/cqb/CqbContextSelector.tsx`

### TODO

- TODO: Continue phasing legacy non-NexusOS pages into NexusOS-native panel apps so command flows and chrome are fully unified.
- TODO: Add dedicated Playwright snapshots for `/Hub` admin workspace state to guard against shell regressions (duplicate overlays, z-index collisions, mobile clipping).
