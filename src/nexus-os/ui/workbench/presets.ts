import type { WorkbenchPreset, WorkbenchPresetId } from './types';

export const WORKBENCH_PRESETS: Readonly<Record<WorkbenchPresetId, WorkbenchPreset>> = {
  GRID_2X2: {
    id: 'GRID_2X2',
    label: '2x2 Grid',
    description: 'Balanced command workspace with equal-sized panels.',
    columns: 2,
    minRowHeightPx: 220,
  },
  GRID_3_COLUMN: {
    id: 'GRID_3_COLUMN',
    label: '3-Column',
    description: 'Wide scan layout for simultaneous light panels.',
    columns: 3,
    minRowHeightPx: 220,
  },
  COMMAND_LEFT: {
    id: 'COMMAND_LEFT',
    label: 'Command Left',
    description: 'Priority lane on left with supporting right-side panels.',
    columns: 3,
    minRowHeightPx: 220,
  },
};

export const DEFAULT_WORKBENCH_PRESET_ID: WorkbenchPresetId = 'GRID_2X2';

