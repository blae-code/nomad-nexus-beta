# Nexus OS Foundation (BIOS Layer)

## Design System (Mandatory)

- Style guide: [STYLE_GUIDE.md](./STYLE_GUIDE.md)
- Token guide: [TOKEN_USAGE_GUIDE.md](./ui/tokens/TOKEN_USAGE_GUIDE.md)
- Migration checklist: [TOKEN_MIGRATION_CHECKLIST.md](./ui/tokens/TOKEN_MIGRATION_CHECKLIST.md)
- Design tokens: `ui/theme/design-tokens.js`
- Validator: `validators/styleGuideValidator.js`

Before building NexusOS UI:
1. Use Nexus primitives (`NexusButton`, `NexusBadge`, token primitives) instead of ad-hoc controls.
2. Keep lists capped to 5-7 items with paging (no internal scroll in normal mode).
3. Enforce typography/spacing/icon matrices from the style guide.
4. Keep token semantics deterministic (red=danger, green=ok).
5. Preserve Element SDK and existing service/data contracts.

This folder is the non-UI foundation for Nexus OS. It is intentionally isolated from routes/pages so we can lock doctrine before feature work.

## Hard Rules

1. Nexus OS is single-page and must avoid OS-level scrolling patterns.
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

- `registries/`: canonical variant, macro, TTL, and comms template data.
- `schemas/`: core interfaces for CQB events, command intents, and location estimates.
- `services/`: operational services, including Base44 adapter boundaries for non-lock-in reads.
- `specs/`: doctrine and policy specs (no UI implementation).
- `ui/`: Nexus OS shell primitives, workbench grid, focus overlay, and bridge switcher.
- `preview/`: dev-only shell surface for immediate iteration.
- `validators/`: dev-only registry integrity checks (warnings only).

## Base44 Compatibility

- Avoid embedding raw Base44 table assumptions inside feature logic; use service adapters.
- Keep workspace sync writes routed through `updateWorkspaceState` contracts.
- Run `npm run verify:base44-context` before shipping NexusOS changes.
