import { describe, expect, it } from 'vitest';
import {
  buildOperationIcsFilename,
  buildOperationScheduleIcs,
  validateOperationSchedule,
} from '../../src/components/nexus-os/services/operationScheduleService';
import type { Operation } from '../../src/components/nexus-os/schemas/opSchemas';

function makeOperation(partial: Partial<Operation>): Operation {
  return {
    id: 'op_ics_1',
    name: 'Industrial Run Alpha',
    posture: 'CASUAL',
    status: 'PLANNING',
    domains: { fps: false, ground: true, airSpace: true, logistics: true },
    createdBy: 'owner-1',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z',
    ao: { nodeId: 'system-stanton' },
    commsTemplateId: 'SQUAD_NETS',
    ttlProfileId: 'TTL-OP-CASUAL',
    permissions: {
      ownerIds: ['owner-1'],
      participantIds: ['owner-1'],
      commanderIds: [],
      guestOrgIds: [],
    },
    schedule: {
      plannedStartAt: '2026-03-01T10:00:00.000Z',
      plannedEndAt: '2026-03-01T12:00:00.000Z',
      timezone: 'UTC',
    },
    ...partial,
  };
}

describe('operationScheduleService', () => {
  it('validates single-run schedule window semantics', () => {
    expect(
      validateOperationSchedule({
        plannedStartAt: '2026-03-01T10:00:00.000Z',
        plannedEndAt: '2026-03-01T12:00:00.000Z',
        timezone: 'UTC',
      }).valid
    ).toBe(true);

    expect(
      validateOperationSchedule({
        plannedStartAt: '2026-03-01T12:00:00.000Z',
        plannedEndAt: '2026-03-01T10:00:00.000Z',
        timezone: 'UTC',
      }).valid
    ).toBe(false);
  });

  it('builds UTC-safe ICS payload for operation schedule export', () => {
    const op = makeOperation({});
    const ics = buildOperationScheduleIcs(op, { organizerEmail: 'ops@test.local', nowMs: Date.parse('2026-02-28T00:00:00.000Z') });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Industrial Run Alpha');
    expect(ics).toContain('DTSTART:20260301T100000Z');
    expect(ics).toContain('DTEND:20260301T120000Z');
    expect(ics).toContain('ORGANIZER:mailto:ops@test.local');
  });

  it('builds deterministic filename slug', () => {
    const op = makeOperation({ name: 'PvP / Org vs Org // Prime' });
    expect(buildOperationIcsFilename(op)).toBe('pvp-org-vs-org-prime.ics');
  });
});

