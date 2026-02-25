# Token Usage Audit (Baseline -> Current)

## Current Usage Hotspots
- `ui/comms/VoiceCommsRail.jsx`: participant and fleet token usage (high impact).
- `ui/comms/commsTokenSemantics.ts`: centralized comms semantic token mapping.
- `ui/map/MapStageCanvas.jsx`: tactical overlay marker rendering (now tokenized for core overlays).
- `ui/comms/CommsHub.jsx`: channel identity and unread indicators.
- `layout/Header.jsx`: top telemetry and active operation indicators.

## Text-Heavy Surfaces Prioritized
1. Voice roster/status rows.
2. Map callouts/presence/intel markers.
3. Comms channel list and unread badges.
4. Admin user/key status rows.

## Migration Notes
- Existing token asset library and URL resolver were already complete.
- Migration focused on replacing inline text state where semantic tokens exist.
- Fallback behavior retained via `NexusTokenIcon` error fallback.

