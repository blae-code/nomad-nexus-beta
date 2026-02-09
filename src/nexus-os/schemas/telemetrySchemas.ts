/**
 * Telemetry and Operation Log Schemas
 *
 * Doctrine:
 * - Telemetry is source-attributed and never treated as omniscient truth.
 * - Distress/rescue signals are prioritized over vanity/combat metrics.
 * - Every non-user truth includes timestamp, TTL, confidence, and scope.
 */

import type { ControlSignalType } from './mapSchemas';
import type { VisibilityScope } from './coreSchemas';

export type TelemetryEventType =
  | 'UNIT_POSITION'
  | 'UNIT_STATUS'
  | 'UNIT_HEALTH'
  | 'UNIT_DOWN'
  | 'MEDEVAC_REQUESTED'
  | 'SHOTS_FIRED'
  | 'OBJECTIVE_PROGRESS'
  | 'OBJECTIVE_COMPLETE'
  | 'EXTRACTION_STARTED'
  | 'EXTRACTION_COMPLETE'
  | 'DISTRESS_SIGNAL'
  | 'COMMS_STATUS'
  | 'CUSTOM';

export type TelemetrySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type OperationLogCategory = 'status' | 'incident' | 'objective' | 'movement' | 'comms' | 'system';
export type TelemetrySourceType = 'GAME_FEED' | 'SIM_PLAYBACK' | 'MANUAL_OVERRIDE' | 'EXTERNAL_API';
export type TelemetryConnectionState = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNKNOWN';

export interface TelemetryPosition {
  lat?: number;
  lng?: number;
  x?: number;
  y?: number;
  z?: number;
  nodeId?: string;
  system?: string;
  body?: string;
  region?: string;
  site?: string;
}

export interface TelemetrySourceTrace {
  sourceType: TelemetrySourceType;
  sourceId: string;
  integrationId?: string;
  gameVersion?: string;
  importedAt: string;
  confidence: number;
  authenticated?: boolean;
}

/**
 * Canonical operation timeline log record for telemetry + structured incident flow.
 * This schema is additive and can be persisted via Base44 OperationLog or EventLog fallback.
 */
export interface OperationLogRecord {
  id: string;
  operationId?: string;
  externalSessionId?: string;
  timestamp: string;
  eventType: TelemetryEventType;
  category: OperationLogCategory;
  severity: TelemetrySeverity;
  narrative: string;
  details: Record<string, unknown>;
  source: TelemetrySourceTrace;
  confidence: number;
  ttlSeconds: number;
  visibilityScope: VisibilityScope;
  rescuePriority: boolean;
  position?: TelemetryPosition;
}

export interface TelemetryRawEvent {
  id?: string;
  occurredAt?: string;
  eventType: string;
  callsign?: string;
  subjectId?: string;
  position?: TelemetryPosition;
  visibilityScope?: VisibilityScope;
  confidence?: number;
  ttlSeconds?: number;
  severity?: TelemetrySeverity;
  details?: Record<string, unknown>;
  narrative?: string;
}

export interface TelemetryIngestEnvelope {
  operationId?: string;
  externalSessionId?: string;
  integrationId?: string;
  sourceId: string;
  sourceType?: TelemetrySourceType;
  gameVersion?: string;
  emittedAt?: string;
  events: TelemetryRawEvent[];
}

export interface TelemetryIngestResult {
  acceptedCount: number;
  droppedCount: number;
  warnings: string[];
  alerts: TelemetryAlert[];
}

export interface GameIntegrationConfig {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  sourceType: TelemetrySourceType;
  endpoint?: string;
  ingestKeyHint?: string;
  operationId?: string;
  externalSessionId?: string;
  defaultVisibilityScope: VisibilityScope;
  defaultConfidence: number;
  defaultTTLSeconds: number;
  createdAt: string;
  updatedAt: string;
  lastHeartbeatAt?: string;
}

export interface TelemetrySessionLink {
  id: string;
  operationId?: string;
  externalSessionId: string;
  integrationId?: string;
  telemetrySource?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TelemetryAlert {
  id: string;
  operationId?: string;
  severity: TelemetrySeverity;
  title: string;
  message: string;
  eventType: TelemetryEventType;
  createdAt: string;
  ttlSeconds: number;
  position?: TelemetryPosition;
}

export interface TelemetryDiagnostics {
  generatedAt: string;
  operationId?: string;
  connectionState: TelemetryConnectionState;
  eventsPerMinute: number;
  rescueAlertsInWindow: number;
  staleEventCount: number;
  unscopedPercent: number;
  criticalEventCount: number;
}

export interface TelemetryMapSnapshot {
  statuses: Array<Record<string, unknown>>;
  incidents: Array<Record<string, unknown>>;
  commands: Array<Record<string, unknown>>;
}

export interface TelemetryEventMappingRule {
  externalEventType: string;
  telemetryEventType: TelemetryEventType;
  category: OperationLogCategory;
  defaultSeverity: TelemetrySeverity;
  defaultTTLSeconds: number;
  defaultConfidence: number;
  rescuePriority: boolean;
  controlSignalType?: ControlSignalType;
}
