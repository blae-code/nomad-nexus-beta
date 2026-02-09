# Simulation Sandbox Guide

This guide covers the War Academy simulation workflow added in Package D.

## Doctrine and Safety

- Simulation output is always tagged as `isSimulation=true`.
- Simulation events are isolated from live operation telemetry views.
- Rescue-first outcomes are weighted in session scoring and debrief.
- Treat all simulation logs as training artifacts, not live truth.

## Scenario Authoring

1. Open `War Academy` and go to `Scenario Library`.
2. Use `Author Scenario` to define:
- metadata (`name`, `difficulty`, `priority`, tags)
- narrative context
- objectives (required/optional, rescue-weighted)
- timeline triggers (`timeOffsetSeconds`, event type, severity)
3. Save the scenario. The script is persisted to `EventTemplate.training_scenario_data`.

## Running a Simulation Session

1. Go to the `Simulation Engine` tab.
2. Pick a scenario and click `Start Session`.
3. During run:
- pause/resume session
- mark objectives complete
- inject manual events for instructor overrides
4. Click `Stop + Debrief` to finalize.

The stop action writes:
- in-memory `TrainingResult` from the simulation engine
- `record_training_result` through `updateWarAcademyProgress`
- trainee milestone updates and a `TRAINING_RESULT` event log

## Data Contracts

- Runtime service: `src/nexus-os/services/trainingSimulationService.ts`
- Schemas: `src/nexus-os/schemas/trainingSchemas.ts`
- Member function bridge: `functions/updateWarAcademyProgress.ts`

Example trigger payload:

```json
{
  "timeOffsetSeconds": 180,
  "eventType": "MEDICAL_EXTRACTION",
  "title": "Casualty at LZ Echo",
  "message": "Stabilize and extract within 5 minutes.",
  "severity": "HIGH",
  "objectiveId": "obj_extract_1",
  "requiresResponse": true
}
```

## Fallback Behavior

- If runtime engine is unavailable, instructors can still schedule training events and mark completion manually.
- If AI/debrief helpers are unavailable, objective summary and timeline remain usable for manual debrief.
- If backend progress write fails, runtime results still remain visible in the current session.
