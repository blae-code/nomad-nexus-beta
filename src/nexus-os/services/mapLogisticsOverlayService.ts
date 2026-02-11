import type { MapNode } from '../schemas/mapSchemas';
import type { RouteHypothesis } from '../schemas/marketIntelSchemas';
import type { Operation, OperationEventStub } from '../schemas/opSchemas';
import { listRouteHypotheses } from './marketIntelService';
import { listOperationEvents } from './operationService';

export type MapLogisticsLaneKind = 'MOVE' | 'EXTRACT' | 'HOLD' | 'PATROL' | 'AVOID' | 'ROUTE_HYPOTHESIS';
export type MapLogisticsLaneSource = 'operation_event' | 'route_hypothesis';

export interface MapLogisticsLane {
  id: string;
  opId?: string;
  sourceKind: MapLogisticsLaneSource;
  laneKind: MapLogisticsLaneKind;
  label: string;
  fromNodeId: string;
  toNodeId: string;
  confidence: number;
  ageSeconds: number;
  stale: boolean;
  createdAt?: string;
}

export interface MapLogisticsOverlay {
  scopedOpId: string;
  generatedAt: string;
  lanes: MapLogisticsLane[];
}

interface BuildMapLogisticsOverlayInput {
  opId?: string;
  focusOperationId?: string;
  operations?: Operation[];
  mapNodes: ReadonlyArray<MapNode>;
  nowMs?: number;
  events?: OperationEventStub[];
  routeHypotheses?: RouteHypothesis[];
}

const LOGISTICS_EVENT_KINDS = new Set([
  'DECLARE_DEPARTURE',
  'DECLARE_ARRIVAL',
  'DECLARE_HOLD',
  'REQUEST_PATROL',
  'MARK_AVOID',
]);

