import type { PanelSize, WorkbenchPresetId } from '../ui/workbench/types';

export interface WorkspaceActivityOption {
  id: string;
  label: string;
  description: string;
  activityTags: string[];
  preferredRoles: string[];
}

export interface WorkspaceActivityPackRecommendation {
  id: string;
  label: string;
  description: string;
  presetId: WorkbenchPresetId;
  panelIds: string[];
  panelSizes?: Record<string, PanelSize>;
  matchedTags: string[];
  score: number;
}

interface WorkspaceActivityPackTemplate {
  id: string;
  label: string;
  description: string;
  presetId: WorkbenchPresetId;
  panelIds: string[];
  panelSizes?: Record<string, PanelSize>;
  matchTags: string[];
}

export const WORKSPACE_ACTIVITY_OPTIONS: ReadonlyArray<WorkspaceActivityOption> = [
  {
    id: 'salvaging',
    label: 'Salvaging',
    description: 'Recovery loops, wreck harvesting, and field logistics.',
    activityTags: ['salvage', 'recovery', 'tractor', 'scrap'],
    preferredRoles: ['salvager', 'tractor-operator', 'hauler'],
  },
  {
    id: 'mining',
    label: 'Mining',
    description: 'Resource scanning, extraction runs, and refinery planning.',
    activityTags: ['mining', 'resource', 'refinery', 'prospecting'],
    preferredRoles: ['miner', 'scanner', 'hauler'],
  },
  {
    id: 'hauling',
    label: 'Hauling',
    description: 'Cargo routing, convoy support, and delivery execution.',
    activityTags: ['hauling', 'cargo', 'logistics', 'trade'],
    preferredRoles: ['hauler', 'escort', 'dispatcher'],
  },
  {
    id: 'combat',
    label: 'Combat',
    description: 'Security patrols, high-risk engagements, and support fire.',
    activityTags: ['combat', 'security', 'escort', 'strike'],
    preferredRoles: ['pilot', 'gunner', 'lead'],
  },
  {
    id: 'exploration',
    label: 'Exploration',
    description: 'Recon sweeps, map intelligence, and route discovery.',
    activityTags: ['exploration', 'recon', 'scouting', 'survey'],
    preferredRoles: ['scout', 'navigator', 'intel'],
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Medical, comms, and coordination support roles.',
    activityTags: ['support', 'medical', 'comms', 'coordination'],
    preferredRoles: ['medic', 'comms', 'coordinator'],
  },
];

const WORKSPACE_ACTIVITY_PACKS: ReadonlyArray<WorkspaceActivityPackTemplate> = [
  {
    id: 'pack-salvage-loop',
    label: 'Salvage Recovery Deck',
    description: 'Recovery-first staging for wreck assessment, routing, and handoff.',
    presetId: 'GRID_3_COLUMN',
    panelIds: ['panel-tactical-map', 'panel-loop-feed', 'panel-mobile-companion', 'panel-comms-peek'],
    panelSizes: {
      'panel-tactical-map': { colSpan: 2, rowSpan: 2 },
    },
    matchTags: ['salvage', 'recovery', 'tractor', 'scrap'],
  },
  {
    id: 'pack-mining-yield',
    label: 'Mining Yield Board',
    description: 'Extraction loop workspace for scan, route, and throughput tracking.',
    presetId: 'OPERATIONS_HUB',
    panelIds: ['panel-loop-teamtiles', 'panel-loop-feed', 'panel-tactical-map', 'panel-system-health'],
    panelSizes: {
      'panel-loop-teamtiles': { colSpan: 2, rowSpan: 2 },
      'panel-tactical-map': { colSpan: 2, rowSpan: 2 },
    },
    matchTags: ['mining', 'resource', 'refinery', 'prospecting'],
  },
  {
    id: 'pack-logistics-convoy',
    label: 'Logistics Convoy Deck',
    description: 'Cargo and convoy layout for delivery rhythm and escort coverage.',
    presetId: 'COMMAND_LEFT',
    panelIds: ['panel-command-focus', 'panel-comms-peek', 'panel-mobile-companion', 'panel-tactical-map'],
    panelSizes: {
      'panel-tactical-map': { colSpan: 2, rowSpan: 2 },
    },
    matchTags: ['hauling', 'cargo', 'logistics', 'trade', 'convoy'],
  },
  {
    id: 'pack-combat-response',
    label: 'Combat Response Deck',
    description: 'Fast-response configuration for active engagements and threat pivots.',
    presetId: 'WIDE_MESH',
    panelIds: ['panel-action-console', 'panel-loop-macropad', 'panel-comms-peek', 'panel-tactical-map', 'panel-system-health'],
    panelSizes: {
      'panel-tactical-map': { colSpan: 2, rowSpan: 2 },
    },
    matchTags: ['combat', 'security', 'escort', 'strike', 'gunner'],
  },
  {
    id: 'pack-exploration-recon',
    label: 'Exploration Recon Deck',
    description: 'Survey-focused board for pathfinding, intel refresh, and comms relays.',
    presetId: 'GRID_3_COLUMN',
    panelIds: ['panel-tactical-map', 'panel-loop-feed', 'panel-comms-peek', 'panel-mobile-companion'],
    panelSizes: {
      'panel-tactical-map': { colSpan: 2, rowSpan: 2 },
    },
    matchTags: ['exploration', 'recon', 'scouting', 'survey', 'intel'],
  },
  {
    id: 'pack-command-general',
    label: 'General Operations Deck',
    description: 'Balanced starter for broad operational planning and execution loops.',
    presetId: 'GRID_2X2',
    panelIds: ['panel-command-focus', 'panel-tactical-map', 'panel-comms-peek', 'panel-mobile-companion'],
    panelSizes: {
      'panel-tactical-map': { colSpan: 2, rowSpan: 2 },
    },
    matchTags: ['general', 'operations', 'planning', 'support'],
  },
];

