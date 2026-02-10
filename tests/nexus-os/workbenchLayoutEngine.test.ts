import { describe, expect, it } from 'vitest';
import {
  computePanelPlacements,
  createLayoutEngineState,
  normalizePanelOrder,
  reorderPanelIds,
  resolvePanelSizeForLayout,
} from '../../src/nexus-os/ui/workbench/layoutEngine';
import {
  fromWorkbenchLayoutSnapshot,
  migrateWorkbenchLayoutSnapshot,
  parseWorkbenchLayout,
  serializeWorkbenchLayout,
} from '../../src/nexus-os/ui/workbench/layoutPersistence';
import type { PanelDescriptor } from '../../src/nexus-os/ui/workbench/types';

function panel(id: string, colSpan = 1, rowSpan = 1): PanelDescriptor {
  return {
    id,
    title: id,
    component: (() => null) as any,
    defaultSize: { colSpan, rowSpan },
  };
}

describe('Workbench LayoutEngine v1', () => {
  it('reorders panel ids deterministically', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(reorderPanelIds(ids, 1, 3)).toEqual(['a', 'c', 'd', 'b']);
    expect(reorderPanelIds(ids, 2, 2)).toEqual(ids);
  });

  it('normalizes panel order against available registry', () => {
    const normalized = normalizePanelOrder(['c', 'x', 'a'], ['a', 'b', 'c']);
    expect(normalized).toEqual(['c', 'a', 'b']);
  });

  it('resolves panel sizes and computes placements within bounds', () => {
    const panels = [panel('a', 2, 1), panel('b', 1, 1), panel('c', 1, 2)];
    const panelsById = Object.fromEntries(panels.map((entry) => [entry.id, entry]));
    const resolved = resolvePanelSizeForLayout(panels[0], 'GRID_3_COLUMN', 3, { colSpan: 6 });
    expect(resolved.colSpan).toBe(3);

    const placements = computePanelPlacements({
      panelOrder: ['a', 'b', 'c'],
      panelsById,
      panelSizes: {},
      presetId: 'GRID_3_COLUMN',
      columnCount: 3,
    });
    expect(placements.length).toBe(3);
    for (const entry of placements) {
      expect(entry.colStart).toBeGreaterThanOrEqual(1);
      expect(entry.colStart + entry.colSpan - 1).toBeLessThanOrEqual(3);
      expect(entry.rowStart).toBeGreaterThanOrEqual(1);
    }
  });

  it('builds normalized layout engine state', () => {
    const state = createLayoutEngineState({
      presetId: 'GRID_2X2',
      panelOrder: ['c', 'a'],
      activePanelIds: ['a', 'z'],
      panelSizes: {},
      availablePanelIds: ['a', 'b', 'c'],
    });
    expect(state.panelOrder).toEqual(['c', 'a', 'b']);
    expect(state.activePanelIds).toEqual(['a']);
  });
});

describe('Workbench persistence migration', () => {
  it('migrates v1 snapshots to v2 schema', () => {
    const migrated = migrateWorkbenchLayoutSnapshot(
      {
        version: 1,
        presetId: 'GRID_2X2',
        panelOrder: ['a', 'b'],
        panelSizes: { a: { colSpan: 2 } },
      },
      'GRID_3_COLUMN',
      ['a', 'b', 'c']
    );
    expect(migrated?.version).toBe(2);
    expect(migrated?.schema).toBe('nexus-os-workbench');
    expect(migrated?.activePanelIds).toEqual(['a', 'b']);
  });

  it('round-trips v2 snapshots through serialize/parse', () => {
    const snapshot = {
      version: 2 as const,
      schema: 'nexus-os-workbench' as const,
      presetId: 'COMMAND_LEFT' as const,
      panelOrder: ['a', 'b'],
      activePanelIds: ['b'],
      panelSizes: { b: { rowSpan: 2 } },
      updatedAt: '2026-02-09T10:00:00.000Z',
    };
    const encoded = serializeWorkbenchLayout(snapshot);
    const parsed = parseWorkbenchLayout(encoded, 'GRID_2X2', ['a', 'b', 'c']);
    expect(parsed).toEqual({
      ...snapshot,
      panelOrder: ['a', 'b', 'c'],
      activePanelIds: ['b'],
    });
  });

  it('normalizes invalid snapshots to null', () => {
    expect(parseWorkbenchLayout('{bad json}', 'GRID_2X2', ['a'])).toBeNull();
    expect(fromWorkbenchLayoutSnapshot(null, 'GRID_2X2', ['a'])).toBeNull();
  });
});
