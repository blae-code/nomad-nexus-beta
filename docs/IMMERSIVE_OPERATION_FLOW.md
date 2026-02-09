# Immersive Operation Flow

This flow is built around your taxonomy:
- `Operations` = player-led, synchronous command activities
- `Missions` = game-provided objectives anyone can run
- `Contracts` = async player economy/jobs (bounties, hauling, crafting, purchase orders)

## Core Experience Pillars
- Command clarity: every participant always knows current phase, objective, and fallback.
- Frictionless execution: one-click macros push map, comms, and command state together.
- Persistent story: every major decision is captured for replay, AAR, and training.
- Social presence: hangout voice exists before/after operations, not only during them.

## End-to-End Journey

## 1) Briefing (Setup + Planning)
- Entry: user opens `Operation Studio` in `Briefing` mode.
- Choose a template or start custom:
  - Strike Package, Cargo Corridor, Rescue Net, Contract Surge, or fully custom.
- Define operation profile:
  - operation type, pace (Casual/Focused), objective primary/secondary.
  - contract policy (none/support/embedded/primary), visibility.
  - comms doctrine (discipline, priority lane, hangout bridge).
  - asset mix (fighters/escorts/haulers/medevac/support).
- Build phase chain:
  - each phase has objective, trigger, duration, fallback.
- Save blueprint:
  - snapshot persisted locally and optionally to EventLog (if operation active).
- Deploy scaffold:
  - auto-drops phase markers + initial command on tactical map.

Immersion cues:
- Mission-control tone copy (“Phase 1 ready”, “Command lane priority”).
- Visual phase colors and numbered objectives.
- Real-time net quality panel while planning.

## 2) Command (Conducting Operation)
- Entry: switch to `Command` mode.
- Pre-launch gate review:
  - personnel readiness
  - comms health
  - support posture
  - phase completeness
  - critical pressure
- Go/No-Go:
  - if failed gates, operator sees corrective recommendations.
  - command may still proceed with explicit override.
- Active phase control:
  - select phase, issue phase command, jump map focus.
- Live operations loop:
  - map overlays + comms topology + timeline rail.
  - use tactical macros for rapid response (contact, CAS, medevac, etc.).
  - watch net QoS and congestion, rebalance lanes when degraded.
- Branching:
  - fallback action is attached to each phase; commanders can pivot quickly.

Immersion cues:
- “Live / Replay” state badges.
- Animated traffic flow on comms links.
- Critical alerts visibly/verbally distinct from routine traffic.

## 3) Debrief (Wrap + Learning)
- Entry: switch to `Debrief` mode.
- Auto-collected wrap metrics:
  - commands, incidents, callouts, status updates, map actions.
  - comms risk nets and congestion profile.
- Capture wrap notes:
  - lessons learned, failures, contract outcomes, doctrine changes.
- Save wrap snapshot:
  - EventLog record with profile + readiness + wrap metrics.
- Export AAR:
  - timeline JSON/CSV for external review/training.

Immersion cues:
- “Campaign memory” feeling via timeline replay + event snapshots.
- Next-op readiness recommendation generated from wrap data.

## Contracts + Missions Integration
- Missions are always visible as objective options for operation phases.
- Contracts can be:
  - Supporting operation (resupply, escort, salvage, procurement),
  - Embedded into phases (phase requires contract completion),
  - Primary objective (contract-first operation).
- Contract visibility mode controls whether board is private, allied, or public.

## Voice and Comms Flow
- Before op: hangout voice for social assembly.
- During op: operation nets with priority lane and optional hangout bridge.
- After op: debrief room + persistent social lane.
- Map-integrated comms:
  - net nodes, member links, bridge links, callout hotspots, QoS health.

## Accessibility + Usability Requirements
- Every control has keyboard path + aria labels.
- Layer and mode changes are operable without pointer.
- Color is never sole signal (status text + icons always present).
- Replay/time controls remain usable in reduced-motion preference.
- Critical alerts are readable at low vision zoom levels.

## Implementation Priority (Pragmatic)
1. Briefing completeness:
   - template editing, phase editor, blueprint snapshots.
2. Command excellence:
   - gates, phase issue controls, macro coverage, comms QoS.
3. Debrief quality:
   - wrap snapshot, AAR export, replay review workflow.
4. Org memory:
   - shared template library + outcome feedback into defaults.
