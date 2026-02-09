/**
 * Nexus OS Mobile + AR Schemas
 *
 * Guardrails:
 * - Mobile location sharing is explicit opt-in and TTL-bound.
 * - AR markers are assistive overlays, never authoritative telemetry.
 * - All mobile observations require provenance, confidence, and recency.
 */

import type { VisibilityScope } from './coreSchemas';

export type MobilePlatform = 'WEB_PWA' | 'IOS_NATIVE' | 'ANDROID_NATIVE' | 'UNKNOWN';

export interface DeviceTokenRecord {
  id: string;
  memberProfileId: string;
  platform: MobilePlatform;
  pushProvider: 'WEB_PUSH' | 'APNS' | 'FCM' | 'UNSPECIFIED';
  tokenPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  notes?: string;
}

export interface MobileGeoPosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  headingDeg?: number;
  speedMps?: number;
  capturedAt: string;
}

/**
 * Mobile location beacon for field situational awareness.
 * This is a user-declared mobile feed and must not be treated as omniscient truth.
 */
export interface MobileLocationBeacon {
  id: string;
  subjectId: string;
  opId?: string;
  scope: VisibilityScope;
  confidence: number;
  ttlSeconds: number;
  source: 'MOBILE_GPS' | 'MANUAL_AR_MARKER';
  position: MobileGeoPosition;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shared AR anchor for training/field overlays.
 */
export interface MobileArAnchor {
  id: string;
  label: string;
  opId?: string;
  createdBy: string;
  visibilityScope: VisibilityScope;
  confidence: number;
  ttlSeconds: number;
  position: MobileGeoPosition;
  createdAt: string;
  updatedAt: string;
  narrativeNote?: string;
}

export interface ArProjectedMarker {
  id: string;
  label: string;
  source: 'BEACON' | 'ANCHOR';
  confidence: number;
  distanceMeters: number;
  bearingDeg: number;
  relativeBearingDeg: number;
  screenX: number;
  ttlRemainingSeconds: number;
  stale: boolean;
}

