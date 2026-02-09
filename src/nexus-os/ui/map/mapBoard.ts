import type { MapEdge, MapNode } from '../../schemas/mapSchemas';
import type { SpatialLocation } from '../../schemas/coreSchemas';

function normalizeToken(value: string | undefined): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export const TACTICAL_MAP_NODES: Readonly<MapNode[]> = [
  { id: 'system-stanton', label: 'Stanton', kind: 'system', systemTag: 'STANTON', x: 50, y: 56, radius: 7 },
  { id: 'system-pyro', label: 'Pyro', kind: 'system', systemTag: 'PYRO', x: 80, y: 30, radius: 7 },
  { id: 'system-nyx', label: 'Nyx', kind: 'system', systemTag: 'NYX', x: 20, y: 28, radius: 7 },
  { id: 'system-terra', label: 'Terra', kind: 'system', systemTag: 'TERRA', x: 56, y: 14, radius: 7 },

  { id: 'body-hurston', label: 'Hurston', kind: 'body', systemTag: 'STANTON', x: 59, y: 50, radius: 3.5, parentId: 'system-stanton' },
  { id: 'body-arccorp', label: 'ArcCorp', kind: 'body', systemTag: 'STANTON', x: 58, y: 64, radius: 3.5, parentId: 'system-stanton' },
  { id: 'body-crusader', label: 'Crusader', kind: 'body', systemTag: 'STANTON', x: 42, y: 61, radius: 3.5, parentId: 'system-stanton' },
  { id: 'body-microtech', label: 'microTech', kind: 'body', systemTag: 'STANTON', x: 43, y: 49, radius: 3.5, parentId: 'system-stanton' },

  { id: 'body-pyro-i', label: 'Pyro I', kind: 'body', systemTag: 'PYRO', x: 85, y: 24, radius: 3.2, parentId: 'system-pyro' },
  { id: 'body-pyro-ii', label: 'Pyro II', kind: 'body', systemTag: 'PYRO', x: 87, y: 35, radius: 3.2, parentId: 'system-pyro' },
  { id: 'body-pyro-iv', label: 'Pyro IV', kind: 'body', systemTag: 'PYRO', x: 73, y: 35, radius: 3.2, parentId: 'system-pyro' },

  { id: 'body-delamar', label: 'Delamar', kind: 'body', systemTag: 'NYX', x: 24, y: 32, radius: 3.2, parentId: 'system-nyx' },
];

export const TACTICAL_MAP_EDGES: Readonly<MapEdge[]> = [
  { id: 'edge-jump-stanton-pyro', fromNodeId: 'system-stanton', toNodeId: 'system-pyro', kind: 'jump', risk: 'high' },
  { id: 'edge-jump-stanton-nyx', fromNodeId: 'system-stanton', toNodeId: 'system-nyx', kind: 'jump', risk: 'medium' },
  { id: 'edge-jump-stanton-terra', fromNodeId: 'system-stanton', toNodeId: 'system-terra', kind: 'jump', risk: 'low' },
];

export const TACTICAL_MAP_NODE_BY_ID: Readonly<Record<string, MapNode>> = Object.freeze(
  TACTICAL_MAP_NODES.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {} as Record<string, MapNode>)
);

export function findMapNodeForLocation(location: SpatialLocation | undefined): MapNode | null {
  if (!location) return null;
  const bySite = normalizeToken(location.site);
  const byRegion = normalizeToken(location.region);
  const byBody = normalizeToken(location.body);
  const bySystem = normalizeToken(location.system);

  const bodyOrSite = TACTICAL_MAP_NODES.find((node) => {
    if (node.kind !== 'body' && node.kind !== 'site') return false;
    const token = normalizeToken(node.label);
    return token === bySite || token === byRegion || token === byBody;
  });
  if (bodyOrSite) return bodyOrSite;

  const system = TACTICAL_MAP_NODES.find((node) => {
    if (node.kind !== 'system') return false;
    return normalizeToken(node.label) === bySystem;
  });

  return system || null;
}
