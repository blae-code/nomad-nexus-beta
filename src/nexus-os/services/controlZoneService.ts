/**
 * Control Zone Service (MVP)
 *
 * Explainable aggregation rules:
 * - A zone is a fading claim built from explicit signals.
 * - Signals decay by TTL; expired signals contribute zero control weight.
 * - Contestation increases as top controller claims converge.
 */

import {
  CONTROL_ZONE_DEFAULT_TTL_PROFILE_ID,
  getControlSignalDefaultTTLSeconds,
} from '../registries/ttlProfileRegistry';
import { clampConfidence } from '../schemas/coreSchemas';
import type {
  ControlSignal,
  ControlZone,
  ControlZoneScope,
  GeometryHint,
  ControlZoneControllerAssertion,
} from '../schemas/mapSchemas';

interface ZoneAccumulator {
  id: string;
  scope: ControlZoneScope;
  geometryHint: GeometryHint;
  signals: ControlSignal[];
  createdAtMs: number;
  updatedAtMs: number;
  orgWeights: Map<string, number>;
  orgWeightedConfidence: Map<string, number>;
}

interface ControlZoneCacheEntry {
  key: string;
  zones: ControlZone[];
  createdAtMs: number;
}

const CONTROL_ZONE_CACHE_WINDOW_MS = 2000;
const CONTROL_ZONE_CACHE_MAX_AGE_MS = 15000;
const controlZoneCache = new Map<string, ControlZoneCacheEntry>();

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function toMs(value: string, fallbackMs: number): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : fallbackMs;
}

function inferNodeId(signal: ControlSignal): string | undefined {
  if (signal.geometryHint?.nodeId) return signal.geometryHint.nodeId;
  if (!signal.sourceRef?.id) return undefined;
  const sourceId = String(signal.sourceRef.id);
  const atToken = sourceId.split('@')[1];
  if (atToken) return atToken.trim() || undefined;
  const parts = sourceId.split(':');
  return parts.length > 1 ? parts[parts.length - 1].trim() || undefined : undefined;
}

function resolveZoneIdentity(signal: ControlSignal): { zoneId: string; scope: ControlZoneScope; geometryHint: GeometryHint } {
  const scope = signal.scope || 'system';
  const nodeId = inferNodeId(signal);
  const geometryHint: GeometryHint = {
    nodeId,
    anchorX: signal.geometryHint?.anchorX,
    anchorY: signal.geometryHint?.anchorY,
  };
  const zoneId = `${scope}:${nodeId || 'unknown'}`;
  return { zoneId, scope, geometryHint };
}

function resolveSignalExpiryMs(signal: ControlSignal, nowMs: number): number {
  const explicit = toMs(signal.expiresAt, NaN);
  if (Number.isFinite(explicit)) return explicit;
  const occurredAtMs = toMs(signal.occurredAt, nowMs);
  const ttlSeconds = getControlSignalDefaultTTLSeconds(
    CONTROL_ZONE_DEFAULT_TTL_PROFILE_ID,
    signal.type,
    240
  );
  return occurredAtMs + ttlSeconds * 1000;
}

function signalSignature(signal: ControlSignal): string {
  return [
    signal.type,
    signal.sourceRef?.kind || '',
    signal.sourceRef?.id || '',
    signal.orgId || '',
    signal.scope || '',
    signal.geometryHint?.nodeId || '',
    String(signal.weight || 0),
    String(signal.confidence || 0),
    signal.occurredAt || '',
    signal.expiresAt || '',
  ].join('|');
}

function buildControlZoneCacheKey(signals: ControlSignal[], nowMs: number): string {
  const bucket = Math.floor(nowMs / CONTROL_ZONE_CACHE_WINDOW_MS);
  const signature = [...signals]
    .map(signalSignature)
    .sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))
    .join('::');
  return `${bucket}:${signature}`;
}

/**
 * Return decay-adjusted signal weight.
 * 1.0 means full contribution at or near occurrence time; 0 means expired.
 */
export function applyTTLDecay(signal: ControlSignal, nowMs = Date.now()): number {
  const occurredAtMs = toMs(signal.occurredAt, nowMs);
  const expiresAtMs = resolveSignalExpiryMs(signal, nowMs);
  if (expiresAtMs <= occurredAtMs) return 0;
  if (nowMs >= expiresAtMs) return 0;

  const lifetimeMs = expiresAtMs - occurredAtMs;
  const elapsedMs = Math.max(0, nowMs - occurredAtMs);
  const remainingRatio = 1 - elapsedMs / lifetimeMs;
  return Math.max(0, Number(signal.weight || 0) * clamp01(remainingRatio));
}

