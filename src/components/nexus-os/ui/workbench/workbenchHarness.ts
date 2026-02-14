import type {
  PanelDescriptor,
  PanelSize,
  WorkbenchA11yWarning,
  WorkbenchHarnessReport,
  WorkbenchPerfSample,
  WorkbenchPresetId,
} from './types';
import { computePanelPlacements, normalizePanelOrder } from './layoutEngine';

function perfNow(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') return performance.now();
  return Date.now();
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function runWorkbenchA11yChecks(input: {
  panels: PanelDescriptor[];
  activePanelIds: string[];
  presetId: WorkbenchPresetId;
}): WorkbenchA11yWarning[] {
  const warnings: WorkbenchA11yWarning[] = [];
  const panelIds = input.panels.map((panel) => panel.id);
  const uniqueIds = uniq(panelIds);
  if (uniqueIds.length !== panelIds.length) {
    warnings.push({
      code: 'WORKBENCH_DUPLICATE_PANEL_ID',
      severity: 'critical',
      message: 'Panel registry contains duplicate panel IDs; drag-and-drop and persistence may drift.',
    });
  }

  const missingTitles = input.panels.filter((panel) => !String(panel.title || '').trim());
  if (missingTitles.length > 0) {
    warnings.push({
      code: 'WORKBENCH_PANEL_TITLE_MISSING',
      severity: 'warning',
      message: `${missingTitles.length} panel(s) are missing titles; assistive labels may be degraded.`,
    });
  }

  const unknownActive = input.activePanelIds.filter((panelId) => !uniqueIds.includes(panelId));
  if (unknownActive.length > 0) {
    warnings.push({
      code: 'WORKBENCH_ACTIVE_PANEL_UNKNOWN',
      severity: 'warning',
      message: `Active panel list contains unknown IDs: ${unknownActive.join(', ')}.`,
    });
  }

  const normalized = normalizePanelOrder(input.activePanelIds, uniqueIds);
  if (normalized.length === 0) {
    warnings.push({
      code: 'WORKBENCH_EMPTY_LAYOUT',
      severity: 'warning',
      message: 'No active workbench panels are visible; users may lose command context.',
    });
  }

  return warnings;
}

export function runWorkbenchPerfSample(input: {
  label?: string;
  iterations?: number;
  panels: PanelDescriptor[];
  panelOrder: string[];
  panelSizes: Record<string, PanelSize>;
  presetId: WorkbenchPresetId;
  columnCount: number;
}): WorkbenchPerfSample {
  const panelsById = input.panels.reduce<Record<string, PanelDescriptor>>((acc, panel) => {
    acc[panel.id] = panel;
    return acc;
  }, {});

  const iterations = Math.max(1, input.iterations || 40);
  const startedAt = perfNow();
  for (let index = 0; index < iterations; index += 1) {
    computePanelPlacements({
      panelOrder: input.panelOrder,
      panelsById,
      panelSizes: input.panelSizes,
      presetId: input.presetId,
      columnCount: input.columnCount,
    });
  }
  const elapsedMs = Number((perfNow() - startedAt).toFixed(2));
  return {
    label: input.label || 'workbench.layoutEngine.v1',
    iterationCount: iterations,
    elapsedMs,
    avgMs: Number((elapsedMs / iterations).toFixed(3)),
  };
}

export function runWorkbenchHarness(input: {
  panels: PanelDescriptor[];
  activePanelIds: string[];
  panelSizes: Record<string, PanelSize>;
  presetId: WorkbenchPresetId;
  columnCount: number;
  iterations?: number;
}): WorkbenchHarnessReport {
  return {
    a11yWarnings: runWorkbenchA11yChecks({
      panels: input.panels,
      activePanelIds: input.activePanelIds,
      presetId: input.presetId,
    }),
    perf: runWorkbenchPerfSample({
      iterations: input.iterations,
      panels: input.panels,
      panelOrder: input.activePanelIds,
      panelSizes: input.panelSizes,
      presetId: input.presetId,
      columnCount: input.columnCount,
    }),
  };
}
