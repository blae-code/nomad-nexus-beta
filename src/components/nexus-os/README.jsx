markdown
# Nexus|OS Foundation (BIOS Layer)

This folder is the non-UI foundation for Nexus|OS. It is intentionally isolated from routes/pages so we can lock doctrine before feature work.

## Hard Rules

1. Nexus|OS is single-page and must avoid OS-level scrolling patterns.
2. Operational truth is event-sourced, timestamped, scoped, and TTL-bound.
3. AI assistants can structure/summarize known records, but must not invent facts.
4. Ops, CQB, Comms, Map, and Social views must read from the same substrate.
5. Extend behavior via registries/packs; do not hardcode mode-specific forks in UI.

## Contributor Guardrails

- Do not fake live game telemetry. Star Citizen state is declared/inferred only.
- Do not bypass TTL or confidence when rendering tactical or command state.
- Do not introduce omniscient/global-chat assumptions that ignore scope/authority.
- Do not wire these modules into existing routes without explicit migration planning.

## Layout

- `discovery/`: inventory snapshots of current repo concepts (Phase 1).
- `registries/`: canonical variant, macro, TTL, and comms template data.
- `schemas/`: core interfaces for CQB events, command intents, and location estimates.
- `services/`: safe stubs with minimal validation and TODO integration points.
- `specs/`: doctrine and policy specs (no UI implementation).
- `ui/`: Nexus|OS shell primitives, workbench grid, focus overlay, and bridge switcher.
- `preview/`: dev-only shell surface for immediate iteration.
- `validators/`: dev-only registry integrity checks (warnings only).

## Migration Backlog

- TODO: Move legacy domain services from `src/components/services/` into `src/components/nexus-os/services/` with staged adoption to avoid runtime regressions.
