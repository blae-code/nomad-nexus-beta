import { determineChannelContext } from './channelContextService';
import { getCommsTemplate } from '../registries/commsTemplateRegistry';
import { listStoredCqbEvents } from './cqbEventService';
import type { CqbRosterMember } from '../ui/cqb/cqbTypes';
import { listSharedOperationChannels } from './crossOrgService';
import {
  listBase44ChannelMemberships,
  listBase44CommsChannels,
} from './base44CommsReadAdapter';

/**
 * Comms Graph Service (MVP)
 *
 * Reads real channel data when available and gracefully falls back to
 * template + dev roster derived memberships. No fake telemetry is generated.
 */

export type CommsGraphNodeType = 'channel' | 'team' | 'user';
export type CommsGraphEdgeType = 'membership' | 'monitoring';

export interface CommsGraphNode {
  id: string;
  type: CommsGraphNodeType;
  label: string;
  x: number;
  y: number;
  size: number;
  intensity: number;
  meta?: Record<string, unknown>;
}

export interface CommsGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: CommsGraphEdgeType;
  intensity: number;
  dashed?: boolean;
}

export interface CommsGraphSnapshot {
  templateId: string;
  channels: Array<{ id: string; label: string; membershipCount: number; intensity: number }>;
  nodes: CommsGraphNode[];
  edges: CommsGraphEdge[];
  generatedAt: string;
}

export interface CommsGraphOptions {
  variantId: string;
  opId?: string;
  includeUserNodes?: boolean;
  roster?: CqbRosterMember[];
  cqbWindowMs?: number;
}

interface ChannelMembershipRecord {
  channelId: string;
  memberId: string;
}

export interface ChannelTrafficSnapshot {
  byChannelId: Record<string, { count: number; intensity: number }>;
  totalEvents: number;
  generatedAt: string;
}

async function listChannelsFromBase44() {
  return listBase44CommsChannels(250);
}

async function listMembershipsFromBase44(): Promise<ChannelMembershipRecord[]> {
  return listBase44ChannelMemberships(500);
}

function buildDevMemberships(channelIds: string[], roster: CqbRosterMember[]): ChannelMembershipRecord[] {
  // Dev fallback only: deterministic assignment for preview graph integrity.
  if (!channelIds.length || !roster.length) return [];

  const primary = channelIds[0];
  const support = channelIds[1] || primary;
  return roster.flatMap((member) => {
    if (member.element === 'CE') {
      return [{ channelId: primary, memberId: member.id }];
    }
    if (member.element === 'ACE') {
      return [
        { channelId: primary, memberId: member.id },
        { channelId: support, memberId: member.id },
      ];
    }
    return [{ channelId: support, memberId: member.id }];
  });
}

