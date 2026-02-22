# Base44 Compatibility Context

This document defines how the repo stays compatible with Base44 while avoiding hard lock-in to specific Base44 tables/assets.

## Objectives

1. Keep Base44 integration explicit and readable.
2. Isolate table-name assumptions behind adapters where feasible.
3. Prevent deprecated/legacy artifacts from re-entering the codebase.

## Base44 Constraints and Working Strategy

1. Constraint: entity names can vary across environments.
   Strategy: normalize reads through adapter candidates (for example `Channel` and `CommsChannel`).
2. Constraint: some entities are optional or unavailable in specific deployments.
   Strategy: use graceful fallback to empty-state behavior and deterministic local services.
3. Constraint: auth/session context differs between frontend and function runtime.
   Strategy: keep frontend function calls behind `invokeMemberFunction`, backend calls behind `getAuthContext`.
4. Constraint: direct table coupling causes lock-in and brittle migrations.
   Strategy: route NexusOS table reads through service adapters and keep write orchestration in member functions.
5. Constraint: stale docs/files can mislead Base44 rehydration/context.
   Strategy: enforce anti-drift checks with `verify:base44-context` and remove deprecated artifacts.

## Canonical Integration Boundaries

- Frontend Base44 client: `src/api/base44Client.js`
- Frontend member-function gateway: `src/api/memberFunctions.js`
- Function auth/session boundary: `functions/_shared/memberAuth.ts`
- Workspace state backend bridge: `functions/updateWorkspaceState.ts`
- Voice-net governance boundary: `functions/manageVoiceNets.ts`
- Voice-net lifecycle sweep: `functions/sweepVoiceNetLifecycle.ts`

## NexusOS Non-Lock-In Rule

Within NexusOS, direct Base44 table reads should be routed through adapter services instead of being embedded in feature logic.

Current adapter:

- `src/components/nexus-os/services/base44CommsReadAdapter.ts`
  - Normalizes channel/membership reads across possible entity names.
  - Keeps `commsGraphService` resilient to schema/table naming drift.

UI access anchors:

- `src/pages/NexusOSWorkspace.jsx` (authenticated workspace shell)
- `src/pages/NexusOSPreview.jsx` (ungated Base44 UI refinement route)
- `src/pages/CommsConsole.jsx` (legacy route hard-cut to canonical NexusOS comms focus)
- `src/components/nexus-os/base44/uiRefinementManifest.ts` (stable machine-readable UI map)

Canonical comms focus surfaces:

- `src/components/nexus-os/ui/comms/CommsNetworkConsole.tsx`
- `src/components/nexus-os/ui/comms/VoiceCommsRail.jsx`
- `src/components/nexus-os/ui/comms/CommsHub.jsx`
- `src/components/voice/voiceNetGovernanceClient.js` (frontend gateway for governed voice-net mutations)

## Anti-Drift Gate

Run:

```bash
npm run verify:base44-context
```

The check fails if:

- Deprecated NexusOS artifacts are present.
- Legacy alias imports (`@/integrations`, `@/entities`) reappear.
- NexusOS files bypass the comms adapter and directly import `api/base44Client`.

## Purge Baseline (2026-02-14)

The following deprecated artifacts were removed to prevent stale context drift:

- `src/components/nexus-os/README.jsx`
- `src/components/nexus-os/ui/os/NexusBootOverlay.jsx`
- `tacticalmapmockup.html`
- `src/components/nexus-os/discovery/*`
