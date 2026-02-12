import type React from 'react';

export type WorkbenchPresetId = 'GRID_2X2' | 'GRID_3_COLUMN' | 'COMMAND_LEFT' | 'OPERATIONS_HUB' | 'WIDE_MESH';

export interface PanelSize {
  colSpan?: number;
  rowSpan?: number;
}

export interface WorkbenchPreset {
  id: WorkbenchPresetId;
  label: string;
  description: string;
  columns: number;
  minRowHeightPx: number;
}

export interface PanelRenderContext {
  panelId: string;
  bridgeId?: string;
}

export interface PanelDescriptor {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  status?: string;
  statusTone?: 'neutral' | 'active' | 'ok' | 'warning' | 'danger' | 'locked' | 'experimental';
  live?: boolean;
  defaultSize?: PanelSize;
  defaultSizeByPreset?: Partial<Record<WorkbenchPresetId, PanelSize>>;
  toolbar?: React.ReactNode | ((ctx: PanelRenderContext) => React.ReactNode);
  loading?: boolean;
  loadingLabel?: string;
}

export interface WorkbenchLayoutSnapshot {
  version: 1;
  presetId: WorkbenchPresetId;
  panelOrder: string[];
  panelSizes: Record<string, PanelSize>;
}

export interface WorkbenchLayoutSnapshotV2 {
  version: 2;
  schema: 'nexus-os-workbench';
  presetId: WorkbenchPresetId;
  panelOrder: string[];
  activePanelIds: string[];
  panelSizes: Record<string, PanelSize>;
  updatedAt: string;
}

export type AnyWorkbenchLayoutSnapshot = WorkbenchLayoutSnapshot | WorkbenchLayoutSnapshotV2;

export interface PanelPlacement {
  panelId: string;
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
}

export interface WorkbenchLayoutEngineState {
  presetId: WorkbenchPresetId;
  panelOrder: string[];
  activePanelIds: string[];
  panelSizes: Record<string, PanelSize>;
}

export interface WorkbenchA11yWarning {
  code: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface WorkbenchPerfSample {
  label: string;
  iterationCount: number;
  elapsedMs: number;
  avgMs: number;
}

export interface WorkbenchHarnessReport {
  a11yWarnings: WorkbenchA11yWarning[];
  perf: WorkbenchPerfSample;
}
