# NexusOS Comms Polish TODO (2026-02-22)

## Objective
Deliver a stable, immersive, tactical 2D Comms topology workflow with deterministic command feedback, zero default scrolling, and operator-friendly hierarchy views.

## Phase 1 - Stability and Correctness
- [x] Eliminate duplicate Comms console resolution ambiguity (`CommsNetworkConsole.jsx` -> TSX shim).
- [x] Align topbar readiness label with smoke expectations (`NexusOS Command Surface`).
- [x] Validate no regressions in Element SDK config + bridge theme integration.
- [x] Confirm map interactions remain deterministic after command issue actions.

## Phase 2 - Tactical Topology UX
- [ ] Validate topology map occupies ~60% of focus surface in command mode.
- [ ] Validate right schema column occupies ~40% and remains compact/readable.
- [ ] Ensure drag/drop node repositioning persists for session runtime.
- [ ] Verify radial menu interactions: select -> open radial -> issue action -> visible state update.
- [ ] Ensure bridge target mode has explicit clear/cancel behavior (`Escape` + UI feedback).

## Phase 3 - Schema Tree (Fleet > Wing > Squad)
- [ ] Confirm collapsible hierarchy defaults support Redscar operations:
- [ ] Fleet root visible and expanded by default.
- [ ] Command wing expanded by default.
- [ ] Command Cell squad expanded by default.
- [ ] Channel nodes include bridged/basic link status.
- [ ] Vehicle nodes include platform basic status.
- [ ] Operator leaves include individual comms status (TX/READY/MUTED/OFF-NET).
- [ ] Add concise empty states when channel/vehicle scope has no entries.

## Phase 4 - List Capping and Paging
- [ ] Keep orders feed capped and paged (newest first).
- [ ] Keep incidents list capped and paged.
- [ ] Keep mission thread lanes capped and paged.
- [ ] Keep schema channel list capped and paged.
- [x] Verify no panel-level scrollbars appear during standard flow at target resolutions.

## Phase 5 - Visual and Interaction Polish
- [ ] Tighten tactical microcopy for concise operational wording.
- [ ] Normalize badge tones across incidents, directives, and schema status.
- [ ] Verify focus/hover/keyboard affordances for command actions.
- [ ] Reduce visual noise where density blocks rapid scan.

## Phase 6 - QA Battery and Flow Audit
- [x] Run `npm run verify:stability`.
- [x] Run `npm run test:backend`.
- [x] Run `npm run test:e2e:smoke`.
- [x] Run `npm run verify:base44-context`.
- [x] Run `npm run audit:prod`.
- [ ] Audit user flows end-to-end and log pass/fail:
- [x] Comms focus open via hotkey.
- [x] Reroute/Restrict/Check-In actions.
- [x] Mission thread lane action execution.
- [x] Incident status transitions (ACK/ASSIGNED/RESOLVED).
- [x] Orders feed status progression (Queued/Persisted/Acked).

## Exit Criteria
- [ ] All battery commands pass.
- [ ] No fatal runtime errors during smoke scenarios.
- [ ] Primary comms user flows pass with deterministic UI feedback.
- [ ] Changes committed and pushed to `origin/main`.
