import { describe, expect, it } from 'vitest';
import {
  TACTICAL_MAP_EDGES,
  TACTICAL_MAP_NODES,
  TACTICAL_MAP_NODE_BY_ID,
  findMapNodeForLocation,
} from '../../src/components/nexus-os/ui/map/mapBoard';

describe('mapBoard tactical layout', () => {
  it('includes three operational systems and their primary bodies', () => {
    const systems = TACTICAL_MAP_NODES.filter((node) => node.kind === 'system').map((node) => node.id);
    expect(systems).toEqual(expect.arrayContaining(['system-stanton', 'system-pyro', 'system-nyx']));

    const primaryBodies = TACTICAL_MAP_NODES.filter((node) => node.category === 'planet');
    const bySystem = primaryBodies.reduce<Record<string, number>>((acc, node) => {
      acc[node.systemTag] = (acc[node.systemTag] || 0) + 1;
      return acc;
    }, {});
    expect(bySystem.STANTON).toBeGreaterThanOrEqual(4);
    expect(bySystem.PYRO).toBeGreaterThanOrEqual(6);
    expect(bySystem.NYX).toBeGreaterThanOrEqual(3);
  });

  it('contains station, lagrange, and orbital marker node classes', () => {
    const stationCount = TACTICAL_MAP_NODES.filter((node) => node.category === 'station').length;
    const lagrangeCount = TACTICAL_MAP_NODES.filter((node) => node.category === 'lagrange').length;
    const omCount = TACTICAL_MAP_NODES.filter((node) => node.category === 'orbital-marker').length;
    expect(stationCount).toBeGreaterThan(0);
    expect(lagrangeCount).toBeGreaterThan(0);
    expect(omCount).toBeGreaterThan(0);
  });

  it('keeps jump routes between command systems and resolves map node by location hints', () => {
    expect(TACTICAL_MAP_EDGES.some((edge) => edge.kind === 'jump')).toBe(true);
    expect(TACTICAL_MAP_NODE_BY_ID['body-hurston']).toBeTruthy();

    const hurston = findMapNodeForLocation({ system: 'Stanton', body: 'Hurston' });
    const station = findMapNodeForLocation({ system: 'Stanton', site: 'Port Tressler' });

    expect(hurston?.id).toBe('body-hurston');
    expect(station?.id).toContain('station-porttressler');
  });
});