export function getCqbChannelTraffic(options: Pick<CommsGraphOptions, 'variantId' | 'opId' | 'cqbWindowMs'>): ChannelTrafficSnapshot {
  const windowMs = options.cqbWindowMs ?? 20000;
  const nowMs = Date.now();
  const events = listStoredCqbEvents({ includeStale: true }).filter((event) => {
    if (options.variantId && event.variantId !== options.variantId) return false;
    if (options.opId && event.opId !== options.opId) return false;
    return nowMs - new Date(event.createdAt).getTime() <= windowMs;
  });

  const counts = new Map<string, number>();
  for (const event of events) {
    const key = event.channelId || 'UNSCOPED';
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const byChannelId = [...counts.entries()].reduce<Record<string, { count: number; intensity: number }>>((acc, [channelId, count]) => {
    acc[channelId] = { count, intensity: Math.min(1, count / 6) };
    return acc;
  }, {});

  return {
    byChannelId,
    totalEvents: events.length,
    generatedAt: new Date(nowMs).toISOString(),
  };
}

function distributeXPositions(ids: string[], minX: number, maxX: number): Record<string, { x: number }> {
  const clampedMin = Math.max(0, Math.min(100, minX));
  const clampedMax = Math.max(clampedMin, Math.min(100, maxX));
  const span = clampedMax - clampedMin;
  const step = ids.length > 1 ? span / (ids.length - 1) : 0;
  return ids.reduce<Record<string, { x: number }>>((acc, id, index) => {
    acc[id] = { x: ids.length === 1 ? 50 : clampedMin + index * step };
    return acc;
  }, {});
}

function createChannelNodePositions(channelIds: string[]) {
  const x = distributeXPositions(channelIds, 14, 86);
  return channelIds.reduce<Record<string, { x: number; y: number }>>((acc, id) => {
    acc[id] = { x: x[id]?.x ?? 50, y: 48 };
    return acc;
  }, {});
}

function createTeamNodePositions(teamIds: string[]) {
  const x = distributeXPositions(teamIds, 18, 82);
  return teamIds.reduce<Record<string, { x: number; y: number }>>((acc, id) => {
    acc[id] = { x: x[id]?.x ?? 50, y: 16 };
    return acc;
  }, {});
}

function createUserNodePositions(userIds: string[]) {
  const x = distributeXPositions(userIds, 20, 80);
  return userIds.reduce<Record<string, { x: number; y: number }>>((acc, id) => {
    acc[id] = { x: x[id]?.x ?? 50, y: 80 };
    return acc;
  }, {});
}

export async function buildCommsGraphSnapshot(options: CommsGraphOptions): Promise<CommsGraphSnapshot> {
  const context = determineChannelContext({ variantId: options.variantId });
  const template = getCommsTemplate(context.templateId);
  const includeUserNodes = options.includeUserNodes !== false;
  const roster = Array.isArray(options.roster) ? options.roster : [];

  const baseChannels = await listChannelsFromBase44();
  const templateRows = context.channelIds.map((id) => {
    const fromBase44 = baseChannels.find((entry) => entry.matchKeys.includes(id));
    const fromTemplate = template.channels.find((entry) => entry.id === id);
    return {
      id,
      label: fromBase44?.label || fromTemplate?.label || id,
    };
  });
  const sharedRows =
    options.opId
      ? listSharedOperationChannels(options.opId).map((channel) => ({
          id: `shared:${channel.id}`,
          label: channel.channelLabel,
        }))
      : [];
  const channelRows = [...templateRows, ...sharedRows];

  const membershipsFromEntity = await listMembershipsFromBase44();
  const memberships = membershipsFromEntity.length > 0 ? membershipsFromEntity : buildDevMemberships(templateRows.map((entry) => entry.id), roster);

  const channelMemberCounts = channelRows.reduce<Record<string, number>>((acc, channel) => {
    acc[channel.id] = memberships.filter((entry) => entry.channelId === channel.id).length;
    return acc;
  }, {});

  const traffic = getCqbChannelTraffic({
    variantId: options.variantId,
    opId: options.opId,
    cqbWindowMs: options.cqbWindowMs,
  });

  const channelPositions = createChannelNodePositions(channelRows.map((entry) => entry.id));
  const teamIds = ['CE', 'GCE', 'ACE'];
  const teamPositions = createTeamNodePositions(teamIds);
  const userPositions = createUserNodePositions(roster.map((member) => member.id));

  const nodes: CommsGraphNode[] = channelRows.map((channel) => ({
    id: `channel:${channel.id}`,
    type: 'channel',
    label: channel.label,
    x: channelPositions[channel.id]?.x ?? 50,
    y: channelPositions[channel.id]?.y ?? 44,
    size: 20 + Math.min(20, channelMemberCounts[channel.id] * 2),
    intensity: traffic.byChannelId[channel.id]?.intensity || 0,
    meta: {
      channelId: channel.id,
      membershipCount: channelMemberCounts[channel.id] || 0,
    },
  }));

  const teamNodes: CommsGraphNode[] = teamIds.map((teamId) => ({
    id: `team:${teamId}`,
    type: 'team',
    label: teamId,
    x: teamPositions[teamId]?.x ?? 50,
    y: teamPositions[teamId]?.y ?? 10,
    size: 18,
    intensity: 0,
    meta: { teamId },
  }));

  const userNodes: CommsGraphNode[] = includeUserNodes
    ? roster.map((member) => ({
        id: `user:${member.id}`,
        type: 'user',
        label: member.callsign,
        x: userPositions[member.id]?.x ?? 50,
        y: userPositions[member.id]?.y ?? 82,
        size: 14,
        intensity: 0,
        meta: { memberId: member.id, element: member.element, role: member.role },
      }))
    : [];

  const membershipEdgesFromMembers: CommsGraphEdge[] = memberships
    .map((membership) => {
      const targetNodeId = `channel:${membership.channelId}`;
      const sourceMember = roster.find((member) => member.id === membership.memberId);
      const sourceNodeId = includeUserNodes && sourceMember ? `user:${sourceMember.id}` : sourceMember ? `team:${sourceMember.element}` : '';
      if (!sourceNodeId) return null;
      const channelIntensity = traffic.byChannelId[membership.channelId]?.intensity || 0;
      return {
        id: `edge:member:${sourceNodeId}->${targetNodeId}`,
        sourceId: sourceNodeId,
        targetId: targetNodeId,
        type: 'membership' as const,
        intensity: channelIntensity * 0.85,
      };
    })
    .filter(Boolean) as CommsGraphEdge[];

  const monitoringEdges: CommsGraphEdge[] = template.monitoringLinks.map((link) => {
    const sourceIntensity = traffic.byChannelId[link.sourceChannelId]?.intensity || 0;
    const targetIntensity = traffic.byChannelId[link.targetChannelId]?.intensity || 0;
    return {
      id: `edge:monitor:${link.sourceChannelId}->${link.targetChannelId}`,
      sourceId: `channel:${link.sourceChannelId}`,
      targetId: `channel:${link.targetChannelId}`,
      type: 'monitoring',
      dashed: true,
      intensity: Math.max(sourceIntensity, targetIntensity),
    };
  });

  // Shared joint channels are linked to primary template net with dashed monitoring edge style.
  for (const row of sharedRows) {
    monitoringEdges.push({
      id: `edge:monitor:primary->${row.id}`,
      sourceId: `channel:${context.primaryChannelId}`,
      targetId: `channel:${row.id}`,
      type: 'monitoring',
      dashed: true,
      intensity: 0.22,
    });
  }

  const edges: CommsGraphEdge[] = [...membershipEdgesFromMembers, ...monitoringEdges];
  const graphNodes: CommsGraphNode[] = [...teamNodes, ...nodes, ...userNodes];

  return {
    templateId: template.id,
    channels: channelRows.map((channel) => ({
      id: channel.id,
      label: channel.label,
      membershipCount: channelMemberCounts[channel.id] || 0,
      intensity: traffic.byChannelId[channel.id]?.intensity || 0,
    })),
    nodes: graphNodes,
    edges,
    generatedAt: new Date().toISOString(),
  };
}