function normalizeToken(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 48);
}

function normalizeTokenList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const next = value.map((entry) => normalizeToken(entry)).filter(Boolean);
  return [...new Set(next)];
}

function scorePack(tags: string[], pack: WorkspaceActivityPackTemplate): { score: number; matchedTags: string[] } {
  if (tags.length === 0) {
    return {
      score: pack.id === 'pack-command-general' ? 1 : 0,
      matchedTags: [],
    };
  }

  const matchedTags: string[] = [];
  let score = 0;
  for (const matchTagRaw of pack.matchTags) {
    const matchTag = normalizeToken(matchTagRaw);
    if (!matchTag) continue;
    const matched = tags.some((tag) => tag === matchTag || tag.includes(matchTag) || matchTag.includes(tag));
    if (!matched) continue;
    matchedTags.push(matchTag);
    score += 5;
  }
  if (matchedTags.length > 0) score += Math.min(3, matchedTags.length);
  return { score, matchedTags };
}

function fallbackPanels(availablePanelIds: string[]): string[] {
  if (availablePanelIds.length === 0) return [];
  const preferred = availablePanelIds.filter((panelId) => {
    const token = normalizeToken(panelId);
    return (
      token.includes('command') ||
      token.includes('map') ||
      token.includes('comms') ||
      token.includes('feed') ||
      token.includes('team')
    );
  });
  const pool = preferred.length >= 3 ? preferred : availablePanelIds;
  return pool.slice(0, Math.min(4, pool.length));
}

export function deriveWorkspacePreferenceFromOnboarding(selectedActivityIds: unknown): {
  activityTags: string[];
  preferredRoles: string[];
} {
  const selected = normalizeTokenList(selectedActivityIds);
  const options = WORKSPACE_ACTIVITY_OPTIONS.filter((option) => selected.includes(option.id));
  const activityTags = [...new Set(options.flatMap((option) => option.activityTags.map((tag) => normalizeToken(tag))))].filter(Boolean);
  const preferredRoles = [...new Set(options.flatMap((option) => option.preferredRoles.map((role) => normalizeToken(role))))].filter(Boolean);
  return {
    activityTags,
    preferredRoles,
  };
}

export function recommendWorkspaceActivityPacks(input: {
  activityTags?: unknown;
  availablePanelIds?: string[];
  maxPacks?: number;
}): WorkspaceActivityPackRecommendation[] {
  const tags = normalizeTokenList(input.activityTags);
  const available = Array.isArray(input.availablePanelIds) ? input.availablePanelIds.filter(Boolean) : [];
  const availableSet = new Set(available);
  const maxPacks = Math.max(1, Math.min(6, Number(input.maxPacks) || 3));

  const ranked = WORKSPACE_ACTIVITY_PACKS.map((pack) => {
    const { score, matchedTags } = scorePack(tags, pack);
    const panelIds = pack.panelIds.filter((panelId) => availableSet.has(panelId));
    const panelSizes = Object.fromEntries(
      Object.entries(pack.panelSizes || {}).filter(([panelId]) => availableSet.has(panelId))
    );
    return {
      id: pack.id,
      label: pack.label,
      description: pack.description,
      presetId: pack.presetId,
      panelIds,
      panelSizes: Object.keys(panelSizes).length > 0 ? panelSizes : undefined,
      matchedTags,
      score,
    } satisfies WorkspaceActivityPackRecommendation;
  })
    .filter((pack) => pack.panelIds.length > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  const positive = ranked.filter((pack) => pack.score > 0);
  if (positive.length > 0) return positive.slice(0, maxPacks);

  const defaults = ranked.filter((pack) => pack.id === 'pack-command-general');
  if (defaults.length > 0) return defaults.slice(0, maxPacks);

  const fallback = fallbackPanels(available);
  if (fallback.length === 0) return [];
  return [
    {
      id: 'pack-fallback',
      label: 'Starter Deck',
      description: 'Core starter layout generated from currently registered panels.',
      presetId: 'GRID_2X2',
      panelIds: fallback,
      matchedTags: [],
      score: 0,
    },
  ];
}

