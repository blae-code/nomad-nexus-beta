import { describe, expect, it } from 'vitest';
import {
  applySquadTransferProjection,
  buildSquadTransferPayload,
  canIssueScopedRoleCommand,
  normalizeOperationalRoleToken,
  resolveScopedRoleRecipients,
} from '../../src/components/nexus-os/ui/comms/commsSquadCardEnhancementRuntime';

describe('commsSquadCardEnhancementRuntime', () => {
  it('normalizes operational role tokens for expanded fleet roles', () => {
    expect(normalizeOperationalRoleToken('Pilot')).toBe('pilot');
    expect(normalizeOperationalRoleToken('Turret Gunner')).toBe('gunner');
    expect(normalizeOperationalRoleToken('Ship Engineer')).toBe('engineer');
    expect(normalizeOperationalRoleToken('Cargo Chief')).toBe('cargo');
    expect(normalizeOperationalRoleToken('Signal Officer')).toBe('signal');
  });

  it('resolves scoped role recipients deterministically by scope and role', () => {
    const cards: any[] = [
      {
        id: 'GCE:Alpha',
        wingId: 'GCE',
        primaryChannelId: 'alpha-net',
        vehicles: [{ id: 'ship-a', memberIds: ['u-1', 'u-2'] }],
        operators: [
          { id: 'u-1', role: 'Pilot', vehicleId: 'ship-a' },
          { id: 'u-2', role: 'Gunner', vehicleId: 'ship-a' },
        ],
      },
      {
        id: 'GCE:Bravo',
        wingId: 'GCE',
        primaryChannelId: 'bravo-net',
        vehicles: [{ id: 'ship-b', memberIds: ['u-3'] }],
        operators: [{ id: 'u-3', role: 'Pilot', vehicleId: 'ship-b' }],
      },
    ];

    const wingPilots = resolveScopedRoleRecipients({
      target: { scope: 'WING', roleToken: 'pilot', wingId: 'GCE' },
      squadCards: cards,
    });
    expect(wingPilots.memberIds).toEqual(['u-1', 'u-3']);
    expect(wingPilots.channelIds).toEqual(['alpha-net', 'bravo-net']);

    const shipGunners = resolveScopedRoleRecipients({
      target: { scope: 'SHIP', roleToken: 'gunner', squadId: 'GCE:Alpha', vehicleId: 'ship-a' },
      squadCards: cards,
    });
    expect(shipGunners.memberIds).toEqual(['u-2']);
  });

  it('enforces tiered scoped command authority', () => {
    expect(canIssueScopedRoleCommand('FLEET', { isCommand: true, isSquadLead: false, isPilot: false })).toBe(true);
    expect(canIssueScopedRoleCommand('WING', { isCommand: false, isSquadLead: true, isPilot: false })).toBe(false);
    expect(canIssueScopedRoleCommand('SQUAD', { isCommand: false, isSquadLead: true, isPilot: false })).toBe(true);
    expect(canIssueScopedRoleCommand('SHIP', { isCommand: false, isSquadLead: false, isPilot: true })).toBe(true);
  });

  it('builds transfer payloads and rejects no-op moves', () => {
    const valid = buildSquadTransferPayload({
      kind: 'operator',
      memberIds: ['u-1'],
      sourceSquadId: 'A',
      sourceChannelId: 'alpha',
      destinationSquadId: 'B',
      destinationChannelId: 'bravo',
    });
    expect(valid).toMatchObject({
      kind: 'operator',
      memberIds: ['u-1'],
      sourceSquadId: 'A',
      destinationSquadId: 'B',
    });

    const invalid = buildSquadTransferPayload({
      kind: 'operator',
      memberIds: ['u-1'],
      sourceSquadId: 'A',
      sourceChannelId: 'alpha',
      destinationSquadId: 'A',
      destinationChannelId: 'alpha',
    });
    expect(invalid).toBeNull();
  });

  it('projects squad transfer results for immediate UI updates', () => {
    const cards: any[] = [
      {
        id: 'A',
        wingId: 'GCE',
        primaryChannelId: 'alpha',
        operators: [
          { id: 'u-1', callsign: 'One', role: 'Pilot', status: 'ON-NET', roleToken: 'pilot', vehicleId: 'ship-a' },
          { id: 'u-2', callsign: 'Two', role: 'Gunner', status: 'ON-NET', roleToken: 'gunner', vehicleId: 'ship-a' },
        ],
        vehicles: [{ id: 'ship-a', memberIds: ['u-1', 'u-2'], crewCount: 2 }],
      },
      {
        id: 'B',
        wingId: 'GCE',
        primaryChannelId: 'bravo',
        operators: [],
        vehicles: [{ id: 'ship-b', memberIds: [], crewCount: 0 }],
      },
    ];

    const projection = applySquadTransferProjection(cards, {
      kind: 'vehicle',
      memberIds: ['u-1', 'u-2'],
      sourceSquadId: 'A',
      sourceChannelId: 'alpha',
      destinationSquadId: 'B',
      destinationChannelId: 'bravo',
      vehicleId: 'ship-b',
    });

    expect(projection.movedCount).toBe(2);
    const source = projection.nextCards.find((entry) => entry.id === 'A');
    const destination = projection.nextCards.find((entry) => entry.id === 'B');
    expect(source?.operators).toHaveLength(0);
    expect(destination?.operators).toHaveLength(2);
    expect(destination?.vehicles[0].memberIds.sort()).toEqual(['u-1', 'u-2']);
  });
});
