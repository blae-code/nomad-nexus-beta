import type { MapNode } from '../schemas/mapSchemas';
import type { Operation } from '../schemas/opSchemas';

export type CommsPriority = 'STANDARD' | 'HIGH' | 'CRITICAL';
export type CommsNetDiscipline = 'FOCUSED' | 'HANGOUT' | 'CONTRACT' | 'GENERAL';
export type CommsNetQuality = 'CLEAR' | 'DEGRADED' | 'CONTESTED';

interface CommsTopologyNet {
  id: string;
  label: string;
  code: string;
  discipline: string;
  eventId: string;
  nodeId?: string;
}

interface CommsTopologyMembership {
  memberProfileId: string;
  netId: string;
  speaking: boolean;
  muted: boolean;
}

interface CommsTopologyBridge {
  id: string;
  sourceNetId: string;
  targetNetId: string;
  status: string;
}

interface CommsTopologyCallout {
  id: string;
  eventId: string;
  netId: string;
  lane: string;
  priority: CommsPriority;
  message: string;
  createdDate: string | null;
}

interface CommsTopologyNetLoad {
  netId: string;
  participants: number;
  callouts: number;
  captions: number;
  trafficScore: number;
}

interface CommsTopologyDiscipline {
  mode: string;
  netId: string;
  eventId: string;
  updatedAt: string | null;
}

interface CommsTopologySpeakRequest {
  requestId: string;
  eventId: string;
  netId: string;
  requesterMemberProfileId: string;
  status: string;
  reason: string;
  createdDate: string | null;
  resolvedAt: string | null;
  resolvedByMemberProfileId: string;
}

interface CommsTopologyCommandBusEntry {
  id: string;
  eventId: string;
  netId: string;
  action: string;
  payload: Record<string, unknown>;
  actorMemberProfileId: string;
  createdDate: string | null;
}

export interface CommsTopologySnapshot {
  eventId: string;
  generatedAt: string | null;
  nets: CommsTopologyNet[];
  memberships: CommsTopologyMembership[];
  bridges: CommsTopologyBridge[];
  callouts: CommsTopologyCallout[];
  netLoad: CommsTopologyNetLoad[];
  discipline: CommsTopologyDiscipline | null;
  speakRequests: CommsTopologySpeakRequest[];
  commandBus: CommsTopologyCommandBusEntry[];
}

export interface MapCommsOverlayNet {
  id: string;
  label: string;
  code: string;
  eventId: string;
  nodeId: string;
  participants: number;
  speaking: number;
  muted: number;
  trafficScore: number;
  quality: CommsNetQuality;
  discipline: CommsNetDiscipline;
}

export interface MapCommsOverlayLink {
  id: string;
  fromNetId: string;
  toNetId: string;
  fromNodeId: string;
  toNodeId: string;
  status: 'active' | 'degraded';
}

export interface MapCommsOverlayCallout {
  id: string;
  eventId: string;
  netId: string;
  nodeId: string;
  lane: string;
  priority: CommsPriority;
  message: string;
  createdDate: string | null;
  ageSeconds: number;
  stale: boolean;
}

export interface MapCommsOverlaySpeakRequest {
  requestId: string;
  eventId: string;
  netId: string;
  nodeId: string;
  requesterMemberProfileId: string;
  status: string;
  reason: string;
  createdDate: string | null;
  resolvedAt: string | null;
  resolvedByMemberProfileId: string;
}

export interface MapCommsOverlayCommandBusEntry {
  id: string;
  eventId: string;
  netId: string;
  nodeId: string;
  action: string;
  payload: Record<string, unknown>;
  actorMemberProfileId: string;
  createdDate: string | null;
}

export interface MapCommsOverlay {
  generatedAt: string | null;
  scopedOpId: string;
  nets: MapCommsOverlayNet[];
  links: MapCommsOverlayLink[];
  callouts: MapCommsOverlayCallout[];
  discipline: CommsTopologyDiscipline | null;
  speakRequests: MapCommsOverlaySpeakRequest[];
  commandBus: MapCommsOverlayCommandBusEntry[];
}

