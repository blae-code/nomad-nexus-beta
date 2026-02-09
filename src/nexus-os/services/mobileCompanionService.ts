/**
 * Mobile Companion Service (repository-pattern stub)
 *
 * Purpose:
 * - Track mobile device tokens, opt-in location beacons, and AR anchors.
 * - Provide deterministic AR marker projection without claiming live telemetry certainty.
 *
 * Notes:
 * - Persistence is local in this adapter. Add Base44 adapters later.
 * - TTL/confidence are required and enforced.
 */

import type { LocationEstimate } from '../schemas/coreSchemas';
import type {
  ArProjectedMarker,
  DeviceTokenRecord,
  MobileArAnchor,
  MobileGeoPosition,
  MobileLocationBeacon,
  MobilePlatform,
} from '../schemas/mobileSchemas';

interface DeviceTokenInput {
  memberProfileId: string;
  tokenPayload: Record<string, unknown>;
  platform?: MobilePlatform;
  pushProvider?: DeviceTokenRecord['pushProvider'];
  notes?: string;
}

interface MobileBeaconInput {
  subjectId: string;
  opId?: string;
  scope?: MobileLocationBeacon['scope'];
  confidence?: number;
  ttlSeconds?: number;
  source?: MobileLocationBeacon['source'];
  position: MobileGeoPosition;
}

interface MobileArAnchorInput {
  label: string;
  opId?: string;
  createdBy: string;
  visibilityScope?: MobileArAnchor['visibilityScope'];
  confidence?: number;
  ttlSeconds?: number;
  position: MobileGeoPosition;
  narrativeNote?: string;
}

interface MobileProjectionInput {
  viewerPosition: MobileGeoPosition;
  viewerHeadingDeg?: number;
  opId?: string;
  includeStale?: boolean;
}

interface MobileCompanionSnapshot {
  deviceTokens: DeviceTokenRecord[];
  beacons: MobileLocationBeacon[];
  anchors: MobileArAnchor[];
}

type MobileCompanionListener = (snapshot: MobileCompanionSnapshot) => void;

const STORAGE_KEY = 'nexus.mobileCompanion.v1';
const DEFAULT_TTL_SECONDS = 120;

