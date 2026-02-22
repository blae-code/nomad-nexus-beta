# Token Asset Usage Map

## Purpose
Define one canonical token taxonomy and usage map so Base44 and contributors do not drift icon semantics.

## Canonical Source
- Runtime manifest: `src/components/nexus-os/ui/tokens/tokenAssetMap.ts`
- Barrel export: `src/components/nexus-os/ui/tokens/index.ts`
- Comms semantic mapping helper: `src/components/nexus-os/ui/comms/commsTokenSemantics.ts`

## Family Semantics
- `hex`: channels / comms nets
- `square`: operators / user entities
- `triangle`: warnings / callouts / alert overlays
- `penta`: operation lifecycle + package stages
- `target`, `target-alt`: objective and route state
- `circle`: lightweight state chips (TX, ON-NET, MUTED, OFF-NET)
- `objective`: mission objective entities
- `ammunition`, `fuel`, `food`, `energy`, `hospital`, `mechanics`, `shelter`: logistics/resource telemetry domains
- `number-0..13`: indexed formations / lanes / squads

## Color Semantics
- `green`: ready / healthy / available
- `orange`: active / engaged
- `red`: critical / denied / degraded
- `yellow`: caution / elevated
- `grey`: offline / muted / inactive
- `blue`, `cyan`: informational / neutral telemetry
- `purple` / `violet`: secure or special context

## Variant Policy
- `TokenVariant` supports: `base`, `v1`, `v2`
- Variants currently apply to numbered purple assets only:
  - `token-number-<n>-purple.png` -> `base`
  - `token-number-<n>-purple-1.png` -> `v1`
  - `token-number-<n>-purple-2.png` -> `v2`
- Runtime resolver functions:
  - `getTokenAssetUrl(family, color, { variant })`
  - `getNumberTokenAssetUrl(value, color, { variant })`
  - `getNumberTokenVariantByState(statusLike)`

## State-Based Assignment Defaults
- `v1` (`purple-1`): secure/authenticated/hardened contexts
- `v2` (`purple-2`): escalated/critical/degraded/jammed contexts
- `base`: all other states

## Surface Placement
- Comms focus topology + crew cards + fleet schema: `src/components/nexus-os/ui/comms/CommsNetworkConsole.tsx`
- Comms focus net control (planned/permanent/temporary governance): `src/components/nexus-os/ui/comms/CommsNetworkConsole.tsx`
- Voice rail quick controls + lane cards: `src/components/nexus-os/ui/comms/VoiceCommsRail.jsx`
- Debug token atlas drawer (dev only): `src/components/nexus-os/ui/comms/CommsNetworkConsole.tsx`

## Catalog Coverage Guard
- `tokenCatalog.entries` + `tokenCatalog.fileNames` enumerate all mapped assets.
- Expected mapped file count: `232`.
- Includes all canonical token files and numbered purple variants.

## Naming Constraints
- Asset filenames must follow canonical patterns:
  - `token-<family>-<color>.png`
  - `token-number-<n>-purple-1.png`
  - `token-number-<n>-purple-2.png`
- No malformed prefixes or misspelled colors.
