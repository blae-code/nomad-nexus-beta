# Comms Network Discovery Note (MVP)

Date: 2026-02-09

## Existing Comms Data Located

- Channel data source exists:
  - `base44.entities.Channel.list(...)` (used broadly in existing comms UI/services)
  - `src/components/services/commsService.jsx`
- Presence source exists:
  - `src/components/services/presenceService.jsx`
- Canonical template topology exists in Nexus OS:
  - `src/nexus-os/registries/commsTemplateRegistry.ts`
- CQB event emission source for pulse integration:
  - `src/nexus-os/services/cqbEventService.ts`

## Membership / Monitoring Gaps

- No single stable, guaranteed channel-membership entity was found in Nexus OS layer.
- MVP adapter behavior:
  - Attempts Base44 entities `ChannelMembership` or `ChannelMember` if available.
  - Falls back to dev-only in-memory memberships derived from roster + template channels.
- Monitoring links are sourced from `CommsTemplateRegistry.monitoringLinks`.

## Integration Scope

- Comms Network visualization is confined to Nexus OS dev preview and Command Focus only.
- Existing production pages/routes are untouched.

