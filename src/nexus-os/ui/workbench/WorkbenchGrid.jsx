import React, { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getNexusCssVars } from '../tokens';
import { NexusBadge, NexusButton, PanelFrame } from '../primitives';
import { AnimatedMount, motionTokens, useReducedMotion } from '../motion';
import PanelErrorBoundary from './PanelErrorBoundary';
import { DEFAULT_WORKBENCH_PRESET_ID, WORKBENCH_PRESETS } from './presets';

function resolvePanelSize(panel, presetId, columnCount) {
  const sizeForPreset = panel.defaultSizeByPreset?.[presetId];
  const size = sizeForPreset || panel.defaultSize || {};
  const colSpan = Math.max(1, Math.min(size.colSpan || 1, columnCount));
  const rowSpan = Math.max(1, size.rowSpan || 1);
  return { colSpan, rowSpan };
}

export default function WorkbenchGrid({
  panels,
  presetId = DEFAULT_WORKBENCH_PRESET_ID,
  onPresetChange,
  bridgeId,
  showPresetSwitcher = true,
  panelComponentProps = {},
}) {
  const vars = getNexusCssVars();
  const reducedMotion = useReducedMotion();
  const [isPanelDrawerOpen, setIsPanelDrawerOpen] = useState(false);
  const [activePanelIds, setActivePanelIds] = useState(() => panels.map((panel) => panel.id));
  const [gridVisible, setGridVisible] = useState(true);

  const preset = WORKBENCH_PRESETS[presetId] || WORKBENCH_PRESETS[DEFAULT_WORKBENCH_PRESET_ID];
  const availablePresets = Object.values(WORKBENCH_PRESETS);
  const panelSignature = useMemo(() => panels.map((panel) => panel.id).join('|'), [panels]);

  const panelMap = useMemo(() => {
    return panels.reduce((acc, panel) => {
      acc[panel.id] = panel;
      return acc;
    }, {});
  }, [panels]);

  const activePanels = useMemo(() => {
    return activePanelIds.map((id) => panelMap[id]).filter(Boolean);
  }, [activePanelIds, panelMap]);

  const inactivePanels = useMemo(() => {
    return panels.filter((panel) => !activePanelIds.includes(panel.id));
  }, [panels, activePanelIds]);

  const addPanel = (panelId) => {
    setActivePanelIds((prev) => (prev.includes(panelId) ? prev : [...prev, panelId]));
  };

  const removePanel = (panelId) => {
    setActivePanelIds((prev) => prev.filter((id) => id !== panelId));
  };

  useEffect(() => {
    const valid = new Set(panels.map((panel) => panel.id));
    setActivePanelIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      for (const panel of panels) {
        if (!next.includes(panel.id)) next.push(panel.id);
      }
      return next;
    });
  }, [panelSignature, panels]);

  useEffect(() => {
    if (reducedMotion) {
      setGridVisible(true);
      return;
    }
    setGridVisible(false);
    const id = requestAnimationFrame(() => setGridVisible(true));
    return () => cancelAnimationFrame(id);
  }, [panelSignature, presetId, reducedMotion]);

  return (
    <div className="h-full min-h-0 w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/70 flex flex-col" style={{ ...vars, backgroundColor: 'var(--nx-shell-bg-elevated)', borderColor: 'var(--nx-border)' }}>
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2" style={{ borderColor: 'var(--nx-border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">Workbench</h2>
          {bridgeId ? <NexusBadge tone="active">{bridgeId}</NexusBadge> : null}
          <span className="hidden sm:inline text-[11px] text-zinc-500 truncate">{preset.description}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showPresetSwitcher ? (
            <select
              value={preset.id}
              onChange={(event) => onPresetChange?.(event.target.value)}
              className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              aria-label="Workbench layout preset"
            >
              {availablePresets.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          ) : null}
          <NexusButton size="sm" intent="subtle" onClick={() => setIsPanelDrawerOpen(true)}>
            Add Panel
          </NexusButton>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <AnimatedMount show={gridVisible} durationMs={reducedMotion ? 0 : motionTokens.duration.fast} fromOpacity={0.92} toOpacity={1} fromY={3} toY={0} className="h-full min-h-0">
          <div
            className="h-full min-h-0 grid gap-3 overflow-auto"
            style={{
              gridTemplateColumns: `repeat(${preset.columns}, minmax(0, 1fr))`,
              gridAutoRows: `${preset.minRowHeightPx}px`,
              alignContent: 'start',
            }}
          >
            {activePanels.map((panel) => {
              const PanelComponent = panel.component;
              const { colSpan, rowSpan } = resolvePanelSize(panel, preset.id, preset.columns);
              const toolbar =
                typeof panel.toolbar === 'function'
                  ? panel.toolbar({ panelId: panel.id, bridgeId })
                  : panel.toolbar;

              return (
                <div
                  key={panel.id}
                  className="min-h-0"
                  style={{ gridColumn: `span ${colSpan} / span ${colSpan}`, gridRow: `span ${rowSpan} / span ${rowSpan}` }}
                >
                  <PanelErrorBoundary panelId={panel.id}>
                    <PanelFrame
                      title={panel.title}
                      status={panel.status}
                      statusTone={panel.statusTone}
                      live={panel.live}
                      loading={Boolean(panel.loading)}
                      loadingLabel={panel.loadingLabel}
                      toolbar={
                        <div className="flex items-center gap-2">
                          {toolbar}
                          <NexusButton size="sm" intent="subtle" onClick={() => removePanel(panel.id)}>
                            Hide
                          </NexusButton>
                        </div>
                      }
                    >
                      <PanelComponent panelId={panel.id} bridgeId={bridgeId} {...panelComponentProps} />
                    </PanelFrame>
                  </PanelErrorBoundary>
                </div>
              );
            })}
          </div>
        </AnimatedMount>
      </div>

      <Sheet open={isPanelDrawerOpen} onOpenChange={setIsPanelDrawerOpen}>
        <SheetContent side="right" className="bg-zinc-950 border-zinc-800 text-zinc-100">
          <SheetHeader>
            <SheetTitle className="uppercase tracking-wide text-orange-300">Add Panel</SheetTitle>
            <SheetDescription className="text-zinc-500">
              Workbench panel management stub for v0.1. Persistence wiring is intentionally deferred.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-3">
            {panels.map((panel) => {
              const isActive = activePanelIds.includes(panel.id);
              return (
                <div key={panel.id} className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-200 truncate">{panel.title}</div>
                    <div className="text-[11px] text-zinc-500">{panel.id}</div>
                  </div>
                  {isActive ? (
                    <NexusBadge tone="ok">Active</NexusBadge>
                  ) : (
                    <NexusButton size="sm" intent="primary" onClick={() => addPanel(panel.id)}>
                      Add
                    </NexusButton>
                  )}
                </div>
              );
            })}
            {inactivePanels.length === 0 ? (
              <div className="text-xs text-zinc-500 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                All registered panels are currently active.
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
