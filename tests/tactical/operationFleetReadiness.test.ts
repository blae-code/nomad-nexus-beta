import { describe, expect, it } from 'vitest';
import {
  computeFleetPlanningMetrics,
  createDefaultFleetCommandState,
  parseFleetCommandState,
  resolveFleetTelemetry,
} from '../../src/components/tactical/operationFleetReadiness.js';

describe('operationFleetReadiness', () => {
  it('returns default state when notes are missing or invalid', () => {
    expect(parseFleetCommandState('')).toEqual(createDefaultFleetCommandState());
    expect(parseFleetCommandState('[fleet_command_state]{not-json}[/fleet_command_state]')).toEqual(createDefaultFleetCommandState());
  });

  it('resolves telemetry from nested telemetry or fallback fields', () => {
    expect(resolveFleetTelemetry({ telemetry: { health: 90, shields: 80, fuel: 70, cargo: 10 } })).toEqual({
      health: 90,
      shields: 80,
      fuel: 70,
      cargo: 10,
    });
    expect(resolveFleetTelemetry({ health_percent: 55, shields_percent: 45, fuel_percent: 35, cargo_percent: 25 })).toEqual({
      health: 55,
      shields: 45,
      fuel: 35,
      cargo: 25,
    });
  });

  it('computes scoped readiness metrics from fleet, loadout, and engineering state', () => {
    const fleetStateA = {
      schema_version: 1,
      reservations: [
        { reservation_id: 'r1', operation_mode: 'focused', status: 'scheduled' },
      ],
      loadout_library: [{ loadout_id: 'l1', name: 'Interceptor' }],
      active_loadout_id: 'l1',
      engineering_queue: [
        { task_id: 'e1', summary: 'Engine tuning', severity: 'critical', status: 'queued' },
      ],
    };
    const fleetStateB = {
      schema_version: 1,
      reservations: [
        { reservation_id: 'r2', operation_mode: 'casual', status: 'scheduled' },
      ],
      loadout_library: [{ loadout_id: 'l2', name: 'Hauler' }],
      active_loadout_id: null,
      engineering_queue: [
        { task_id: 'e2', summary: 'Hull patch', severity: 'medium', status: 'in_progress' },
      ],
    };
    const encodedA = `[fleet_command_state]${JSON.stringify(fleetStateA)}[/fleet_command_state]`;
    const encodedB = `[fleet_command_state]${JSON.stringify(fleetStateB)}[/fleet_command_state]`;

    const metrics = computeFleetPlanningMetrics({
      fleetAssets: [
        {
          id: 'asset-a',
          status: 'OPERATIONAL',
          telemetry: { health: 90, shields: 80, fuel: 70 },
          maintenance_notes: encodedA,
        },
        {
          id: 'asset-b',
          status: 'MAINTENANCE',
          telemetry: { health: 60, shields: 55, fuel: 50 },
          maintenance_notes: encodedB,
        },
        {
          id: 'asset-c',
          status: 'DESTROYED',
          telemetry: { health: 0, shields: 0, fuel: 0 },
          maintenance_notes: '',
        },
      ],
      eventAssetIds: ['asset-a', 'asset-b'],
      plannedAssets: { fighters: 1, escorts: 1, haulers: 1, medevac: 0, support: 0 },
    });

    expect(metrics.totalAssets).toBe(2);
    expect(metrics.requiredAssets).toBe(3);
    expect(metrics.operationalCount).toBe(1);
    expect(metrics.maintenanceCount).toBe(1);
    expect(metrics.destroyedCount).toBe(0);
    expect(metrics.activeLoadoutCount).toBe(1);
    expect(metrics.engineeringOpen).toBe(2);
    expect(metrics.engineeringCriticalOpen).toBe(1);
    expect(metrics.reservationsFocused).toBe(1);
    expect(metrics.reservationsCasual).toBe(1);
    expect(metrics.telemetryAverage).toBe(68);
  });
});