let deviceTokenStore: DeviceTokenRecord[] = [];
let mobileBeaconStore: MobileLocationBeacon[] = [];
let mobileAnchorStore: MobileArAnchor[] = [];
const listeners = new Set<MobileCompanionListener>();

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function toMs(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampConfidence(value: number | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.65;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function createId(prefix: string, nowMs = Date.now()): string {
  return `${prefix}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function normalizePos(pos: MobileGeoPosition): MobileGeoPosition {
  return {
    latitude: Number(pos.latitude || 0),
    longitude: Number(pos.longitude || 0),
    accuracyMeters: Math.max(0, Number(pos.accuracyMeters || 0)),
    headingDeg: Number.isFinite(Number(pos.headingDeg)) ? Number(pos.headingDeg) : undefined,
    speedMps: Number.isFinite(Number(pos.speedMps)) ? Number(pos.speedMps) : undefined,
    capturedAt: pos.capturedAt || nowIso(),
  };
}

function sortByUpdatedDesc<T extends { updatedAt: string; id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const t = toMs(b.updatedAt) - toMs(a.updatedAt);
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });
}

function snapshot(): MobileCompanionSnapshot {
  return {
    deviceTokens: sortByUpdatedDesc(deviceTokenStore),
    beacons: sortByUpdatedDesc(mobileBeaconStore),
    anchors: sortByUpdatedDesc(mobileAnchorStore),
  };
}

function notify() {
  const next = snapshot();
  for (const listener of listeners) listener(next);
}

function persist() {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        deviceTokens: deviceTokenStore,
        beacons: mobileBeaconStore,
        anchors: mobileAnchorStore,
      })
    );
  } catch {
    // No-op. Persistence is best-effort.
  }
}

function hydrate() {
  if (!isBrowser()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    deviceTokenStore = Array.isArray(parsed?.deviceTokens) ? parsed.deviceTokens : [];
    mobileBeaconStore = Array.isArray(parsed?.beacons) ? parsed.beacons : [];
    mobileAnchorStore = Array.isArray(parsed?.anchors) ? parsed.anchors : [];
  } catch {
    // No-op. Start with empty stores.
  }
}

hydrate();

function ttlRemainingSeconds(updatedAt: string, ttlSeconds: number, nowMs: number): number {
  const remaining = Math.ceil((toMs(updatedAt) + ttlSeconds * 1000 - nowMs) / 1000);
  return Math.max(0, remaining);
}

function normalizeHeading(angleDeg: number): number {
  const base = angleDeg % 360;
  return base < 0 ? base + 360 : base;
}

function haversineMeters(a: MobileGeoPosition, b: MobileGeoPosition): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon), Math.sqrt(1 - sinLat * sinLat - Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon));
  return Math.max(0, r * c);
}

function bearingDegrees(a: MobileGeoPosition, b: MobileGeoPosition): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return normalizeHeading(toDeg(Math.atan2(y, x)));
}

function relativeBearing(targetBearing: number, headingDeg: number): number {
  const delta = normalizeHeading(targetBearing - normalizeHeading(headingDeg));
  if (delta > 180) return delta - 360;
  return delta;
}

export function registerMobileDeviceToken(input: DeviceTokenInput, nowMs = Date.now()): DeviceTokenRecord {
  const provider = input.pushProvider || 'UNSPECIFIED';
  const platform = input.platform || 'WEB_PWA';
  const existing = deviceTokenStore.find((entry) => {
    if (entry.memberProfileId !== input.memberProfileId) return false;
    const endpoint = String(entry.tokenPayload?.endpoint || '');
    return endpoint && endpoint === String(input.tokenPayload?.endpoint || '');
  });

  const next: DeviceTokenRecord = existing
    ? {
        ...existing,
        tokenPayload: input.tokenPayload,
        platform,
        pushProvider: provider,
        notes: input.notes,
        updatedAt: nowIso(nowMs),
        active: true,
      }
    : {
        id: createId('mobile_token', nowMs),
        memberProfileId: input.memberProfileId,
        platform,
        pushProvider: provider,
        tokenPayload: input.tokenPayload,
        createdAt: nowIso(nowMs),
        updatedAt: nowIso(nowMs),
        active: true,
        notes: input.notes,
      };

  deviceTokenStore = sortByUpdatedDesc(
    existing ? deviceTokenStore.map((entry) => (entry.id === existing.id ? next : entry)) : [next, ...deviceTokenStore]
  );
  persist();
  notify();
  return next;
}

export function listMobileDeviceTokens(memberProfileId?: string): DeviceTokenRecord[] {
  return sortByUpdatedDesc(deviceTokenStore).filter((entry) => {
    if (!memberProfileId) return true;
    return entry.memberProfileId === memberProfileId;
  });
}

export function publishMobileLocationBeacon(input: MobileBeaconInput, nowMs = Date.now()): MobileLocationBeacon {
  const ttlSeconds = Math.max(15, Number(input.ttlSeconds || DEFAULT_TTL_SECONDS));
  const confidence = clampConfidence(input.confidence);
  const existing = mobileBeaconStore.find(
    (entry) => entry.subjectId === input.subjectId && entry.opId === input.opId && entry.source === (input.source || 'MOBILE_GPS')
  );

  const next: MobileLocationBeacon = existing
    ? {
        ...existing,
        position: normalizePos(input.position),
        confidence,
        ttlSeconds,
        scope: input.scope || existing.scope,
        updatedAt: nowIso(nowMs),
      }
    : {
        id: createId('mobile_beacon', nowMs),
        subjectId: input.subjectId,
        opId: input.opId,
        scope: input.scope || 'OP',
        confidence,
        ttlSeconds,
        source: input.source || 'MOBILE_GPS',
        position: normalizePos(input.position),
        createdAt: nowIso(nowMs),
        updatedAt: nowIso(nowMs),
      };

  mobileBeaconStore = sortByUpdatedDesc(
    existing ? mobileBeaconStore.map((entry) => (entry.id === existing.id ? next : entry)) : [next, ...mobileBeaconStore]
  );
  persist();
  notify();
  return next;
}

export function listMobileLocationBeacons(filters: { opId?: string; includeStale?: boolean } = {}, nowMs = Date.now()): MobileLocationBeacon[] {
  return sortByUpdatedDesc(mobileBeaconStore).filter((entry) => {
    if (filters.opId && entry.opId !== filters.opId) return false;
    if (filters.includeStale) return true;
    return ttlRemainingSeconds(entry.updatedAt, entry.ttlSeconds, nowMs) > 0;
  });
}

export function createMobileArAnchor(input: MobileArAnchorInput, nowMs = Date.now()): MobileArAnchor {
  const anchor: MobileArAnchor = {
    id: createId('ar_anchor', nowMs),
    label: input.label.trim() || 'AR Anchor',
    opId: input.opId,
    createdBy: input.createdBy,
    visibilityScope: input.visibilityScope || 'OP',
    confidence: clampConfidence(input.confidence),
    ttlSeconds: Math.max(30, Number(input.ttlSeconds || 600)),
    position: normalizePos(input.position),
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
    narrativeNote: input.narrativeNote,
  };
  mobileAnchorStore = sortByUpdatedDesc([anchor, ...mobileAnchorStore]);
  persist();
  notify();
  return anchor;
}

export function listMobileArAnchors(filters: { opId?: string; includeStale?: boolean } = {}, nowMs = Date.now()): MobileArAnchor[] {
  return sortByUpdatedDesc(mobileAnchorStore).filter((entry) => {
    if (filters.opId && entry.opId !== filters.opId) return false;
    if (filters.includeStale) return true;
    return ttlRemainingSeconds(entry.updatedAt, entry.ttlSeconds, nowMs) > 0;
  });
}

export function projectArMarkers(input: MobileProjectionInput, nowMs = Date.now()): ArProjectedMarker[] {
  const heading = Number.isFinite(Number(input.viewerHeadingDeg)) ? normalizeHeading(Number(input.viewerHeadingDeg)) : 0;
  const beacons = listMobileLocationBeacons({ opId: input.opId, includeStale: input.includeStale }, nowMs);
  const anchors = listMobileArAnchors({ opId: input.opId, includeStale: input.includeStale }, nowMs);

  const projectedBeacons = beacons.map<ArProjectedMarker>((beacon) => {
    const distanceMeters = haversineMeters(input.viewerPosition, beacon.position);
    const bearingDeg = bearingDegrees(input.viewerPosition, beacon.position);
    const relativeBearingDeg = relativeBearing(bearingDeg, heading);
    const x = Math.max(6, Math.min(94, 50 + (relativeBearingDeg / 90) * 42));
    return {
      id: beacon.id,
      label: beacon.subjectId,
      source: 'BEACON',
      confidence: beacon.confidence,
      distanceMeters: Math.round(distanceMeters),
      bearingDeg,
      relativeBearingDeg,
      screenX: x,
      ttlRemainingSeconds: ttlRemainingSeconds(beacon.updatedAt, beacon.ttlSeconds, nowMs),
      stale: ttlRemainingSeconds(beacon.updatedAt, beacon.ttlSeconds, nowMs) <= 0,
    };
  });

  const projectedAnchors = anchors.map<ArProjectedMarker>((anchor) => {
    const distanceMeters = haversineMeters(input.viewerPosition, anchor.position);
    const bearingDeg = bearingDegrees(input.viewerPosition, anchor.position);
    const relativeBearingDeg = relativeBearing(bearingDeg, heading);
    const x = Math.max(6, Math.min(94, 50 + (relativeBearingDeg / 90) * 42));
    return {
      id: anchor.id,
      label: anchor.label,
      source: 'ANCHOR',
      confidence: anchor.confidence,
      distanceMeters: Math.round(distanceMeters),
      bearingDeg,
      relativeBearingDeg,
      screenX: x,
      ttlRemainingSeconds: ttlRemainingSeconds(anchor.updatedAt, anchor.ttlSeconds, nowMs),
      stale: ttlRemainingSeconds(anchor.updatedAt, anchor.ttlSeconds, nowMs) <= 0,
    };
  });

  return [...projectedBeacons, ...projectedAnchors].sort((a, b) => {
    const byDistance = a.distanceMeters - b.distanceMeters;
    if (byDistance !== 0) return byDistance;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Converts a mobile beacon to canonical LocationEstimate shape for map/report pipelines.
 */
export function mobileBeaconToLocationEstimate(beacon: MobileLocationBeacon): LocationEstimate {
  return {
    subjectId: beacon.subjectId,
    bestGuessLocation: {
      region: `GPS:${beacon.position.latitude.toFixed(5)},${beacon.position.longitude.toFixed(5)}`,
      site: beacon.opId ? `OP ${beacon.opId}` : 'Field Position',
    },
    confidence: clampConfidence(beacon.confidence),
    sources: [
      {
        sourceId: beacon.id,
        sourceType: beacon.source === 'MOBILE_GPS' ? 'MOBILE_GPS' : 'AR_ANCHOR',
        observedAt: beacon.position.capturedAt,
        confidence: clampConfidence(beacon.confidence),
        notes: 'Mobile companion location share (consent-bound).',
      },
    ],
    mode: beacon.source === 'MOBILE_GPS' ? 'DECLARED' : 'INFERRED',
    updatedAt: beacon.updatedAt,
    ttlSeconds: beacon.ttlSeconds,
    visibilityScope: beacon.scope,
  };
}

export function subscribeMobileCompanion(listener: MobileCompanionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetMobileCompanionState() {
  deviceTokenStore = [];
  mobileBeaconStore = [];
  mobileAnchorStore = [];
  persist();
  notify();
}

