import React, { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { ArrowDown, ArrowUp, GripVertical, Minus, Plus, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getNexusCssVars } from '../tokens';
import { NexusBadge, NexusButton, PanelFrame } from '../primitives';
import { AnimatedMount, motionTokens, useReducedMotion } from '../motion';
import PanelErrorBoundary from './PanelErrorBoundary';
import { DEFAULT_WORKBENCH_PRESET_ID, WORKBENCH_PRESETS } from './presets';
import { reorderPanelIds, resolvePanelSizeForLayout } from './layoutEngine';
import {
  loadWorkbenchLayout,
  persistWorkbenchLayout,
  resetWorkbenchLayout,
  toWorkbenchLayoutSnapshot,
} from './layoutPersistence';
import { runWorkbenchHarness } from './workbenchHarness';

function clampRowSpan(value) {
  return Math.max(1, Math.min(8, value));
}

function clampColSpan(value, columns) {
  return Math.max(1, Math.min(columns, value));
}

export default function WorkbenchGrid({
  panels,
  presetId = DEFAULT_WORKBENCH_PRESET_ID,
  onPresetChange,
  bridgeId,
  showPresetSwitcher = true,
  panelComponentProps = {},
  initialActivePanelIds,
  onActivePanelIdsChange,
  layoutPersistenceScopeKey,
  enableLayoutPersistence = true,
}) {
  const vars = getNexusCssVars();
  const reducedMotion = useReducedMotion();
  const [isPanelDrawerOpen, setIsPanelDrawerOpen] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [panelSizes, setPanelSizes] = useState({});
  const [layoutHydrated, setLayoutHydrated] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState('');
  const [activePanelIds, setActivePanelIds] = useState(() => {
    if (Array.isArray(initialActivePanelIds) && initialActivePanelIds.length > 0) {
      return initialActivePanelIds;
    }
    return panels.map((panel) => panel.id);
  });

  const preset = WORKBENCH_PRESETS[presetId] || WORKBENCH_PRESETS[DEFAULT_WORKBENCH_PRESET_ID];
  const availablePresets = Object.values(WORKBENCH_PRESETS);
  const panelSignature = useMemo(() => panels.map((panel) => panel.id).join('|'), [panels]);
  const persistenceEnabled = Boolean(enableLayoutPersistence && layoutPersistenceScopeKey);

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

  const movePanelByOffset = (panelId, offset) => {
    setActivePanelIds((prev) => {
      const sourceIndex = prev.indexOf(panelId);
      if (sourceIndex < 0) return prev;
      const destinationIndex = Math.max(0, Math.min(prev.length - 1, sourceIndex + offset));
      return reorderPanelIds(prev, sourceIndex, destinationIndex);
    });
  };

  const resizePanel = (panelId, axis, delta) => {
    const panel = panelMap[panelId];
    if (!panel) return;
    const base = resolvePanelSizeForLayout(panel, preset.id, preset.columns, panelSizes[panelId]);
    const nextSize = {
      colSpan:
        axis === 'col' ? clampColSpan(base.colSpan + delta, preset.columns) : base.colSpan,
      rowSpan: axis === 'row' ? clampRowSpan(base.rowSpan + delta) : base.rowSpan,
    };
    setPanelSizes((prev) => ({
      ...prev,
      [panelId]: nextSize,
    }));
  };

  const resetLayout = () => {
    setPanelSizes({});
    setActivePanelIds(panels.map((panel) => panel.id));
    if (persistenceEnabled && layoutPersistenceScopeKey) {
      resetWorkbenchLayout(layoutPersistenceScopeKey);
      setMigrationNotice('Layout reset to defaults.');
    }
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
    if (!Array.isArray(initialActivePanelIds) || initialActivePanelIds.length === 0) return;
    const valid = new Set(panels.map((panel) => panel.id));
    const filtered = initialActivePanelIds.filter((id) => valid.has(id));
    if (filtered.length === 0) return;
    setActivePanelIds((prev) => (prev.join('|') === filtered.join('|') ? prev : filtered));
  }, [Array.isArray(initialActivePanelIds) ? initialActivePanelIds.join('|') : '', panelSignature, panels]);

  useEffect(() => {
    if (!persistenceEnabled || !layoutPersistenceScopeKey) {
      setLayoutHydrated(true);
      return;
    }

    const loaded = loadWorkbenchLayout({
      scopeKey: layoutPersistenceScopeKey,
      fallbackPresetId: preset.id,
      availablePanelIds: panels.map((panel) => panel.id),
    });

    if (loaded?.snapshot) {
      setActivePanelIds(loaded.snapshot.activePanelIds);
      setPanelSizes(loaded.snapshot.panelSizes || {});
      if (loaded.snapshot.presetId !== preset.id) {
        onPresetChange?.(loaded.snapshot.presetId);
      }
      if (loaded.migratedFrom === 1) {
        setMigrationNotice('Layout migrated from v1 snapshot.');
      }
    }

    setLayoutHydrated(true);
  }, [persistenceEnabled, layoutPersistenceScopeKey, panelSignature]);

  useEffect(() => {
    onActivePanelIdsChange?.(activePanelIds);
  }, [activePanelIds, onActivePanelIdsChange]);

  useEffect(() => {
    if (!layoutHydrated || !persistenceEnabled || !layoutPersistenceScopeKey) return;
    const orderedPanels = activePanelIds
      .map((panelId) => panelMap[panelId])
      .filter(Boolean);
    const snapshot = toWorkbenchLayoutSnapshot(preset.id, orderedPanels, panelSizes, activePanelIds);
    persistWorkbenchLayout(layoutPersistenceScopeKey, snapshot);
  }, [
    activePanelIds,
    layoutHydrated,
    panelMap,
    panelSizes,
    persistenceEnabled,
    layoutPersistenceScopeKey,
    preset.id,
  ]);

  useEffect(() => {
    if (reducedMotion) {
      setGridVisible(true);
      return;
    }
    setGridVisible(false);
    const id = requestAnimationFrame(() => setGridVisible(true));
    return () => cancelAnimationFrame(id);
  }, [panelSignature, presetId, reducedMotion]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const report = runWorkbenchHarness({
      panels,
      activePanelIds,
      panelSizes,
      presetId: preset.id,
      columnCount: preset.columns,
      iterations: 24,
    });
    if (report.a11yWarnings.length > 0) {
      console.warn('[NexusOS][Workbench][A11y]', report.a11yWarnings);
    }
    if (report.perf.avgMs > 2) {
      console.info('[NexusOS][Workbench][Perf]', report.perf);
    }
  }, [panels, activePanelIds.join('|'), JSON.stringify(panelSizes), preset.id, preset.columns]);

  return (
    <div className="h-full min-h-0 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 flex flex-col nexus-panel-glow relative" style={{ ...vars, backgroundColor: 'var(--nx-shell-bg-elevated)', borderColor: 'var(--nx-border)' }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2 bg-[linear-gradient(180deg,rgba(255,132,66,0.08),rgba(0,0,0,0))]" style={{ borderColor: 'var(--nx-border)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100 truncate">Workbench</h2>
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
          <NexusButton size="sm" intent="subtle" onClick={resetLayout} title="Reset layout to defaults">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </NexusButton>
          <NexusButton size="sm" intent="subtle" onClick={() => setIsPanelDrawerOpen(true)}>
            Add Panel
          </NexusButton>
        </div>
      </div>

      {migrationNotice ? (
        <div className="px-3 py-1.5 text-[11px] text-zinc-400 border-b border-zinc-800 bg-zinc-900/40">{migrationNotice}</div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-hidden p-3 bg-[radial-gradient(circle_at_top,rgba(255,129,67,0.05),transparent_36%)]">
        <AnimatedMount show={gridVisible} durationMs={reducedMotion ? 0 : motionTokens.duration.fast} fromOpacity={0.92} toOpacity={1} fromY={3} toY={0} className="h-full min-h-0">
          <DragDropContext
            onDragEnd={(result) => {
              if (!result.destination) return;
              setActivePanelIds((prev) =>
                reorderPanelIds(prev, result.source.index, result.destination.index)
              );
            }}
          >
            <Droppable droppableId="workbench-grid" direction="vertical">
              {(dropProvided, dropSnapshot) => (
                <div
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                  className={`h-full min-h-0 grid gap-3 overflow-auto ${dropSnapshot.isDraggingOver ? 'outline outline-1 outline-orange-500/40' : ''}`}
                  style={{
                    gridTemplateColumns: `repeat(${preset.columns}, minmax(0, 1fr))`,
                    gridAutoRows: `${preset.minRowHeightPx}px`,
                    alignContent: 'start',
                  }}
                  aria-label="Workbench panel layout"
                >
                  {activePanels.map((panel, index) => {
                    const PanelComponent = panel.component;
                    const size = resolvePanelSizeForLayout(
                      panel,
                      preset.id,
                      preset.columns,
                      panelSizes[panel.id]
                    );
                    const toolbar =
                      typeof panel.toolbar === 'function'
                        ? panel.toolbar({ panelId: panel.id, bridgeId })
                        : panel.toolbar;

                    return (
                      <Draggable key={panel.id} draggableId={panel.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            className={`min-h-0 ${dragSnapshot.isDragging ? 'opacity-95 ring-1 ring-orange-500/50 rounded-md' : ''}`}
                            style={{
                              ...dragProvided.draggableProps.style,
                              gridColumn: `span ${size.colSpan} / span ${size.colSpan}`,
                              gridRow: `span ${size.rowSpan} / span ${size.rowSpan}`,
                            }}
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
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      {...dragProvided.dragHandleProps}
                                      className="h-7 w-7 rounded border border-zinc-700 bg-zinc-900/70 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 grid place-items-center"
                                      aria-label={`Reorder ${panel.title}`}
                                      title={`Reorder ${panel.title} (drag or keyboard)`}
                                    >
                                      <GripVertical className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-7 w-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 grid place-items-center"
                                      aria-label={`Move ${panel.title} up`}
                                      onClick={() => movePanelByOffset(panel.id, -1)}
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-7 w-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 grid place-items-center"
                                      aria-label={`Move ${panel.title} down`}
                                      onClick={() => movePanelByOffset(panel.id, 1)}
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-7 w-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 grid place-items-center"
                                      aria-label={`Decrease width of ${panel.title}`}
                                      onClick={() => resizePanel(panel.id, 'col', -1)}
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-7 w-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 grid place-items-center"
                                      aria-label={`Increase width of ${panel.title}`}
                                      onClick={() => resizePanel(panel.id, 'col', 1)}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
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
                        )}
                      </Draggable>
                    );
                  })}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </AnimatedMount>
      </div>

      <Sheet open={isPanelDrawerOpen} onOpenChange={setIsPanelDrawerOpen}>
        <SheetContent side="right" className="bg-zinc-950 border-zinc-800 text-zinc-100">
          <SheetHeader>
            <SheetTitle className="uppercase tracking-wide text-orange-300">Add Panel</SheetTitle>
            <SheetDescription className="text-zinc-500">
              Drag panels by header handle, or use Move Up / Move Down controls for keyboard-only reordering.
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
