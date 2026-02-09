import type React from 'react';

export type WorkbenchPresetId = 'GRID_2X2' | 'GRID_3_COLUMN' | 'COMMAND_LEFT';

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
