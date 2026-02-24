import { describe, expect, it } from 'vitest';
import { buildOperationCommandGridSnapshot, operationMetricTone } from '../../src/components/nexus-os/ui/ops/operationCommandGridRuntime';

describe('operationCommandGridRuntime', () => {
  it('derives deterministic metric ordering and values', () => {
    const snapshot = buildOperationCommandGridSnapshot(
      {
        requiredReady: 2,
        requiredTotal: 4,
        activeEntries: 6,
        openSeats: 2,
        hardViolations: 1,
        softFlags: 3,
        phasesDone: 2,
        phasesTotal: 4,
        tasksDone: 5,
        tasksTotal: 10,
        challengedAssumptions: 1,
        unreadThreadReplies: 2,
        timelineHighSeverityCount: 2,
        orderAcked: 3,
        orderPersisted: 2,
        leadAlertsHighSeverity: 1,
        leadAlertsTotal: 3,
        unresolvedIncidentEquivalent: 2,
      },
      Date.parse('2026-02-24T00:00:00.000Z')
    );

    expect(snapshot.generatedAtMs).toBe(Date.parse('2026-02-24T00:00:00.000Z'));
    expect(snapshot.metrics.map((entry) => entry.id)).toEqual([
      'READINESS',
      'FORCE_FILL',
      'POLICY_HEALTH',
      'EXECUTION_PROGRESS',
      'DECISION_DEBT',
      'TIMELINE_PRESSURE',
      'ORDER_DISCIPLINE',
      'COMMAND_LOAD',
    ]);
    expect(snapshot.metrics.find((entry) => entry.id === 'READINESS')?.valueText).toBe('2/4');
    expect(snapshot.metrics.find((entry) => entry.id === 'ORDER_DISCIPLINE')?.valueText).toContain('% ACK');
    expect(snapshot.overallPressure).toBeGreaterThanOrEqual(0);
    expect(snapshot.overallPressure).toBeLessThanOrEqual(1);
  });

  it('handles empty denominators with stable fallbacks', () => {
    const snapshot = buildOperationCommandGridSnapshot({
      requiredReady: 0,
      requiredTotal: 0,
      activeEntries: 0,
      openSeats: 0,
      hardViolations: 0,
      softFlags: 0,
      phasesDone: 0,
      phasesTotal: 0,
      tasksDone: 0,
      tasksTotal: 0,
      challengedAssumptions: 0,
      unreadThreadReplies: 0,
      timelineHighSeverityCount: 0,
      orderAcked: 0,
      orderPersisted: 0,
      leadAlertsHighSeverity: 0,
      leadAlertsTotal: 0,
      unresolvedIncidentEquivalent: 0,
    });

    expect(snapshot.metrics.find((entry) => entry.id === 'READINESS')?.valueText).toBe('0/0');
    expect(snapshot.metrics.find((entry) => entry.id === 'FORCE_FILL')?.valueText).toBe('100%');
    expect(snapshot.metrics.find((entry) => entry.id === 'ORDER_DISCIPLINE')?.valueText).toBe('No directives');
    expect(snapshot.overallTone).toBeDefined();
  });

  it('maps pressure to tone deterministically', () => {
    expect(operationMetricTone(0)).toBe('ok');
    expect(operationMetricTone(0.3)).toBe('active');
    expect(operationMetricTone(0.6)).toBe('warning');
    expect(operationMetricTone(1)).toBe('danger');
  });
});
