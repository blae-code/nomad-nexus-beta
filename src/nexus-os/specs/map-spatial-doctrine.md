# Nexus OS Map and Spatial Doctrine (Spec Only)

This file is doctrine, not UI implementation.

## Guardrails

- No fake live telemetry. All map truth is declared or inferred with source trace.
- No TTL/confidence bypass. Expired or low-confidence items must degrade visibility.
- No omniscient map view. Visibility must honor scope and authority gates.

## Map Layers

1. Org Presence
  - Shows who is plausibly active by scoped location estimate.
  - Inputs: `LocationEstimate` + presence records only.
2. Operation Layer
  - Shows operation-level intents, CQB events, and objective states.
  - Inputs: `CommandIntent`, `CqbEvent`, active operation context.
3. Comms Network Overlay
  - Shows channel topology and monitoring links from comms templates.
  - Inputs: `CommsTemplateRegistry` and channel context resolution.
4. Intel / Risk
  - Shows threat and confidence bands from inferred reports.
  - Inputs: inferred `LocationEstimate` sources + tactical `THREAT_UPDATE`.
5. Logistics / Movement
  - Shows convoy/extract intents and movement corridors.
  - Inputs: `CommandIntent` (`MOVE`, `EXTRACT`, `HOLD`) and operation annotations.

## Spatial Annotations

- Pin (observation)
  - Meaning: observed fact candidate.
  - Backing: `LocationEstimate` source or `CqbEvent` observation payload.
- Marker (intent)
  - Meaning: desired movement/hold/push objective.
  - Backing: `CommandIntent`.
- Note (context)
  - Meaning: supporting rationale, uncertainty caveat, or briefing context.
  - Backing: structured metadata attached to events/intents.

## TTL and Confidence Rules

- Every annotation needs:
  - timestamp (`createdAt` or `updatedAt`)
  - `ttlSeconds`
  - confidence in `[0..1]`
- Active state:
  - `now < timestamp + ttlSeconds`
- Stale state:
  - `now >= timestamp + ttlSeconds`
- Rendering doctrine:
  - stale -> hidden by default (or dimmed in audit/debug mode only)
  - confidence `< 0.4` -> warning style, never promoted as high certainty
  - confidence `>= 0.7` -> eligible for command-level summaries

## Visibility Scopes and Authority Gates

- Scopes: `PRIVATE`, `SQUAD`, `WING`, `OP`, `ORG`
- Rule: viewers only see records within their effective scope envelope.
- Command gate examples:
  - `user` scope intent can be issued by `FIRETEAM+`
  - `squad` scope intent requires `SQUAD+`
  - `wing` scope intent requires `WING+`
  - `op` scope intent requires `COMMAND+`
  - `org` scope intent requires `ORG`
- Emergency exception:
  - emergency channels may rebroadcast critical alerts across scopes,
    but source + confidence + TTL must remain attached.

