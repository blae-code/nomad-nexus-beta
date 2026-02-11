import type { MapEdge, MapNode } from '../../schemas/mapSchemas';
import type { SpatialLocation } from '../../schemas/coreSchemas';

function normalizeToken(value: string | undefined): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function slug(value: string): string {
  return normalizeToken(value).replace(/[^a-z0-9]/g, '');
}

function rotateAround(
  center: { x: number; y: number },
  degrees: number,
  distance: number
): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: center.x + Math.cos(radians) * distance,
    y: center.y + Math.sin(radians) * distance,
  };
}

interface SystemSeed {
  id: string;
  label: string;
  systemTag: string;
  x: number;
  y: number;
}

interface BodySeed {
  id: string;
  label: string;
  systemTag: string;
  x: number;
  y: number;
  radius: number;
  category: 'planet' | 'moon';
  parentId?: string;
}

interface StationSeed {
  label: string;
  systemTag: string;
  parentBodyId: string;
  bearingDeg: number;
  distance: number;
}

const SYSTEM_SEEDS: ReadonlyArray<SystemSeed> = [
  { id: 'system-stanton', label: 'Stanton', systemTag: 'STANTON', x: 44, y: 58 },
  { id: 'system-pyro', label: 'Pyro', systemTag: 'PYRO', x: 78, y: 32 },
  { id: 'system-nyx', label: 'Nyx', systemTag: 'NYX', x: 16, y: 30 },
];

const BODY_SEEDS: ReadonlyArray<BodySeed> = [
  // Stanton major bodies
  { id: 'body-hurston', label: 'Hurston', systemTag: 'STANTON', x: 49, y: 52, radius: 3.5, category: 'planet', parentId: 'system-stanton' },
  { id: 'body-arccorp', label: 'ArcCorp', systemTag: 'STANTON', x: 49, y: 64, radius: 3.5, category: 'planet', parentId: 'system-stanton' },
  { id: 'body-crusader', label: 'Crusader', systemTag: 'STANTON', x: 35, y: 61, radius: 3.5, category: 'planet', parentId: 'system-stanton' },
  { id: 'body-microtech', label: 'microTech', systemTag: 'STANTON', x: 35, y: 49, radius: 3.5, category: 'planet', parentId: 'system-stanton' },
  // Stanton moons
  { id: 'body-arial', label: 'Arial', systemTag: 'STANTON', x: 53.3, y: 51.2, radius: 1.35, category: 'moon', parentId: 'body-hurston' },
  { id: 'body-aberdeen', label: 'Aberdeen', systemTag: 'STANTON', x: 52.1, y: 55.3, radius: 1.35, category: 'moon', parentId: 'body-hurston' },
  { id: 'body-ita', label: 'Ita', systemTag: 'STANTON', x: 45.4, y: 55.1, radius: 1.35, category: 'moon', parentId: 'body-hurston' },
  { id: 'body-magda', label: 'Magda', systemTag: 'STANTON', x: 45.4, y: 49.7, radius: 1.35, category: 'moon', parentId: 'body-hurston' },
  { id: 'body-lyria', label: 'Lyria', systemTag: 'STANTON', x: 53.1, y: 65.0, radius: 1.25, category: 'moon', parentId: 'body-arccorp' },
  { id: 'body-wala', label: 'Wala', systemTag: 'STANTON', x: 51.0, y: 68.2, radius: 1.25, category: 'moon', parentId: 'body-arccorp' },
  { id: 'body-cellin', label: 'Cellin', systemTag: 'STANTON', x: 31.4, y: 60.0, radius: 1.25, category: 'moon', parentId: 'body-crusader' },
  { id: 'body-daymar', label: 'Daymar', systemTag: 'STANTON', x: 34.3, y: 65.0, radius: 1.35, category: 'moon', parentId: 'body-crusader' },
  { id: 'body-yela', label: 'Yela', systemTag: 'STANTON', x: 38.3, y: 58.0, radius: 1.25, category: 'moon', parentId: 'body-crusader' },
  { id: 'body-calliope', label: 'Calliope', systemTag: 'STANTON', x: 30.2, y: 47.1, radius: 1.2, category: 'moon', parentId: 'body-microtech' },
  { id: 'body-clio', label: 'Clio', systemTag: 'STANTON', x: 34.1, y: 44.0, radius: 1.2, category: 'moon', parentId: 'body-microtech' },
  { id: 'body-euterpe', label: 'Euterpe', systemTag: 'STANTON', x: 39.1, y: 47.4, radius: 1.2, category: 'moon', parentId: 'body-microtech' },

  // Pyro major bodies
  { id: 'body-pyro-i', label: 'Pyro I', systemTag: 'PYRO', x: 82.4, y: 24.3, radius: 3.0, category: 'planet', parentId: 'system-pyro' },
  { id: 'body-pyro-ii', label: 'Pyro II', systemTag: 'PYRO', x: 85.1, y: 33.2, radius: 3.2, category: 'planet', parentId: 'system-pyro' },
  { id: 'body-pyro-iii', label: 'Pyro III', systemTag: 'PYRO', x: 79.4, y: 38.8, radius: 3.1, category: 'planet', parentId: 'system-pyro' },
  { id: 'body-pyro-iv', label: 'Pyro IV', systemTag: 'PYRO', x: 71.0, y: 35.1, radius: 3.2, category: 'planet', parentId: 'system-pyro' },
  { id: 'body-pyro-v', label: 'Pyro V', systemTag: 'PYRO', x: 73.6, y: 26.0, radius: 3.0, category: 'planet', parentId: 'system-pyro' },
  { id: 'body-pyro-vi', label: 'Pyro VI', systemTag: 'PYRO', x: 78.2, y: 42.6, radius: 3.0, category: 'planet', parentId: 'system-pyro' },

  // Nyx
  { id: 'body-delamar', label: 'Delamar', systemTag: 'NYX', x: 20.2, y: 32.0, radius: 3.0, category: 'planet', parentId: 'system-nyx' },
  { id: 'body-nyx-ii', label: 'Nyx II', systemTag: 'NYX', x: 12.5, y: 26.0, radius: 2.8, category: 'planet', parentId: 'system-nyx' },
  { id: 'body-nyx-iii', label: 'Nyx III', systemTag: 'NYX', x: 11.1, y: 35.4, radius: 2.6, category: 'planet', parentId: 'system-nyx' },
];