interface BuildMapCommsOverlayInput {
  topology: CommsTopologySnapshot;
  opId?: string;
  focusOperationId?: string;
  operations?: Operation[];
  mapNodes: ReadonlyArray<MapNode>;
  nowMs?: number;
}

const CALL_OUT_STALE_AFTER_SECONDS = 15 * 60;
const DEFAULT_FALLBACK_NODE_IDS = [
  'system-stanton',
  'body-hurston',
  'body-arccorp',
  'body-crusader',
  'body-microtech',
  'system-pyro',
  'body-pyro-ii',
  'system-nyx',
];

function toText(value: unknown, fallback = ''): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function normalizeToken(value: unknown): string {
  return toText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toIso(value: unknown): string | null {
  const raw = toText(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function priority(value: unknown): CommsPriority {
  const token = toText(value).toUpperCase();
  if (token === 'CRITICAL') return 'CRITICAL';
  if (token === 'HIGH') return 'HIGH';
  return 'STANDARD';
}

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function netDiscipline(entry: CommsTopologyNet): CommsNetDiscipline {
  const discipline = normalizeToken(entry.discipline);
  if (discipline.includes('focus')) return 'FOCUSED';

  const labelCode = `${normalizeToken(entry.label)} ${normalizeToken(entry.code)}`;
  if (labelCode.includes('hangout') || labelCode.includes('lounge') || labelCode.includes('general')) return 'HANGOUT';
  if (labelCode.includes('contract') || labelCode.includes('trade')) return 'CONTRACT';
  return 'GENERAL';
}

function laneMatchesNet(lane: string, net: CommsTopologyNet): boolean {
  if (!lane) return false;
  const laneToken = normalizeToken(lane);
  if (!laneToken) return false;
  const label = normalizeToken(net.label);
  const code = normalizeToken(net.code);
  return label.includes(laneToken) || code.includes(laneToken) || laneToken.includes(label) || laneToken.includes(code);
}

function netQuality(trafficScore: number): CommsNetQuality {
  if (trafficScore >= 18) return 'CONTESTED';
  if (trafficScore >= 8) return 'DEGRADED';
  return 'CLEAR';
}

function buildNodeIndex(mapNodes: ReadonlyArray<MapNode>) {
  const byId = new Map<string, MapNode>();
  for (const node of mapNodes) {
    byId.set(node.id, node);
  }
  return byId;
}

function inferNodeIdFromLabel(label: string, mapNodes: ReadonlyArray<MapNode>): string | null {
  const needle = normalizeToken(label);
  if (!needle) return null;
  const found = mapNodes.find((node) => {
    const nodeLabel = normalizeToken(node.label);
    const systemTag = normalizeToken(node.systemTag);
    return (
      nodeLabel.includes(needle) ||
      needle.includes(nodeLabel) ||
      systemTag.includes(needle) ||
      needle.includes(systemTag)
    );
  });
  return found?.id || null;
}

function opNodeById(operations: Operation[] | undefined): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const operation of operations || []) {
    const opId = toText(operation.id);
    const nodeId = toText(operation.ao?.nodeId);
    if (opId && nodeId) lookup.set(opId, nodeId);
  }
  return lookup;
}

function resolveNetNodeId(
  net: CommsTopologyNet,
  input: {
    mapNodes: ReadonlyArray<MapNode>;
    mapNodeById: Map<string, MapNode>;
    opNodeLookup: Map<string, string>;
    scopedOpId: string;
    fallbackIndex: number;
  }
): string {
  const explicitNodeId = toText(net.nodeId);
  if (explicitNodeId && input.mapNodeById.has(explicitNodeId)) return explicitNodeId;

  if (net.eventId) {
    const opNode = input.opNodeLookup.get(net.eventId);
    if (opNode && input.mapNodeById.has(opNode)) return opNode;
  }

  const inferredFromLabel = inferNodeIdFromLabel(`${net.label} ${net.code}`, input.mapNodes);
  if (inferredFromLabel) return inferredFromLabel;

  if (input.scopedOpId) {
    const focusedNode = input.opNodeLookup.get(input.scopedOpId);
    if (focusedNode && input.mapNodeById.has(focusedNode)) return focusedNode;
  }

  const fallbackCandidates = DEFAULT_FALLBACK_NODE_IDS.filter((candidate) => input.mapNodeById.has(candidate));
  if (fallbackCandidates.length > 0) {
    return fallbackCandidates[input.fallbackIndex % fallbackCandidates.length];
  }
  return input.mapNodes[0]?.id || 'system-stanton';
}

function matchesScopedOperation(net: CommsTopologyNet, scopedOpId: string): boolean {
  if (!scopedOpId) return true;
  return toText(net.eventId) === scopedOpId;
}

function matchesScopedCallout(
  callout: CommsTopologyCallout,
  scopedOpId: string,
  scopedNetIds: Set<string>,
  nets: CommsTopologyNet[]
): boolean {
  if (!scopedOpId) return true;
  if (callout.eventId && callout.eventId === scopedOpId) return true;
  if (callout.netId && scopedNetIds.has(callout.netId)) return true;
  if (callout.lane) return nets.some((net) => scopedNetIds.has(net.id) && laneMatchesNet(callout.lane, net));
  return false;
}

export function createEmptyMapCommsOverlay(scopedOpId = ''): MapCommsOverlay {
  return {
    generatedAt: null,
    scopedOpId,
    nets: [],
    links: [],
    callouts: [],
    discipline: null,
    speakRequests: [],
    commandBus: [],
  };
}

export function extractCommsTopologySnapshot(payload: unknown): CommsTopologySnapshot {
  const data = (payload as any)?.data;
  const root = data || payload;
  const topology = (root as any)?.topology || {};

  const nets = asArray(topology.nets).map((entry: any) => ({
    id: toText(entry?.id),
    label: toText(entry?.label || entry?.name || entry?.code || entry?.id),
    code: toText(entry?.code || entry?.name || entry?.label || entry?.id),
    discipline: toText(entry?.discipline),
    eventId: toText(entry?.event_id || entry?.eventId || entry?.op_id || entry?.operation_id),
    nodeId: toText(
      entry?.node_id ||
      entry?.nodeId ||
      entry?.ao_node_id ||
      entry?.metadata?.nodeId
    ) || undefined,
  })).filter((entry) => Boolean(entry.id));

  const memberships = asArray(topology.memberships).map((entry: any) => ({
    memberProfileId: toText(entry?.member_profile_id || entry?.memberProfileId || entry?.user_id),
    netId: toText(entry?.net_id || entry?.netId),
    speaking: toBoolean(entry?.speaking),
    muted: toBoolean(entry?.muted),
  })).filter((entry) => Boolean(entry.memberProfileId && entry.netId));

  const bridges = asArray(topology.bridges).map((entry: any) => ({
    id: toText(entry?.id || `${toText(entry?.source_net_id || entry?.sourceNetId)}:${toText(entry?.target_net_id || entry?.targetNetId)}`),
    sourceNetId: toText(entry?.source_net_id || entry?.sourceNetId || entry?.net_a_id || entry?.from_net_id || entry?.fromNetId),
    targetNetId: toText(entry?.target_net_id || entry?.targetNetId || entry?.net_b_id || entry?.to_net_id || entry?.toNetId),
    status: toText(entry?.status, 'active').toLowerCase(),
  })).filter((entry) => Boolean(entry.sourceNetId && entry.targetNetId));

  const callouts = asArray(topology.callouts).map((entry: any) => ({
    id: toText(entry?.id || `${toText(entry?.lane)}:${toText(entry?.created_date || entry?.createdDate || entry?.created_at)}`),
    eventId: toText(entry?.event_id || entry?.eventId),
    netId: toText(entry?.net_id || entry?.netId),
    lane: toText(entry?.lane),
    priority: priority(entry?.priority),
    message: toText(entry?.message),
    createdDate: toIso(entry?.created_date || entry?.createdDate || entry?.created_at),
  }));

  const netLoad = asArray(topology.netLoad).map((entry: any) => ({
    netId: toText(entry?.net_id || entry?.netId),
    participants: Number(entry?.participants || 0),
    callouts: Number(entry?.callouts || 0),
    captions: Number(entry?.captions || 0),
    trafficScore: Number(entry?.traffic_score || entry?.trafficScore || 0),
  })).filter((entry) => Boolean(entry.netId));

  const disciplineRaw = topology.discipline || null;
  const discipline = disciplineRaw
    ? {
        mode: toText(disciplineRaw.mode || 'PTT').toUpperCase(),
        netId: toText(disciplineRaw.net_id || disciplineRaw.netId),
        eventId: toText(disciplineRaw.event_id || disciplineRaw.eventId),
        updatedAt: toIso(disciplineRaw.updated_at || disciplineRaw.updatedAt),
      }
    : null;

  const speakRequests = asArray(topology.speakRequests || topology.speak_requests).map((entry: any) => ({
    requestId: toText(entry?.request_id || entry?.requestId || entry?.id),
    eventId: toText(entry?.event_id || entry?.eventId),
    netId: toText(entry?.net_id || entry?.netId),
    requesterMemberProfileId: toText(entry?.requester_member_profile_id || entry?.requesterMemberProfileId),
    status: toText(entry?.status || 'PENDING').toUpperCase(),
    reason: toText(entry?.reason),
    createdDate: toIso(entry?.created_date || entry?.createdDate || entry?.created_at),
    resolvedAt: toIso(entry?.resolved_at || entry?.resolvedAt),
    resolvedByMemberProfileId: toText(entry?.resolved_by_member_profile_id || entry?.resolvedByMemberProfileId),
  })).filter((entry) => Boolean(entry.requestId));

  const commandBus = asArray(topology.commandBus || topology.command_bus).map((entry: any) => ({
    id: toText(entry?.id || entry?.command_id || entry?.commandId),
    eventId: toText(entry?.event_id || entry?.eventId),
    netId: toText(entry?.net_id || entry?.netId),
    action: toText(entry?.action || entry?.bus_action || entry?.busAction).toUpperCase(),
    payload: entry?.payload && typeof entry.payload === 'object' ? entry.payload : {},
    actorMemberProfileId: toText(entry?.actor_member_profile_id || entry?.actorMemberProfileId),
    createdDate: toIso(entry?.created_date || entry?.createdDate || entry?.published_at || entry?.publishedAt),
  })).filter((entry) => Boolean(entry.id));

  return {
    eventId: toText(topology.event_id || topology.eventId),
    generatedAt: toIso(topology.generated_at || topology.generatedAt),
    nets,
    memberships,
    bridges,
    callouts,
    netLoad,
    discipline,
    speakRequests,
    commandBus,
  };
}

export function buildMapCommsOverlay(input: BuildMapCommsOverlayInput): MapCommsOverlay {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const scopedOpId = toText(input.focusOperationId || input.opId);
  const mapNodeById = buildNodeIndex(input.mapNodes);
  const opNodeLookup = opNodeById(input.operations);
  const topology = input.topology;

  const scopedNets = topology.nets.filter((net) => matchesScopedOperation(net, scopedOpId));
  const scopedNetIds = new Set(scopedNets.map((net) => net.id));
  const memberships = topology.memberships.filter((entry) => scopedNetIds.has(entry.netId));
  const netLoadById = new Map(topology.netLoad.map((entry) => [entry.netId, entry]));

  const nets: MapCommsOverlayNet[] = scopedNets.map((net, netIndex) => {
    const netMemberships = memberships.filter((entry) => entry.netId === net.id);
    const speaking = netMemberships.filter((entry) => entry.speaking && !entry.muted).length;
    const muted = netMemberships.filter((entry) => entry.muted).length;
    const load = netLoadById.get(net.id);
    const participants = load ? Math.max(load.participants, netMemberships.length) : netMemberships.length;
    const trafficScore = load ? load.trafficScore : (participants + speaking + muted);
    return {
      id: net.id,
      label: net.label || net.code || net.id,
      code: net.code || net.id,
      eventId: net.eventId,
      nodeId: resolveNetNodeId(net, {
        mapNodes: input.mapNodes,
        mapNodeById,
        opNodeLookup,
        scopedOpId,
        fallbackIndex: netIndex,
      }),
      participants,
      speaking,
      muted,
      trafficScore,
      quality: netQuality(trafficScore),
      discipline: netDiscipline(net),
    };
  });

  const netById = new Map(nets.map((net) => [net.id, net]));

  const links: MapCommsOverlayLink[] = topology.bridges
    .filter((bridge) => netById.has(bridge.sourceNetId) && netById.has(bridge.targetNetId))
    .map((bridge) => {
      const source = netById.get(bridge.sourceNetId)!;
      const target = netById.get(bridge.targetNetId)!;
      return {
        id: bridge.id,
        fromNetId: source.id,
        toNetId: target.id,
        fromNodeId: source.nodeId,
        toNodeId: target.nodeId,
        status: bridge.status === 'degraded' ? 'degraded' : 'active',
      };
    });

  const callouts: MapCommsOverlayCallout[] = topology.callouts
    .filter((callout) => matchesScopedCallout(callout, scopedOpId, scopedNetIds, scopedNets))
    .map((callout) => {
      const resolvedNet =
        (callout.netId ? netById.get(callout.netId) : null) ||
        nets.find((net) => laneMatchesNet(callout.lane, {
          id: net.id,
          label: net.label,
          code: net.code,
          discipline: net.discipline,
          eventId: net.eventId,
        })) ||
        null;
      const createdMs = callout.createdDate ? new Date(callout.createdDate).getTime() : null;
      const ageSeconds = createdMs ? Math.max(0, Math.floor((nowMs - createdMs) / 1000)) : 0;
      const stale = ageSeconds >= CALL_OUT_STALE_AFTER_SECONDS;
      return {
        id: callout.id,
        eventId: callout.eventId,
        netId: resolvedNet?.id || '',
        nodeId: resolvedNet?.nodeId || (scopedOpId && opNodeLookup.get(scopedOpId)) || 'system-stanton',
        lane: callout.lane,
        priority: callout.priority,
        message: callout.message,
        createdDate: callout.createdDate,
        ageSeconds,
        stale,
      };
    })
    .filter((callout) => mapNodeById.has(callout.nodeId));

  const resolveNodeForNet = (netId: string): string => {
    const direct = netId ? netById.get(netId)?.nodeId : '';
    if (direct && mapNodeById.has(direct)) return direct;
    const scoped = scopedOpId ? opNodeLookup.get(scopedOpId) : '';
    if (scoped && mapNodeById.has(scoped)) return scoped;
    return input.mapNodes[0]?.id || 'system-stanton';
  };

  const speakRequests = topology.speakRequests
    .filter((entry) => {
      if (!scopedOpId) return true;
      if (entry.eventId && entry.eventId === scopedOpId) return true;
      return Boolean(entry.netId && scopedNetIds.has(entry.netId));
    })
    .map((entry) => ({
      requestId: entry.requestId,
      eventId: entry.eventId,
      netId: entry.netId,
      nodeId: resolveNodeForNet(entry.netId),
      requesterMemberProfileId: entry.requesterMemberProfileId,
      status: entry.status,
      reason: entry.reason,
      createdDate: entry.createdDate,
      resolvedAt: entry.resolvedAt,
      resolvedByMemberProfileId: entry.resolvedByMemberProfileId,
    }));

  const commandBus = topology.commandBus
    .filter((entry) => {
      if (!scopedOpId) return true;
      if (entry.eventId && entry.eventId === scopedOpId) return true;
      return Boolean(entry.netId && scopedNetIds.has(entry.netId));
    })
    .map((entry) => ({
      id: entry.id,
      eventId: entry.eventId,
      netId: entry.netId,
      nodeId: resolveNodeForNet(entry.netId),
      action: entry.action,
      payload: entry.payload,
      actorMemberProfileId: entry.actorMemberProfileId,
      createdDate: entry.createdDate,
    }));
  const discipline =
    topology.discipline &&
    (!scopedOpId ||
      topology.discipline.eventId === scopedOpId ||
      (topology.discipline.netId && scopedNetIds.has(topology.discipline.netId)))
      ? topology.discipline
      : null;

  return {
    generatedAt: topology.generatedAt,
    scopedOpId,
    nets,
    links,
    callouts,
    discipline,
    speakRequests,
    commandBus,
  };
}

