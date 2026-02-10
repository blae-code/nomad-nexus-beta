import type { PanelDescriptor, PanelPlacement, PanelSize, WorkbenchLayoutEngineState, WorkbenchPresetId } from './types';

function clampSpan(value: number | undefined, min: number, max: number): number {
  const safe = Number.isFinite(value) ? Number(value) : min;
  return Math.max(min, Math.min(max, safe));
}

function resolvePanelBaseSize(panel: PanelDescriptor, presetId: WorkbenchPresetId) {
  return panel.defaultSizeByPreset?.[presetId] || panel.defaultSize || {};
}

export function resolvePanelSizeForLayout(
  panel: PanelDescriptor,
  presetId: WorkbenchPresetId,
  columnCount: number,
  overrideSize?: PanelSize
): Required<PanelSize> {
  const baseSize = resolvePanelBaseSize(panel, presetId);
  return {
    colSpan: clampSpan(overrideSize?.colSpan ?? baseSize.colSpan ?? 1, 1, Math.max(1, columnCount)),
    rowSpan: clampSpan(overrideSize?.rowSpan ?? baseSize.rowSpan ?? 1, 1, 8),
  };
}

export function reorderPanelIds(panelIds: string[], sourceIndex: number, destinationIndex: number): string[] {
  if (
    sourceIndex < 0 ||
    destinationIndex < 0 ||
    sourceIndex >= panelIds.length ||
    destinationIndex >= panelIds.length ||
    sourceIndex === destinationIndex
  ) {
    return panelIds;
  }
  const next = [...panelIds];
  const [removed] = next.splice(sourceIndex, 1);
  next.splice(destinationIndex, 0, removed);
  return next;
}

export function normalizePanelOrder(panelOrder: string[], availablePanelIds: string[]): string[] {
  const valid = new Set(availablePanelIds);
  const normalized = panelOrder.filter((id) => valid.has(id));
  for (const panelId of availablePanelIds) {
    if (!normalized.includes(panelId)) normalized.push(panelId);
  }
  return normalized;
}

function ensureGridRow(occupancy: boolean[][], rowIndex: number, columnCount: number): void {
  while (occupancy.length <= rowIndex) {
    occupancy.push(Array.from({ length: columnCount }, () => false));
  }
}

function canPlaceAt(
  occupancy: boolean[][],
  rowIndex: number,
  columnIndex: number,
  colSpan: number,
  rowSpan: number,
  columnCount: number
): boolean {
  if (columnIndex + colSpan > columnCount) return false;
  for (let y = rowIndex; y < rowIndex + rowSpan; y += 1) {
    ensureGridRow(occupancy, y, columnCount);
    for (let x = columnIndex; x < columnIndex + colSpan; x += 1) {
      if (occupancy[y][x]) return false;
    }
  }
  return true;
}

function markPlacement(
  occupancy: boolean[][],
  rowIndex: number,
  columnIndex: number,
  colSpan: number,
  rowSpan: number,
  columnCount: number
): void {
  for (let y = rowIndex; y < rowIndex + rowSpan; y += 1) {
    ensureGridRow(occupancy, y, columnCount);
    for (let x = columnIndex; x < columnIndex + colSpan; x += 1) {
      occupancy[y][x] = true;
    }
  }
}

/**
 * LayoutEngine v1:
 * Deterministic first-fit panel placement for future snap/resize persistence.
 * This computes coordinates without relying on DOM measurements.
 */
export function computePanelPlacements(input: {
  panelOrder: string[];
  panelsById: Record<string, PanelDescriptor>;
  panelSizes?: Record<string, PanelSize>;
  presetId: WorkbenchPresetId;
  columnCount: number;
}): PanelPlacement[] {
  const placements: PanelPlacement[] = [];
  const occupancy: boolean[][] = [];

  for (const panelId of input.panelOrder) {
    const panel = input.panelsById[panelId];
    if (!panel) continue;
    const { colSpan, rowSpan } = resolvePanelSizeForLayout(
      panel,
      input.presetId,
      input.columnCount,
      input.panelSizes?.[panelId]
    );

    let placed = false;
    let rowIndex = 0;
    while (!placed && rowIndex < 300) {
      for (let columnIndex = 0; columnIndex < input.columnCount; columnIndex += 1) {
        if (!canPlaceAt(occupancy, rowIndex, columnIndex, colSpan, rowSpan, input.columnCount)) {
          continue;
        }
        markPlacement(occupancy, rowIndex, columnIndex, colSpan, rowSpan, input.columnCount);
        placements.push({
          panelId,
          colStart: columnIndex + 1,
          rowStart: rowIndex + 1,
          colSpan,
          rowSpan,
        });
        placed = true;
        break;
      }
      rowIndex += 1;
    }
  }

  return placements;
}

export function createLayoutEngineState(input: {
  presetId: WorkbenchPresetId;
  panelOrder: string[];
  activePanelIds: string[];
  panelSizes?: Record<string, PanelSize>;
  availablePanelIds: string[];
}): WorkbenchLayoutEngineState {
  const normalizedOrder = normalizePanelOrder(input.panelOrder, input.availablePanelIds);
  const activeSet = new Set(input.activePanelIds.filter((id) => input.availablePanelIds.includes(id)));
  return {
    presetId: input.presetId,
    panelOrder: normalizedOrder,
    activePanelIds: normalizedOrder.filter((id) => activeSet.has(id)),
    panelSizes: input.panelSizes || {},
  };
}