/**
 * Contestation grows when multiple controller claims are close in strength.
 * 0 = uncontested, 1 = fully contested overlap.
 */
export function deriveContestation(zone: Pick<ControlZone, 'assertedControllers'>): number {
  const ranked = [...(zone.assertedControllers || [])]
    .map((entry) => clamp01(entry.confidence))
    .sort((a, b) => b - a);

  if (ranked.length <= 1) return 0;
  const lead = ranked[0];
  const runnerUp = ranked[1];
  if (lead <= 0) return 0;
  return clamp01(1 - (lead - runnerUp) / lead);
}

function toControllerAssertions(acc: ZoneAccumulator): ControlZoneControllerAssertion[] {
  const assertions: ControlZoneControllerAssertion[] = [];
  for (const [orgId, weight] of acc.orgWeights.entries()) {
    if (weight <= 0) continue;
    const weightedConfidence = acc.orgWeightedConfidence.get(orgId) || 0;
    assertions.push({
      orgId,
      confidence: clampConfidence(weightedConfidence / weight, 0),
      updatedAt: new Date(acc.updatedAtMs).toISOString(),
    });
  }
  return assertions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Aggregate signals into per-zone fading claims.
 */
export function computeControlZones(signals: ControlSignal[], nowMs = Date.now()): ControlZone[] {
  if (!Array.isArray(signals) || signals.length === 0) return [];
  const cacheKey = buildControlZoneCacheKey(signals, nowMs);
  const cached = controlZoneCache.get(cacheKey);
  if (cached && nowMs - cached.createdAtMs <= CONTROL_ZONE_CACHE_MAX_AGE_MS) {
    return cached.zones;
  }
  const byZone = new Map<string, ZoneAccumulator>();

  for (const signal of signals) {
    const decayedWeight = applyTTLDecay(signal, nowMs);
    if (decayedWeight <= 0) continue;

    const occurredAtMs = toMs(signal.occurredAt, nowMs);
    const expiresAtMs = resolveSignalExpiryMs(signal, nowMs);
    const orgId = signal.orgId || 'ORG_UNSPECIFIED';
    const confidence = clampConfidence(signal.confidence);
    const { zoneId, scope, geometryHint } = resolveZoneIdentity(signal);

    if (!byZone.has(zoneId)) {
      byZone.set(zoneId, {
        id: zoneId,
        scope,
        geometryHint,
        signals: [],
        createdAtMs: occurredAtMs,
        updatedAtMs: occurredAtMs,
        orgWeights: new Map<string, number>(),
        orgWeightedConfidence: new Map<string, number>(),
      });
    }

    const zone = byZone.get(zoneId) as ZoneAccumulator;
    zone.signals.push({
      ...signal,
      expiresAt: new Date(expiresAtMs).toISOString(),
      scope,
      orgId,
      geometryHint,
    });
    zone.createdAtMs = Math.min(zone.createdAtMs, occurredAtMs);
    zone.updatedAtMs = Math.max(zone.updatedAtMs, occurredAtMs);
    zone.orgWeights.set(orgId, (zone.orgWeights.get(orgId) || 0) + decayedWeight);
    zone.orgWeightedConfidence.set(
      orgId,
      (zone.orgWeightedConfidence.get(orgId) || 0) + decayedWeight * confidence
    );
  }

  const zones: ControlZone[] = [];
  for (const acc of byZone.values()) {
    const assertedControllers = toControllerAssertions(acc);
    const zone: ControlZone = {
      id: acc.id,
      scope: acc.scope,
      geometryHint: acc.geometryHint,
      assertedControllers,
      contestationLevel: 0,
      signals: acc.signals.sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      ),
      ttlProfileId: CONTROL_ZONE_DEFAULT_TTL_PROFILE_ID,
      createdAt: new Date(acc.createdAtMs).toISOString(),
      updatedAt: new Date(acc.updatedAtMs).toISOString(),
    };
    zone.contestationLevel = deriveContestation(zone);
    zones.push(zone);
  }

  const sorted = zones.sort((a, b) => {
    const byContestation = b.contestationLevel - a.contestationLevel;
    if (byContestation !== 0) return byContestation;
    return a.id.localeCompare(b.id);
  });

  controlZoneCache.set(cacheKey, {
    key: cacheKey,
    zones: sorted,
    createdAtMs: nowMs,
  });
  if (controlZoneCache.size > 20) {
    const oldest = [...controlZoneCache.entries()].sort((a, b) => a[1].createdAtMs - b[1].createdAtMs)[0];
    if (oldest) controlZoneCache.delete(oldest[0]);
  }

  return sorted;
}
