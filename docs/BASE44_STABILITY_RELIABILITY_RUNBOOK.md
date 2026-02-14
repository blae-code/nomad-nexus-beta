# Base44 Stability and Reliability Runbook

This runbook is the default handoff reference for reliability, safety, and performance work in this repo.

## 1) Baseline Verification Commands

Run these before and after any substantial change:

```bash
npm run lint
npm run typecheck
npm run test:backend
npm run test:unit
npm run build
npm run audit:prod
```

One-command stability sweep:

```bash
npm run verify:stability
```

## 2) Core Runtime Surfaces (Base44-Facing)

- `src/api/base44Client.ts`
  - Frontend Base44 SDK initialization and request boundary.
- `src/api/memberFunctions.ts`
  - Frontend invocation wrapper for backend member functions.
- `functions/`
  - Server-side Base44 function entry points for privileged operations.
- `src/components/nexus-os/services/workspaceStateBridgeService.ts`
  - Debounced workspace state sync to/from backend (`updateWorkspaceState`).
  - Uses sanitized namespace/scope/schema, stable JSON clone, and best-effort flush behavior.

## 3) Critical Persistence Paths

NexusOS persistence moved under `src/components/nexus-os/`.

- Workbench layout persistence:
  - `src/components/nexus-os/ui/workbench/layoutPersistence.ts`
  - Local key prefix: `nexus.os.workbench.layout.v2`
  - Empty `activePanelIds` is preserved (blank canvas is a valid persistent state).

- Workspace session persistence:
  - `src/components/nexus-os/ui/os/sessionPersistence.ts`
  - Local key prefix: `nexus.os.session.v1`

- Tactical map preferences:
  - `src/components/nexus-os/services/tacticalMapPreferenceService.ts`
  - Local key prefix: `nexus.os.tacticalMap.preferences.v2`

- Custom workbench widgets:
  - `src/components/nexus-os/services/customWorkbenchWidgetService.ts`
  - Local key prefix: `nexus.os.workbench.customWidgets.v1`

## 4) Reliability and Performance Guardrails

- `Hub` is treated as Nexus workspace shell in `src/Layout.jsx` to avoid extra wrapper overhead and duplicated shell rendering.
- Keep state writes debounced and scoped; avoid unthrottled write loops to Base44 functions.
- Keep volatile UI feeds capped/paged to prevent unbounded render cost.
- Favor schema-normalized service inputs (`zod` schemas in `src/components/nexus-os/schemas/`).

## 5) Security Baseline

- Production dependency audit target is zero known vulnerabilities:
  - `npm run audit:prod`
- Removed unused `react-quill` dependency to eliminate the transitive `quill` XSS advisory path.
- Do not store secrets in localStorage; only short-lived/session-scoped client tokens already used by existing auth flow.

## 6) Change Review Checklist

- Does the change alter any `src/components/nexus-os/services/*` contract?
- Are new persisted keys prefixed and documented?
- Are tests updated/added in `tests/nexus-os/` or `tests/comms/`?
- Does `verify:stability` pass locally?
- If a Base44 function contract changed: was the corresponding `functions/*` path updated?

