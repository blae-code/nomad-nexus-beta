/**
 * Nexus OS Tactical Map Schemas
 *
 * Doctrine:
 * - Control is modeled as a fading claim, never binary certainty.
 * - No live telemetry assumptions; all spatial state must stay source-attributed.
 * - Every renderable spatial signal carries timestamp + TTL + confidence context.
 */

export type ControlZoneScope = 'system' | 'body' | 'region' | 'site';

export interface GeometryHint {
  nodeId?: string;
  anchorX?: number;
  anchorY?: number;
}

export interface ControlZoneControllerAssertion {
  orgId: string;
  confidence: number;
  updatedAt: string;
}

export type ControlSignalType =
  | 'PRESENCE_DECLARED'
  | 'CQB_EVENT'
  | 'LOGISTICS_FLOW'
  | 'INTEL_NOTE'
  | 'COMMAND_ENDORSEMENT'
  | 'OTHER';

export interface ControlSignalSourceRef {
  id: string;
  kind: string;
}

/**
 * Evidence item that can influence a ControlZone.
 * Signals are additive and decay over time to prevent stale certainty.
 */
export interface ControlSignal {
  type: ControlSignalType;
  sourceRef: ControlSignalSourceRef;
  weight: number;
  confidence: number;
  occurredAt: string;
  expiresAt: string;
  notes?: string;
  orgId?: string;
  scope?: ControlZoneScope;
  geometryHint?: GeometryHint;
}

/**
 * Aggregated control claim for a location anchor.
 * This is probabilistic and must always remain explainable via `signals`.
 */
export interface ControlZone {
  id: string;
  scope: ControlZoneScope;
  geometryHint: GeometryHint;
  assertedControllers: ControlZoneControllerAssertion[];
  contestationLevel: number;
  signals: ControlSignal[];
  ttlProfileId: string;
  createdAt: string;
  updatedAt: string;
}

export type MapNodeKind = 'system' | 'body' | 'site' | 'jump';

/**
 * Schematic node used by tactical map rendering.
 * Coordinates are normalized percentages (0..100), not world-space telemetry.
 */
export interface MapNode {
  id: string;
  label: string;
  kind: MapNodeKind;
  category?:
    | 'system'
    | 'planet'
    | 'moon'
    | 'station'
    | 'lagrange'
    | 'orbital-marker'
    | 'jump-point';
  systemTag: string;
  x: number;
  y: number;
  radius: number;
  importance?: 'primary' | 'secondary' | 'tertiary';
  parentId?: string;
}

export interface MapEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: 'jump' | 'route' | 'orbital';
  risk?: 'low' | 'medium' | 'high';
}

export type TacticalLayerId = 'presence' | 'ops' | 'intel' | 'comms' | 'logistics' | 'controlZones';

export interface MapLayerState {
  id: TacticalLayerId;
  enabled: boolean;
  params?: Record<string, unknown>;
}

export type TacticalMapMode = 'ESSENTIAL' | 'COMMAND' | 'FULL';

export type TacticalMapDockId =
  | 'SUMMARY'
  | 'INTEL'
  | 'COMMS'
  | 'LOGISTICS'
  | 'TIMELINE'
  | 'ACTIONS'
  | 'EVIDENCE';

export interface TacticalMapPreferences {
  mode: TacticalMapMode;
  dockId: TacticalMapDockId;
  layerDefaults: Partial<Record<TacticalLayerId, boolean>>;
  mapDetail: {
    showStations: boolean;
    showLagrange: boolean;
    showOmMarkers: boolean;
  };
}
