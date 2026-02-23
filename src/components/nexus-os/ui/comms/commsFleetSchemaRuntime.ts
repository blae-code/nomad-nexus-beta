import { buildCommsChannelHealth } from '../../services/commsIncidentService';
import { resolveSquadLabel, wingLabelByElement } from './commsTokenSemantics';

export const SCHEMA_CHANNEL_PAGE_SIZE = 5;
export const CREW_CARD_PAGE_SIZE = 4;
export const COMPACT_CHANNEL_CARD_PAGE_SIZE = 6;

type GenericMember = {
  id: string;
  callsign?: string;
  role?: string;
  element?: string;
};

type GenericParticipant = {
  id?: string;
  userId?: string;
  memberProfileId?: string;
  callsign?: string;
  state?: string;
  muted?: boolean;
  isSpeaking?: boolean;
};

type GenericChannel = {
  id: string;
  label: string;
  membershipCount?: number;
  intensity?: number;
};

type GenericEdge = {
  type?: string;
  sourceId?: string;
  targetId?: string;
};

function toToken(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function clampChannelStatus(entry: any): string {
  if (!entry) return 'No health telemetry';
  return `${entry.discipline} · Q${entry.qualityPct}% · ${entry.latencyMs}ms`;
}

function isParticipantSpeaking(participant: GenericParticipant | undefined): boolean {
  if (participant?.isSpeaking) return true;
  const state = String(participant?.state || '').toUpperCase();
  return state.includes('TALK') || state.includes('TX') || state.includes('SPEAK');
}

function isMutedParticipant(participant: GenericParticipant | undefined): boolean {
  if (!participant) return false;
  if (participant.muted === true) return true;
  const state = String(participant.state || '').toUpperCase();
  return state.includes('MUTE');
}

function operatorStatusPriority(status: string): number {
  if (status === 'TX') return 0;
  if (status === 'ON-NET') return 1;
  if (status === 'MUTED') return 2;
  return 3;
}

export function resolveVehicleBucket(member: GenericMember, channelId: string): { id: string; label: string } {
  const roleToken = toToken(member.role);
  if (member.element === 'ACE' || roleToken.includes('pilot') || roleToken.includes('gunship')) {
    return { id: `${channelId}:vehicle:flight`, label: 'Flight Element' };
  }
  if (roleToken.includes('medic') || roleToken.includes('medical')) {
    return { id: `${channelId}:vehicle:medevac`, label: 'Medevac Platform' };
  }
  if (member.element === 'CE' || roleToken.includes('lead') || roleToken.includes('signal') || roleToken.includes('command')) {
    return { id: `${channelId}:vehicle:c2`, label: 'Command Relay' };
  }
  return { id: `${channelId}:vehicle:assault`, label: 'Assault Transport' };
}

export function buildChannelHealthById(channels: GenericChannel[]): Record<string, any> {
  return buildCommsChannelHealth({ channels }).reduce<Record<string, any>>((acc, entry) => {
    acc[entry.channelId] = entry;
    return acc;
  }, {});
}

function buildExplicitChannelMembersById(edges: GenericEdge[]) {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type !== 'membership') continue;
    const sourceId = String(edge.sourceId || '');
    const targetId = String(edge.targetId || '');
    if (!sourceId.startsWith('user:') || !targetId.startsWith('channel:')) continue;
    const memberId = sourceId.replace('user:', '');
    const channelId = targetId.replace('channel:', '');
    if (!memberId || !channelId) continue;
    const rows = map.get(channelId) || [];
    if (!rows.includes(memberId)) rows.push(memberId);
    map.set(channelId, rows);
  }
  return map;
}

function buildFallbackChannelMembersById(channels: GenericChannel[], roster: GenericMember[]) {
  const map = new Map<string, string[]>();
  for (const channel of channels) {
    const token = toToken(`${channel.id} ${channel.label}`);
    const memberIds = roster
      .filter((member) => {
        const roleToken = toToken(member.role);
        if (token.includes('command') || token.includes('coord')) {
          return member.element === 'CE' || roleToken.includes('lead') || roleToken.includes('signal');
        }
        if (token.includes('log')) {
          return member.element === 'ACE' || roleToken.includes('logistic') || roleToken.includes('medic');
        }
        if (token.includes('alpha') || token.includes('bravo') || token.includes('squad')) {
          return member.element === 'GCE';
        }
        return true;
      })
      .map((member) => member.id);
    map.set(channel.id, memberIds);
  }
  return map;
}

export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice(page * pageSize, page * pageSize + pageSize);
}

export function pageCount(items: unknown[], pageSize: number): number {
  return Math.max(1, Math.ceil(items.length / pageSize));
}

