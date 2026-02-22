# Token Asset Usage Map

## Purpose
Define one canonical token taxonomy and where each token family should be used in NexusOS surfaces so Base44 and contributors do not diverge icon semantics.

## Canonical Source
- Runtime manifest: `src/components/nexus-os/ui/tokens/tokenAssetMap.ts`
- Barrel export: `src/components/nexus-os/ui/tokens/index.ts`

## Family Semantics
- `hex`: channels / comms nets
- `square`: operators / user entities
- `triangle`: warnings / callouts / alert overlays
- `penta`: operation lifecycle + package stages
- `target`, `target-alt`: objective and route state
- `circle`: lightweight state chips (TX, ON-NET, MUTED, OFF-NET)
- `objective`: mission objective entities
- `ammunition`, `fuel`, `food`, `energy`, `hospital`, `mechanics`, `shelter`: logistics/resource telemetry domains
- `number-0..13`: indexed squads/packages/lanes

## Color Semantics
- `green`: ready / healthy / available
- `orange`: active / engaged
- `red`: critical / denied / degraded
- `yellow`: caution / elevated
- `grey`: offline / muted / inactive
- `blue`, `cyan`: informational / neutral telemetry
- `purple` / `violet`: secure or special context (resolved by manifest compatibility fallback)

## Surface Placement
- Comms focus topology + crew cards: `src/components/nexus-os/ui/comms/CommsNetworkConsole.tsx`
- Voice rail quick controls + lane cards: `src/components/nexus-os/ui/comms/VoiceCommsRail.jsx`
- Tactical map legend + overlays: planned in `src/components/nexus-os/ui/map/MapLegend.jsx` and `src/components/nexus-os/ui/map/MapStageCanvas.tsx`
- Ops status cards: planned in `src/components/nexus-os/ui/ops/OpsStrip.tsx`

## Naming Constraints
- Asset filenames must follow: `token-<family>-<color>.png`
- No malformed prefixes (e.g. `oken-...`)
- No misspelled colors (e.g. `greeen`)
- Avoid adding duplicate synonym colors in one family unless explicitly required by design.