const STATION_SEEDS: ReadonlyArray<StationSeed> = [
  { label: 'Everus Harbor', systemTag: 'STANTON', parentBodyId: 'body-hurston', bearingDeg: -18, distance: 4.0 },
  { label: 'Baijini Point', systemTag: 'STANTON', parentBodyId: 'body-arccorp', bearingDeg: 14, distance: 4.1 },
  { label: 'Seraphim Station', systemTag: 'STANTON', parentBodyId: 'body-crusader', bearingDeg: -35, distance: 4.1 },
  { label: 'Port Tressler', systemTag: 'STANTON', parentBodyId: 'body-microtech', bearingDeg: -20, distance: 4.1 },
  { label: 'Grim HEX', systemTag: 'STANTON', parentBodyId: 'body-yela', bearingDeg: 18, distance: 2.3 },
  { label: 'Ruin Station', systemTag: 'PYRO', parentBodyId: 'body-pyro-ii', bearingDeg: -25, distance: 4.0 },
  { label: 'Orbituary', systemTag: 'PYRO', parentBodyId: 'body-pyro-iv', bearingDeg: 8, distance: 4.0 },
  { label: 'Patch City Relay', systemTag: 'PYRO', parentBodyId: 'body-pyro-iii', bearingDeg: -40, distance: 3.8 },
  { label: 'Levski', systemTag: 'NYX', parentBodyId: 'body-delamar', bearingDeg: -12, distance: 3.7 },
  { label: 'Nyx Forward Hub', systemTag: 'NYX', parentBodyId: 'body-nyx-ii', bearingDeg: 22, distance: 3.6 },
];

const OM_ANGLES = [0, 60, 120, 180, 240, 300] as const;
const LAGRANGE_ANGLES = [0, 72, 144, 216, 288] as const;

function createSystemNodes(): MapNode[] {
  return SYSTEM_SEEDS.map((seed) => ({
    id: seed.id,
    label: seed.label,
    kind: 'system',
    category: 'system',
    systemTag: seed.systemTag,
    x: seed.x,
    y: seed.y,
    radius: 7,
    importance: 'primary',
  }));
}

function createBodyNodes(): MapNode[] {
  return BODY_SEEDS.map((seed) => ({
    id: seed.id,
    label: seed.label,
    kind: 'body',
    category: seed.category,
    systemTag: seed.systemTag,
    x: seed.x,
    y: seed.y,
    radius: seed.radius,
    importance: seed.category === 'planet' ? 'primary' : 'secondary',
    parentId: seed.parentId,
  }));
}

function createStationNodes(bodyById: Readonly<Record<string, MapNode>>): MapNode[] {
  return STATION_SEEDS.map((seed) => {
    const parent = bodyById[seed.parentBodyId];
    const point = rotateAround(parent || { x: 50, y: 50 }, seed.bearingDeg, seed.distance);
    return {
      id: `station-${slug(seed.label)}`,
      label: seed.label,
      kind: 'site',
      category: 'station',
      systemTag: seed.systemTag,
      x: point.x,
      y: point.y,
      radius: 0.95,
      importance: 'secondary',
      parentId: seed.parentBodyId,
    };
  });
}