function toText(value: unknown, fallback = ''): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function normalizeToken(value: unknown): string {
  return toText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parsePositiveNumber(value: unknown, fallback: number): number {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return fallback;
  return asNumber;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function eventKind(kind: string): MapLogisticsLaneKind {
  if (kind === 'DECLARE_DEPARTURE' || kind === 'DECLARE_ARRIVAL') return 'MOVE';
  if (kind === 'DECLARE_HOLD') return 'HOLD';
  if (kind === 'REQUEST_PATROL') return 'PATROL';
  if (kind === 'MARK_AVOID') return 'AVOID';
  return 'MOVE';
}

function parseRouteExpression(routeRaw: string): { fromToken?: string; toToken?: string } {
  const normalized = toText(routeRaw);
  if (!normalized) return {};
  if (normalized.includes('->')) {
    const [fromToken, toToken] = normalized.split('->').map((entry) => entry.trim());
    return { fromToken, toToken };
  }
  if (normalized.includes('=>')) {
    const [fromToken, toToken] = normalized.split('=>').map((entry) => entry.trim());
    return { fromToken, toToken };
  }
  if (/\bto\b/i.test(normalized)) {
    const [fromToken, toToken] = normalized.split(/\bto\b/i).map((entry) => entry.trim());
    return { fromToken, toToken };
  }
  return {};
}

function nodeByToken(token: string, mapNodes: ReadonlyArray<MapNode>): string | null {
  const needle = normalizeToken(token);
  if (!needle) return null;
  const exact = mapNodes.find((node) => normalizeToken(node.id) === needle || normalizeToken(node.label) === needle);
  if (exact) return exact.id;
  const partial = mapNodes.find((node) => {
    const nodeLabel = normalizeToken(node.label);
    return nodeLabel.includes(needle) || needle.includes(nodeLabel);
  });
  return partial?.id || null;
}

function resolveNodeId(raw: string, mapNodeById: Map<string, MapNode>, mapNodes: ReadonlyArray<MapNode>): string | null {
  const text = toText(raw);
  if (!text) return null;
  if (mapNodeById.has(text)) return text;
  return nodeByToken(text, mapNodes);
}

function scopedOpNode(
  scopedOpId: string,
  operations: Operation[] | undefined,
  mapNodeById: Map<string, MapNode>
): string | null {
  if (!scopedOpId) return null;
  const op = (operations || []).find((entry) => entry.id === scopedOpId);
  const nodeId = op?.ao?.nodeId || '';
  return nodeId && mapNodeById.has(nodeId) ? nodeId : null;
}

function selectEvents(scopedOpId: string, events?: OperationEventStub[]): OperationEventStub[] {
  const source = events || listOperationEvents(scopedOpId || undefined);
  if (!scopedOpId) return source;
  return source.filter((entry) => entry.opId === scopedOpId);
}

function laneFromOperationEvent(
  event: OperationEventStub,
  mapNodes: ReadonlyArray<MapNode>,
  mapNodeById: Map<string, MapNode>,
  fallbackNodeId: string | null,
  nowMs: number
): MapLogisticsLane | null {
  if (!LOGISTICS_EVENT_KINDS.has(event.kind)) return null;
  const payload = event.payload || {};
  const route = parseRouteExpression(toText(payload.route || payload.corridor || payload.routeTag));
  const fromNodeId =
    resolveNodeId(toText(payload.fromNodeId || payload.originNodeId || payload.from || payload.origin || route.fromToken), mapNodeById, mapNodes) ||
    fallbackNodeId;
  const toNodeId =
    resolveNodeId(toText(payload.toNodeId || payload.destinationNodeId || payload.to || payload.destination || payload.nodeId || event.nodeId || route.toToken), mapNodeById, mapNodes) ||
    fallbackNodeId ||
    fromNodeId;
  if (!fromNodeId || !toNodeId) return null;

  const createdMs = new Date(event.createdAt).getTime();
  const safeCreatedMs = Number.isFinite(createdMs) ? createdMs : nowMs;
  const ageSeconds = Math.max(0, Math.floor((nowMs - safeCreatedMs) / 1000));
  const ttlSeconds = parsePositiveNumber(payload.ttlSeconds || payload.ttl, 20 * 60);
  const confidence = clamp(Number(payload.confidence || 0.62), 0.25, 0.95);
  const laneKind = eventKind(event.kind);
  return {
    id: `logi:event:${event.id}`,
    opId: event.opId,
    sourceKind: 'operation_event',
    laneKind,
    label: toText(payload.label || payload.notes || event.kind.replaceAll('_', ' ')),
    fromNodeId,
    toNodeId,
    confidence,
    ageSeconds,
    stale: ageSeconds >= ttlSeconds,
    createdAt: event.createdAt,
  };
}

function laneFromRouteHypothesis(
  route: RouteHypothesis,
  mapNodeById: Map<string, MapNode>
): MapLogisticsLane | null {
  if (!mapNodeById.has(route.fromNodeId) || !mapNodeById.has(route.toNodeId)) return null;
  return {
    id: `logi:route:${route.fromNodeId}->${route.toNodeId}`,
    sourceKind: 'route_hypothesis',
    laneKind: 'ROUTE_HYPOTHESIS',
    label: toText(route.notes, 'Route hypothesis'),
    fromNodeId: route.fromNodeId,
    toNodeId: route.toNodeId,
    confidence: clamp(0.48 + Math.min(0.22, (route.derivedFrom?.length || 0) * 0.06), 0.3, 0.9),
    ageSeconds: 0,
    stale: false,
  };
}

export function createEmptyMapLogisticsOverlay(scopedOpId = ''): MapLogisticsOverlay {
  return {
    scopedOpId,
    generatedAt: new Date().toISOString(),
    lanes: [],
  };
}

export function buildMapLogisticsOverlay(input: BuildMapLogisticsOverlayInput): MapLogisticsOverlay {
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const scopedOpId = toText(input.focusOperationId || input.opId);
  const mapNodeById = new Map(input.mapNodes.map((node) => [node.id, node]));
  const fallbackNodeId = scopedOpNode(scopedOpId, input.operations, mapNodeById);
  const rawEvents = selectEvents(scopedOpId, input.events);

  const eventLanes = rawEvents
    .map((entry) => laneFromOperationEvent(entry, input.mapNodes, mapNodeById, fallbackNodeId, nowMs))
    .filter(Boolean) as MapLogisticsLane[];
  const routeLanes = (input.routeHypotheses || listRouteHypotheses())
    .map((entry) => laneFromRouteHypothesis(entry, mapNodeById))
    .filter(Boolean) as MapLogisticsLane[];

  const laneById = new Map<string, MapLogisticsLane>();
  for (const lane of [...eventLanes, ...routeLanes]) {
    if (scopedOpId && lane.opId && lane.opId !== scopedOpId) continue;
    if (!laneById.has(lane.id)) laneById.set(lane.id, lane);
  }

  const lanes = [...laneById.values()].sort((a, b) => {
    if (a.stale !== b.stale) return a.stale ? 1 : -1;
    if (a.ageSeconds !== b.ageSeconds) return a.ageSeconds - b.ageSeconds;
    return a.id.localeCompare(b.id);
  });

  return {
    scopedOpId,
    generatedAt: new Date(nowMs).toISOString(),
    lanes,
  };
}

