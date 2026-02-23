import { describe, expect, it } from 'vitest';
import {
  buildCompactChannelCards,
  buildSchemaTree,
  pageCount,
  pageSlice,
  resolveVehicleBucket,
  SCHEMA_CHANNEL_PAGE_SIZE,
} from '../../src/components/nexus-os/ui/comms/commsFleetSchemaRuntime';

describe('commsFleetSchemaRuntime', () => {
  const channels = [
    { id: 'command', label: 'Command Net', membershipCount: 3, intensity: 0.3 },
    { id: 'alpha', label: 'Alpha Squad', membershipCount: 3, intensity: 0.1 },
    { id: 'bravo', label: 'Bravo Squad', membershipCount: 2, intensity: 0.2 },
    { id: 'log', label: 'Logistics', membershipCount: 2, intensity: 0.6 },
    { id: 'med', label: 'Medical', membershipCount: 1, intensity: 0.15 },
    { id: 'air', label: 'Air Relay', membershipCount: 2, intensity: 0.45 },
  ];

  const roster = [
    { id: 'ce-1', callsign: 'Warden', element: 'CE', role: 'Command Lead' },
    { id: 'ce-2', callsign: 'Signal', element: 'CE', role: 'Signal Chief' },
    { id: 'gce-1', callsign: 'Rook', element: 'GCE', role: 'Rifleman' },
    { id: 'gce-2', callsign: 'Nova', element: 'GCE', role: 'Medic' },
    { id: 'ace-1', callsign: 'Falcon', element: 'ACE', role: 'Pilot' },
  ];

  const edges = [
    { type: 'membership', sourceId: 'user:ce-1', targetId: 'channel:command' },
    { type: 'membership', sourceId: 'user:ce-2', targetId: 'channel:command' },
    { type: 'membership', sourceId: 'user:gce-1', targetId: 'channel:alpha' },
    { type: 'membership', sourceId: 'user:gce-2', targetId: 'channel:alpha' },
    { type: 'membership', sourceId: 'user:ace-1', targetId: 'channel:air' },
  ];

  const voiceParticipants = [
    { memberProfileId: 'ce-1', state: 'SPEAKING' },
    { memberProfileId: 'ce-2', state: 'READY' },
    { memberProfileId: 'gce-1', muted: true },
    { memberProfileId: 'ace-1', state: 'TX' },
  ];

  it('builds deterministic schema + compact cards with paging', () => {
    const first = buildSchemaTree({ channels, edges, roster, voiceParticipants, schemaChannelPage: 0 });
    const second = buildSchemaTree({ channels, edges, roster, voiceParticipants, schemaChannelPage: 0 });

    expect(first).toEqual(second);
    expect(first.schemaChannelPageCount).toBe(2);
    expect(pageCount(channels, SCHEMA_CHANNEL_PAGE_SIZE)).toBe(2);
    expect(pageSlice(channels, 0, SCHEMA_CHANNEL_PAGE_SIZE)).toHaveLength(5);

    const compact = buildCompactChannelCards({ schemaTree: first.schemaTree, page: 0 });
    expect(compact.total).toBeGreaterThan(0);
    expect(compact.cards.length).toBeGreaterThan(0);
    expect(compact.pageCount).toBeGreaterThanOrEqual(1);

    const hasTxOperator = compact.cards.some((card) => card.operators.some((op) => op.status === 'TX'));
    expect(hasTxOperator).toBe(true);
  });

  it('classifies vehicle buckets by role and element', () => {
    expect(resolveVehicleBucket({ id: '1', element: 'ACE', role: 'Pilot' }, 'air').label).toContain('Flight');
    expect(resolveVehicleBucket({ id: '2', element: 'GCE', role: 'Medic' }, 'med').label).toContain('Medevac');
    expect(resolveVehicleBucket({ id: '3', element: 'CE', role: 'Signal Lead' }, 'command').label).toContain('Command');
  });
});
