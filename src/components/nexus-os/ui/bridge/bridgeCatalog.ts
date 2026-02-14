import type { WorkbenchPresetId } from '../workbench/types';

export type ShellBridgeId = 'OPS' | 'INTEL' | 'INDUSTRY' | 'COMMERCE' | 'FITTING' | 'CRAFTING' | 'COMMAND';

export interface BridgeDefinition {
  id: ShellBridgeId;
  label: string;
  description: string;
}

export const BRIDGE_CATALOG: Readonly<BridgeDefinition[]> = [
  { id: 'OPS', label: 'Ops Bridge', description: 'Operational coordination and sequencing.' },
  { id: 'INTEL', label: 'Intel Bridge', description: 'Risk, signal, and evidence synthesis.' },
  { id: 'INDUSTRY', label: 'Industry Bridge', description: 'Extraction, processing, and throughput.' },
  { id: 'COMMERCE', label: 'Commerce Bridge', description: 'Trade, contracts, and value routing.' },
  { id: 'FITTING', label: 'Fitting Bridge', description: 'Loadout planning and readiness checks.' },
  { id: 'CRAFTING', label: 'Crafting Bridge', description: 'Build pipelines and material planning.' },
  { id: 'COMMAND', label: 'Command Bridge', description: 'Authority lane for strategic intent.' },
];

export const BRIDGE_DEFAULT_PRESET: Readonly<Record<ShellBridgeId, WorkbenchPresetId>> = {
  OPS: 'OPERATIONS_HUB',
  INTEL: 'WIDE_MESH',
  INDUSTRY: 'GRID_2X2',
  COMMERCE: 'GRID_3_COLUMN',
  FITTING: 'GRID_2X2',
  CRAFTING: 'OPERATIONS_HUB',
  COMMAND: 'COMMAND_LEFT',
};