function createLagrangeNodes(primaryBodies: MapNode[]): MapNode[] {
  const nodes: MapNode[] = [];
  for (const body of primaryBodies) {
    const bodySlug = body.id.replace(/^body-/, '');
    for (let index = 0; index < LAGRANGE_ANGLES.length; index += 1) {
      const point = rotateAround({ x: body.x, y: body.y }, LAGRANGE_ANGLES[index], body.radius + 4.6);
      nodes.push({
        id: `lagrange-${bodySlug}-l${index + 1}`,
        label: `${body.label} L${index + 1}`,
        kind: 'site',
        category: 'lagrange',
        systemTag: body.systemTag,
        x: point.x,
        y: point.y,
        radius: 0.72,
        importance: 'tertiary',
        parentId: body.id,
      });
    }
  }
  return nodes;
}

function createOrbitalMarkerNodes(primaryBodies: MapNode[]): MapNode[] {
  const nodes: MapNode[] = [];
  for (const body of primaryBodies) {
    const bodySlug = body.id.replace(/^body-/, '');
    for (let index = 0; index < OM_ANGLES.length; index += 1) {
      const point = rotateAround({ x: body.x, y: body.y }, OM_ANGLES[index], body.radius + 5.6);
      nodes.push({
        id: `om-${bodySlug}-${index + 1}`,
        label: `${body.label} OM-${index + 1}`,
        kind: 'site',
        category: 'orbital-marker',
        systemTag: body.systemTag,
        x: point.x,
        y: point.y,
        radius: 0.62,
        importance: 'tertiary',
        parentId: body.id,
      });
    }
  }
  return nodes;
}

function createEdgeList(bodyNodes: MapNode[], stationNodes: MapNode[]): MapEdge[] {
  const jumpEdges: MapEdge[] = [
    { id: 'edge-jump-stanton-pyro', fromNodeId: 'system-stanton', toNodeId: 'system-pyro', kind: 'jump', risk: 'high' },
    { id: 'edge-jump-stanton-nyx', fromNodeId: 'system-stanton', toNodeId: 'system-nyx', kind: 'jump', risk: 'medium' },
    { id: 'edge-jump-pyro-nyx', fromNodeId: 'system-pyro', toNodeId: 'system-nyx', kind: 'jump', risk: 'high' },
  ];

  const systemToBodyEdges: MapEdge[] = bodyNodes
    .filter((body) => body.category === 'planet')
    .map((body) => ({
      id: `edge-orbital-${body.systemTag.toLowerCase()}-${body.id.replace(/^body-/, '')}`,
      fromNodeId: `system-${body.systemTag.toLowerCase()}`,
      toNodeId: body.id,
      kind: 'orbital',
      risk: 'low',
    }));

  const bodyToStationEdges: MapEdge[] = stationNodes
    .filter((station) => Boolean(station.parentId))
    .map((station) => ({
      id: `edge-route-${station.parentId}-${station.id}`,
      fromNodeId: station.parentId!,
      toNodeId: station.id,
      kind: 'route',
      risk: 'medium',
    }));

  return [...jumpEdges, ...systemToBodyEdges, ...bodyToStationEdges];
}

const SYSTEM_NODES = createSystemNodes();
const BODY_NODES = createBodyNodes();
const BODY_BY_ID = Object.freeze(
  BODY_NODES.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {} as Record<string, MapNode>)
);
const STATION_NODES = createStationNodes(BODY_BY_ID);
const PRIMARY_ORBITAL_BODIES = BODY_NODES.filter((node) => node.category === 'planet');
const LAGRANGE_NODES = createLagrangeNodes(PRIMARY_ORBITAL_BODIES);
const ORBITAL_MARKER_NODES = createOrbitalMarkerNodes(PRIMARY_ORBITAL_BODIES);

export const TACTICAL_MAP_NODES: Readonly<MapNode[]> = [
  ...SYSTEM_NODES,
  ...BODY_NODES,
  ...STATION_NODES,
  ...LAGRANGE_NODES,
  ...ORBITAL_MARKER_NODES,
];

export const TACTICAL_MAP_EDGES: Readonly<MapEdge[]> = createEdgeList(BODY_NODES, STATION_NODES);

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
  const needleTokens = [bySite, byRegion, byBody].filter(Boolean);

  if (needleTokens.length > 0) {
    const ordered = [...TACTICAL_MAP_NODES]
      .filter((node) => node.kind !== 'system')
      .sort((a, b) => {
        const order = ['planet', 'moon', 'station', 'lagrange', 'orbital-marker'];
        const ai = order.indexOf(String(a.category || 'station'));
        const bi = order.indexOf(String(b.category || 'station'));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    const scoped = ordered.find((node) => {
      const nodeToken = normalizeToken(node.label);
      return needleTokens.some((token) => nodeToken === token || nodeToken.includes(token) || token.includes(nodeToken));
    });
    if (scoped) return scoped;
  }

  const system = SYSTEM_NODES.find((node) => normalizeToken(node.label) === bySystem || normalizeToken(node.systemTag) === bySystem);
  return system || null;
}

