# Cross-Organization and Outreach Guide

This document describes the Package C cross-org implementation for Nexus OS.

## Subsystems

### Database / Schema (Nexus OS Canonical Layer)

- `OrganizationProfile` tracks participating orgs and default visibility.
- `OrgAlliance` models bilateral alliance state and terms.
- `OperationInvite` captures host -> target org invitation lifecycle.
- `GuestOperationAccess` enforces scoped access for invited orgs.
- `SharedOperationChannel` tracks joint channel topology.
- `PublicUpdate` stores sanitized outreach artifacts and publish state.
- `EmergencyBroadcast` records coalition emergency alerts and acknowledgements.

Files:
- `src/nexus-os/schemas/crossOrgSchemas.ts`
- `src/nexus-os/schemas/opSchemas.ts` (additive operation fields: `hostOrgId`, `invitedOrgIds`, `classification`, `guestOrgIds`)

### API / Functions

Added secure function stubs with member/admin auth:

- `functions/sendEventInvite.ts`
  - Creates cross-org invite records.
  - Falls back to `EventLog` if `EventInvite` entity is unavailable.
  - Best-effort notification fanout to target org members.

- `functions/respondToEventInvite.ts`
  - Accept/decline invite responses.
  - Provisions a joint channel when possible on accept.
  - Writes audit event logs.

### Service Layer

- `src/nexus-os/services/crossOrgService.ts`
  - Org registration and alliance workflows.
  - Invite send/respond lifecycle.
  - Guest access grant/revoke.
  - Shared channel creation/listing.
  - Classification-based operation access checks.
  - Public update create/publish with sanitization.
  - Emergency coalition broadcast and acknowledgement.

Also updated:
- `src/nexus-os/services/operationService.ts`
  - additive host org/classification fields and org-aware listing.
- `src/nexus-os/services/commsGraphService.ts`
  - includes shared coalition channels in graph snapshots.

### Front-End Components

- `src/nexus-os/ui/ops/CoalitionOutreachPanel.tsx`
  - Organization registration
  - Alliance creation/response
  - Operation invite flow
  - Shared channel setup
  - Public update author/publish
  - Emergency broadcast

- `src/nexus-os/ui/ops/OperationFocusApp.tsx`
  - new `COALITION` tab.

- `src/pages/PublicUpdate.jsx`
  - unauthenticated public route for published public updates only.

- `src/App.jsx`
  - route added: `/public/updates/:slug`

### Permissions / Scope

Core check:
- `canAccessOperationContext({ opId, requesterOrgId, requesterUserId, requiredClassification })`

Policy:
- Host org always allowed.
- Invited/guest org requires invite or guest grant.
- Classification gates deny disallowed visibility escalation.

### Notifications / Outreach

- Invite notifications are best-effort via `Notification` entity in `sendEventInvite`.
- Public updates maintain publish status:
  - `DRAFT`, `PUBLISHED`, `PENDING_EXTERNAL`, `FAILED_EXTERNAL`, `ARCHIVED`.
- Coordinate and operation-id redaction is applied before public publish.

## Migration Notes

1. Existing operations created before Package C may have no `hostOrgId`.
   - Current service defaults new operations to `ORG-LOCAL`.
   - Older records should be backfilled if durable persistence is introduced.

2. If Base44 entities are not yet created:
   - Functions gracefully fallback to `EventLog`.
   - Service layer remains in-memory for deterministic local development.

3. Suggested Base44 entities to create:
   - `EventInvite`
   - `OrgAlliance`
   - `OrganizationProfile`
   - `PublicUpdate`

## Manual Test Flow

1. Open Nexus OS -> `Operation Focus` -> `COALITION`.
2. Register two orgs.
3. Create alliance and set status to active.
4. Send operation invite and accept it.
5. Create shared channel and verify it appears in comms graph context.
6. Publish public update and open `/public/updates/:slug` unauthenticated.
7. Send emergency broadcast and confirm it is listed for target orgs.

