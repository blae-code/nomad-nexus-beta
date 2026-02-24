import { describe, expect, it } from 'vitest';
import { applyFoundryQuickStartPreset, deriveFoundryStepStatuses } from '../../src/components/nexus-os/ui/ops/operationFoundryRuntime';

describe('operationFoundryRuntime', () => {
  it('derives BLOCKED/READY/DONE states with deterministic gating', () => {
    const statuses = deriveFoundryStepStatuses({
      ARCHETYPE: true,
      IDENTITY: false,
      SCENARIO: true,
      FORCE: true,
      COMMS: true,
      READINESS: true,
      REVIEW: true,
    });

    expect(statuses.ARCHETYPE).toBe('DONE');
    expect(statuses.IDENTITY).toBe('READY');
    expect(statuses.SCENARIO).toBe('BLOCKED');
    expect(statuses.REVIEW).toBe('BLOCKED');
  });

  it('applies Rapid Deploy preset deterministically', () => {
    const next = applyFoundryQuickStartPreset(
      'RAPID_DEPLOY',
      {
        startInput: '2026-02-24T00:00',
        endInput: '2026-02-24T02:00',
        commsTemplateInput: 'FIRETEAM_PRIMARY',
        ttlProfileInput: 'TTL-OLD',
        gateRows: [
          { label: 'Gate A', ownerRole: 'Lead', required: false },
          { label: 'Gate B', ownerRole: 'Lead', required: false },
          { label: 'Gate C', ownerRole: 'Lead', required: false },
        ],
      },
      Date.parse('2026-02-24T00:00:00.000Z')
    );

    expect(next.commsTemplateInput).toBe('SQUAD_NETS');
    expect(next.ttlProfileInput).toBe('TTL-OP-CASUAL');
    expect(next.gateRows[0].required).toBe(true);
    expect(next.gateRows[1].required).toBe(true);
  });

  it('applies Doctrine Lock and Training Lane with expected template/ttl transforms', () => {
    const doctrine = applyFoundryQuickStartPreset(
      'DOCTRINE_LOCK',
      {
        startInput: '2026-02-24T00:00',
        endInput: '2026-02-24T02:00',
        commsTemplateInput: 'SQUAD_NETS',
        ttlProfileInput: 'TTL-X',
        gateRows: [{ label: 'Gate A', ownerRole: 'Lead', required: false }],
      },
      Date.parse('2026-02-24T00:00:00.000Z')
    );
    const training = applyFoundryQuickStartPreset(
      'TRAINING_LANE',
      {
        startInput: '2026-02-24T00:00',
        endInput: '2026-02-24T02:00',
        commsTemplateInput: 'COMMAND_NET',
        ttlProfileInput: 'TTL-Y',
        gateRows: [{ label: 'Gate A', ownerRole: 'Lead', required: true }],
      },
      Date.parse('2026-02-24T00:00:00.000Z')
    );

    expect(doctrine.commsTemplateInput).toBe('COMMAND_NET');
    expect(doctrine.ttlProfileInput).toBe('TTL-OP-FOCUSED');
    expect(doctrine.gateRows.every((gate) => gate.required)).toBe(true);

    expect(training.commsTemplateInput).toBe('FIRETEAM_PRIMARY');
    expect(training.ttlProfileInput).toBe('TTL-OP-CASUAL');
    expect(training.gateRows.every((gate) => !gate.required)).toBe(true);
  });
});
