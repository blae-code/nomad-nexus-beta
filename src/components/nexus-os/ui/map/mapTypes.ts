import type { LocationEstimate } from '../../schemas/coreSchemas';
import type { ControlZone, MapNode } from '../../schemas/mapSchemas';
import type { Operation } from '../../schemas/opSchemas';

export interface RenderablePresence {
  id: string;
  nodeId: string;
  subjectId: string;
  displayState: LocationEstimate['displayState'];
  confidenceBand: LocationEstimate['confidenceBand'];
  confidence: number;
  ageSeconds: number;
  ttlRemainingSeconds: number;
  sourceType: string;
}

export interface MapRadialState {
  type: 'node' | 'intel' | 'zone';
  title: string;
  anchor: { x: number; y: number };
  nodeId?: string;
  intelId?: string;
  zoneId?: string;
}

export interface OpsOverlayNode {
  id: string;
  title: string;
  nodeId: string;
  isFocus: boolean;
  posture: Operation['posture'];
  status: Operation['status'];
}

export interface MapCommsAnchor {
  x: number;
  y: number;
  nodeId: string;
}

export interface TacticalMapSelectionState {
  selectedZone: ControlZone | null;
  selectedIntelId: string | null;
  selectedZoneId: string | null;
  activeRadial: MapRadialState | null;
}

export interface TacticalMapNodeFilters {
  showStations: boolean;
  showLagrange: boolean;
  showOmMarkers: boolean;
}

export type TacticalMapViewMode = 'SYSTEM' | 'PLANETARY' | 'LOCAL';

export type TacticalRenderableNode = MapNode;
