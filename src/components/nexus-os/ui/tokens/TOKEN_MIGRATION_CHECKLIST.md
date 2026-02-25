# NexusOS Token Migration Checklist

## Priority Components

### High
- `ui/comms/VoiceCommsRail.jsx`
- `ui/map/MapStageCanvas.jsx`
- `ui/comms/CommsHub.jsx`
- `ui/map/TacticalMapFocusApp.jsx`

### Medium
- `ui/os/NexusTaskbar.jsx`
- `layout/Header.jsx`
- `ui/panels/TacticalSidePanel.jsx`
- `ui/admin/SystemAdminFocusApp.jsx`

### Low
- `ui/comms/SquadCard.jsx`
- `ui/ops/OperationFocusApp.jsx` (JSX entrypoint)
- `ui/comms/CommsNetworkConsole.jsx` (JSX entrypoint)

## Validation Per Component
- Status indicators converted to semantic tokens.
- No token size outside `sm|md|lg|xl`.
- Semantic color mapping preserved.
- Lists still capped and paginated.
- No internal scroll regression.

## Rollback Strategy
- Keep tokenized components fallback-safe (`NexusTokenIcon` falls back to grey square).
- If interaction breaks, retain original callback paths and disable only token rendering branch.

## Test Focus
- Voice roster state transitions (`TX`, `MUTED`, `ON-NET`, `OFF-NET`).
- Map marker click/hover/context interactions.
- Channel unread rendering for `1-9` and `10+`.
- Admin key/user row actions remain clickable with tokens enabled.

