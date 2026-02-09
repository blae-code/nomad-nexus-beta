import type { PanelDescriptor, PanelSize, WorkbenchLayoutSnapshot, WorkbenchPresetId } from './types';

/**
 * Layout persistence helpers (interface scaffolding only).
 * TODO: add storage adapter after UX for save/load/restore is approved.
 */

export function toWorkbenchLayoutSnapshot(
  presetId: WorkbenchPresetId,
  panels: PanelDescriptor[],
  panelSizes: Record<string, PanelSize>
): WorkbenchLayoutSnapshot {
  return {
    version: 1,
    presetId,
    panelOrder: panels.map((panel) => panel.id),
    panelSizes,
  };
}

export function fromWorkbenchLayoutSnapshot(snapshot: WorkbenchLayoutSnapshot | null | undefined) {
  if (!snapshot || snapshot.version !== 1) return null;
  return snapshot;
}

export function serializeWorkbenchLayout(snapshot: WorkbenchLayoutSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseWorkbenchLayout(json: string): WorkbenchLayoutSnapshot | null {
  try {
    const raw = JSON.parse(json);
    return fromWorkbenchLayoutSnapshot(raw);
  } catch {
    return null;
  }
}