export function buildSchemaTree({
  channels,
  edges,
  roster,
  voiceParticipants,
  schemaChannelPage = 0,
}: {
  channels: GenericChannel[];
  edges: GenericEdge[];
  roster: GenericMember[];
  voiceParticipants: GenericParticipant[];
  schemaChannelPage?: number;
}) {
  const channelHealthById = buildChannelHealthById(channels);
  const explicitChannelMembersById = buildExplicitChannelMembersById(edges);
  const fallbackChannelMembersById = buildFallbackChannelMembersById(channels, roster);
  const participantByMemberId = new Map<string, GenericParticipant>();
  for (const participant of voiceParticipants) {
    const id = String(participant.memberProfileId || participant.userId || participant.id || '').trim();
    if (!id) continue;
    participantByMemberId.set(id, participant);
  }

  const visibleChannels = pageSlice(channels, schemaChannelPage, SCHEMA_CHANNEL_PAGE_SIZE);
  const wings = [
    { id: 'CE', label: wingLabelByElement('CE') },
    { id: 'ACE', label: wingLabelByElement('ACE') },
    { id: 'GCE', label: wingLabelByElement('GCE') },
  ];

  const schemaTree = wings.map((wing) => {
    const squadByLabel = new Map<string, any>();
    for (const channel of visibleChannels) {
      const explicitIds = explicitChannelMembersById.get(channel.id) || [];
      const fallbackIds = fallbackChannelMembersById.get(channel.id) || [];
      const resolvedMemberIds = explicitIds.length > 0 ? explicitIds : fallbackIds;
      const channelMembers = roster.filter((member) => resolvedMemberIds.includes(member.id) && member.element === wing.id);
      if (!channelMembers.length && wing.id !== 'CE') continue;

      const squadLabel = resolveSquadLabel(channel.id, channel.label);
      const squadKey = `${wing.id}:${squadLabel}`;
      const squad =
        squadByLabel.get(squadKey) ||
        {
          id: squadKey,
          label: squadLabel,
          channels: [],
        };

      const vehiclesById = new Map<string, any>();
      for (const member of channelMembers) {
        const vehicle = resolveVehicleBucket(member, channel.id);
        const bucket =
          vehiclesById.get(vehicle.id) ||
          {
            id: vehicle.id,
            label: vehicle.label,
            operators: [],
          };
        const participant = participantByMemberId.get(member.id);
        const status = isParticipantSpeaking(participant)
          ? 'TX'
          : isMutedParticipant(participant)
            ? 'MUTED'
            : participant
              ? 'ON-NET'
              : 'OFF-NET';
        bucket.operators.push({
          id: member.id,
          callsign: member.callsign || member.id,
          role: member.role || 'Member',
          status,
        });
        vehiclesById.set(vehicle.id, bucket);
      }

      const vehicles = [...vehiclesById.values()].map((vehicle) => {
        const txCount = vehicle.operators.filter((entry: any) => entry.status === 'TX').length;
        const mutedCount = vehicle.operators.filter((entry: any) => entry.status === 'MUTED').length;
        const channelState = channelHealthById[channel.id];
        const basicStatus =
          channelState?.discipline === 'SATURATED'
            ? 'DEGRADED'
            : txCount > 0
              ? 'ACTIVE'
              : mutedCount > 0
                ? 'MIXED'
                : 'READY';
        return {
          ...vehicle,
          basicStatus,
          crewCount: vehicle.operators.length,
        };
      });

      const channelState = channelHealthById[channel.id];
      squad.channels.push({
        id: channel.id,
        label: channel.label,
        status: clampChannelStatus(channelState),
        membershipCount: channel.membershipCount || 0,
        vehicles,
      });
      squadByLabel.set(squadKey, squad);
    }
    return {
      ...wing,
      squads: [...squadByLabel.values()],
    };
  });

  return {
    schemaTree,
    schemaChannelPageCount: pageCount(channels, SCHEMA_CHANNEL_PAGE_SIZE),
  };
}

export function buildCrewCards(schemaTree: any[]) {
  const cards: Array<{
    id: string;
    wingId: string;
    wingLabel: string;
    squadLabel: string;
    channelId: string;
    channelLabel: string;
    channelStatus: string;
    vehicleLabel: string;
    vehicleStatus: string;
    crewCount: number;
    operators: Array<{ id: string; callsign: string; role: string; status: string }>;
  }> = [];

  for (const wing of schemaTree) {
    for (const squad of wing.squads) {
      for (const channel of squad.channels) {
        if (!Array.isArray(channel.vehicles) || channel.vehicles.length === 0) {
          cards.push({
            id: `card:${wing.id}:${squad.id}:${channel.id}:empty`,
            wingId: wing.id,
            wingLabel: wing.label,
            squadLabel: squad.label,
            channelId: channel.id,
            channelLabel: channel.label,
            channelStatus: channel.status,
            vehicleLabel: 'Unassigned Platform',
            vehicleStatus: 'READY',
            crewCount: 0,
            operators: [],
          });
          continue;
        }

        for (const vehicle of channel.vehicles) {
          const sortedOperators = [...vehicle.operators].sort((a: any, b: any) => {
            const priorityDelta = operatorStatusPriority(a.status) - operatorStatusPriority(b.status);
            if (priorityDelta !== 0) return priorityDelta;
            return String(a.callsign || a.id).localeCompare(String(b.callsign || b.id));
          });
          cards.push({
            id: `card:${wing.id}:${squad.id}:${channel.id}:${vehicle.id}`,
            wingId: wing.id,
            wingLabel: wing.label,
            squadLabel: squad.label,
            channelId: channel.id,
            channelLabel: channel.label,
            channelStatus: channel.status,
            vehicleLabel: vehicle.label,
            vehicleStatus: vehicle.basicStatus,
            crewCount: Number(vehicle.crewCount || vehicle.operators.length || 0),
            operators: sortedOperators.slice(0, 3),
          });
        }
      }
    }
  }

  return cards.slice(0, 32);
}

export function buildCompactChannelCards({
  schemaTree,
  page = 0,
}: {
  schemaTree: any[];
  page?: number;
}) {
  const crewCards = buildCrewCards(schemaTree);
  return {
    cards: pageSlice(crewCards, page, COMPACT_CHANNEL_CARD_PAGE_SIZE),
    pageCount: pageCount(crewCards, COMPACT_CHANNEL_CARD_PAGE_SIZE),
    total: crewCards.length,
  };
}
