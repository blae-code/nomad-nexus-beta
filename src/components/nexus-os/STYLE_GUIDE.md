# NexusOS Style Guide

## Purpose
NexusOS UI must be deterministic, compact, and scan-first. This guide is mandatory for `src/components/nexus-os/ui/**`.

## Typography
- `Header Primary`: `text-[10px] font-black tracking-[0.15em] uppercase leading-none`
- `Header Secondary`: `text-[8px] font-bold tracking-[0.14em] uppercase leading-none`
- `Body Primary`: `text-[10px] font-semibold tracking-[0.12em] uppercase`
- `Body Secondary`: `text-[8px] font-semibold tracking-[0.14em] uppercase leading-none`
- `Telemetry`: `text-[10px] font-mono font-bold tracking-[0.15em] uppercase`
- `Telemetry Small`: `text-[8px] font-mono font-semibold tracking-[0.14em] uppercase`

Rules:
- System labels and controls: 8px or 10px only.
- `font-weight >= 600`.
- Uppercase required for system UI.
- Dynamic user-authored text may use readability-safe exceptions.

## Color System
- Base: `bg-zinc-950`, elevated `bg-zinc-900`, borders `zinc-700/40` to `zinc-700/60`.
- Accent: `orange-400/500`, command/admin `red-600`.
- State: `green` ok, `amber` warning, `red` danger, `zinc` neutral.
- Opacity backdrops require `backdrop-blur-sm`.

## Spacing and Layout
- Header: `px-2.5 py-2` (compact: `px-2 py-1.5`)
- Panel: `p-1.5`
- Card: `px-1.5 py-1`
- Gap: `gap-1`, `gap-1.5`, `gap-2`
- No page scroll or internal panel scroll in normal operation.
- Lists capped to 5-7 rows with pagination controls.

## Icon and Token Sizes
- Icons: `w-2.5 h-2.5`, `w-3 h-3`, `w-3.5 h-3.5`, `w-4 h-4`
- Tokens: `w-3 h-3`, `w-4 h-4`, `w-5 h-5`, `w-6 h-6`

## Primitives
- Buttons must use `NexusButton`.
- Badges must use `NexusBadge`.
- Status/signal/metric cells should use:
  - `NexusStatusPill`
  - `NexusSignalPill`
  - `NexusMetricCell`
- Tactical token UI should use:
  - `NexusTokenIcon`
  - `NexusStatusToken`
  - `NexusRosterBadge`
  - `NexusTokenLabel`

## Token Guidance
Use token semantics from `ui/theme/design-tokens.js` and `ui/tokens/TOKEN_USAGE_GUIDE.md`.

## Validation
- Use `runFullAudit` from `validators/styleGuideValidator.js`.
- Run build and smoke checks after UI changes.

## Hard Don'ts
- No decorative gradients in persistent panels.
- No token sizes outside 12-24px.
- No text-only status if semantic token exists.
- No new framework/runtime dependency for design enforcement.

