import { describe, expect, it } from 'vitest';
import {
  runWorkbenchA11yChecks,
  runWorkbenchHarness,
  runWorkbenchPerfSample,
} from '../../src/components/nexus-os/ui/workbench/workbenchHarness';
import type { PanelDescriptor } from '../../src/components/nexus-os/ui/workbench/types';

function panel(id: string, title = id): PanelDescriptor {
  return {
    id,
    title,
    component: (() => null) as any,
    defaultSize: { colSpan: 1, rowSpan: 1 },
  };
}

describe('Workbench a11y/perf harness', () => {
  it('reports a11y warnings for duplicates and missing titles', () => {
    const warnings = runWorkbenchA11yChecks({
      panels: [panel('a', ''), panel('a', 'Duplicate')],
      activePanelIds: ['a', 'unknown'],
      presetId: 'GRID_2X2',
    });
    expect(warnings.some((entry) => entry.code === 'WORKBENCH_DUPLICATE_PANEL_ID')).toBe(true);
    expect(warnings.some((entry) => entry.code === 'WORKBENCH_PANEL_TITLE_MISSING')).toBe(true);
    expect(warnings.some((entry) => entry.code === 'WORKBENCH_ACTIVE_PANEL_UNKNOWN')).toBe(true);
  });

  it('produces perf samples and consolidated harness report', () => {
    const panels = [panel('a'), panel('b'), panel('c')];
    const perf = runWorkbenchPerfSample({
      panels,
      panelOrder: ['a', 'b', 'c'],
      panelSizes: {},
      presetId: 'GRID_3_COLUMN',
      columnCount: 3,
      iterations: 16,
    });
    expect(perf.iterationCount).toBe(16);
    expect(perf.elapsedMs).toBeGreaterThanOrEqual(0);

    const report = runWorkbenchHarness({
      panels,
      activePanelIds: ['a', 'b', 'c'],
      panelSizes: {},
      presetId: 'GRID_3_COLUMN',
      columnCount: 3,
      iterations: 8,
    });
    expect(report.a11yWarnings.length).toBe(0);
    expect(report.perf.iterationCount).toBe(8);
  });
});

