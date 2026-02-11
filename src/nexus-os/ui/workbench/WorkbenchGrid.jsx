import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { ArrowDown, ArrowDownRight, ArrowUp, Copy, GripVertical, Minus, Plus, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getNexusCssVars } from '../tokens';
import { NexusBadge, NexusButton, PanelFrame } from '../primitives';
import { AnimatedMount, motionTokens, useReducedMotion } from '../motion';
import PanelErrorBoundary from './PanelErrorBoundary';
import CustomWorkbenchWidgetPanel from './CustomWorkbenchWidgetPanel';
import { DEFAULT_WORKBENCH_PRESET_ID, WORKBENCH_PRESETS } from './presets';
import { reorderPanelIds, resolvePanelSizeForLayout } from './layoutEngine';
import {
  loadWorkbenchLayout,
  persistWorkbenchLayout,
  resetWorkbenchLayout,
  toWorkbenchLayoutSnapshot,
} from './layoutPersistence';
import { runWorkbenchHarness } from './workbenchHarness';
import {
  customWorkbenchWidgetPanelId,
  exportCustomWorkbenchWidgetShareCode,
  importCustomWorkbenchWidgetFromShareCode,
  listCustomWorkbenchWidgets,
  parseCustomWorkbenchWidgetPanelId,
  removeCustomWorkbenchWidget,
  upsertCustomWorkbenchWidget,
} from '../../services/customWorkbenchWidgetService';

function clampRowSpan(value) {
  return Math.max(MIN_ROW_SPAN, Math.min(MAX_ROW_SPAN, value));
}

function clampColSpan(value, columns) {
  return Math.max(1, Math.min(columns, value));
}

const DEFAULT_WIDGET_TONE = 'experimental';
const MAX_ROW_SPAN = 8;
const MIN_ROW_SPAN = 1;

function copyToClipboard(value) {
  if (!String(value || '').trim()) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(() => {});
    return true;
  }
  return false;
}

function createWidgetFormState(overrides = {}) {
  return {
    editingWidgetId: '',
    title: '',
    description: '',
    body: '',
    tone: DEFAULT_WIDGET_TONE,
    linkLabel: '',
    linkUrl: '',
    ...overrides,
  };
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
  const [widgetNotice, setWidgetNotice] = useState('');
  const [customWidgets, setCustomWidgets] = useState([]);
  const [widgetForm, setWidgetForm] = useState(() => createWidgetFormState());
  const [widgetImportCode, setWidgetImportCode] = useState('');
  const [resizeSession, setResizeSession] = useState(null);
  const widgetScopeKey = useMemo(() => {
    if (layoutPersistenceScopeKey) return `${layoutPersistenceScopeKey}:custom`;
    return `bridge:${String(bridgeId || 'global').toLowerCase()}`;
  }, [bridgeId, layoutPersistenceScopeKey]);
  const [activePanelIds, setActivePanelIds] = useState(() => {
    if (Array.isArray(initialActivePanelIds) && initialActivePanelIds.length > 0) {
      return initialActivePanelIds;
    }
    return panels.map((panel) => panel.id);
  });

  const preset = WORKBENCH_PRESETS[presetId] || WORKBENCH_PRESETS[DEFAULT_WORKBENCH_PRESET_ID];
  const availablePresets = Object.values(WORKBENCH_PRESETS);
  const customWidgetMap = useMemo(
    () =>
      customWidgets.reduce((acc, widget) => {
        acc[widget.id] = widget;
        return acc;
      }, {}),
    [customWidgets]
  );
  const customPanelDescriptors = useMemo(() => {
    return customWidgets.map((widget) => ({
      id: customWorkbenchWidgetPanelId(widget.id),
      title: widget.title,
      component: CustomWorkbenchWidgetPanel,
      status: 'Custom',
      statusTone: widget.tone || 'experimental',
      live: false,
      defaultSize: { colSpan: 1, rowSpan: 2 },
    }));
  }, [customWidgets]);
  const allPanels = useMemo(() => [...panels, ...customPanelDescriptors], [customPanelDescriptors, panels]);
  const panelSignature = useMemo(() => allPanels.map((panel) => panel.id).join('|'), [allPanels]);
  const persistenceEnabled = Boolean(enableLayoutPersistence && layoutPersistenceScopeKey);

  const panelMap = useMemo(() => {
    return allPanels.reduce((acc, panel) => {
      acc[panel.id] = panel;
      return acc;
    }, {});
  }, [allPanels]);

  const activePanels = useMemo(() => {
    return activePanelIds.map((id) => panelMap[id]).filter(Boolean);
  }, [activePanelIds, panelMap]);

  const inactivePanels = useMemo(() => {
    return allPanels.filter((panel) => !activePanelIds.includes(panel.id));
  }, [allPanels, activePanelIds]);

  useEffect(() => {
    setCustomWidgets(listCustomWorkbenchWidgets(widgetScopeKey));
  }, [widgetScopeKey]);

  const applyWidgetFormUpdate = useCallback((patch) => {
    setWidgetForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearWidgetForm = useCallback(() => {
    setWidgetForm(createWidgetFormState());
  }, []);

  const editWidget = useCallback(
    (widgetId) => {
      const widget = customWidgetMap[widgetId];
      if (!widget) return;
      applyWidgetFormUpdate({
        editingWidgetId: widget.id,
        title: widget.title || '',
        description: widget.description || '',
        body: widget.body || '',
        tone: widget.tone || DEFAULT_WIDGET_TONE,
        linkLabel: widget.links?.[0]?.label || '',
        linkUrl: widget.links?.[0]?.url || '',
      });
      setWidgetNotice(`Editing widget "${widget.title}".`);
      setIsPanelDrawerOpen(true);
    },
    [applyWidgetFormUpdate, customWidgetMap]
  );

  const deleteWidget = useCallback(
    (widgetId) => {
      const deleted = removeCustomWorkbenchWidget(widgetScopeKey, widgetId);
      if (!deleted) return;
      setCustomWidgets(listCustomWorkbenchWidgets(widgetScopeKey));
      setActivePanelIds((prev) => prev.filter((id) => id !== customWorkbenchWidgetPanelId(widgetId)));
      setWidgetNotice('Custom widget deleted.');
      if (widgetForm.editingWidgetId === widgetId) {
        clearWidgetForm();
      }
    },
    [clearWidgetForm, widgetForm.editingWidgetId, widgetScopeKey]
  );

  const saveWidget = useCallback(() => {
    try {
      const created = upsertCustomWorkbenchWidget(widgetScopeKey, {
        id: widgetForm.editingWidgetId || undefined,
        title: widgetForm.title,
        description: widgetForm.description,
        body: widgetForm.body,
        tone: widgetForm.tone,
        links:
          widgetForm.linkLabel && widgetForm.linkUrl
            ? [{ label: widgetForm.linkLabel, url: widgetForm.linkUrl }]
            : [],
      });
      setCustomWidgets(listCustomWorkbenchWidgets(widgetScopeKey));
      setActivePanelIds((prev) => {
        const panelId = customWorkbenchWidgetPanelId(created.id);
        return prev.includes(panelId) ? prev : [...prev, panelId];
      });
      setWidgetNotice(
        widgetForm.editingWidgetId
          ? `Updated widget "${created.title}".`
          : `Created widget "${created.title}".`
      );
      clearWidgetForm();
    } catch (error) {
      setWidgetNotice(error instanceof Error ? error.message : 'Unable to save widget.');
    }
  }, [clearWidgetForm, widgetForm, widgetScopeKey]);

  const copyWidgetShareCode = useCallback(
    (widgetId) => {
      const widget = customWidgetMap[widgetId];
      if (!widget) return;
      const shareCode = exportCustomWorkbenchWidgetShareCode(widget);
      const copied = copyToClipboard(shareCode);
      setWidgetNotice(copied ? 'Widget share code copied to clipboard.' : 'Widget share code generated.');
      if (!copied) setWidgetImportCode(shareCode);
    },
    [customWidgetMap]
  );

  const importWidget = useCallback(() => {
    if (!String(widgetImportCode || '').trim()) {
      setWidgetNotice('Paste a widget share code first.');
      return;
    }
    try {
      const imported = importCustomWorkbenchWidgetFromShareCode(widgetScopeKey, widgetImportCode);
      setCustomWidgets(listCustomWorkbenchWidgets(widgetScopeKey));
      setActivePanelIds((prev) => {
        const panelId = customWorkbenchWidgetPanelId(imported.id);
        return prev.includes(panelId) ? prev : [...prev, panelId];
      });
      setWidgetImportCode('');
      setWidgetNotice(`Imported widget "${imported.title}".`);
    } catch (error) {
      setWidgetNotice(error instanceof Error ? error.message : 'Invalid widget share code.');
    }
  }, [widgetImportCode, widgetScopeKey]);

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

  const beginPointerResize = useCallback(
    (event, panelId) => {
      event.preventDefault();
      event.stopPropagation();
      const panel = panelMap[panelId];
      if (!panel) return;
      const base = resolvePanelSizeForLayout(panel, preset.id, preset.columns, panelSizes[panelId]);
      setResizeSession({
        panelId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startColSpan: base.colSpan,
        startRowSpan: base.rowSpan,
      });
    },
    [panelMap, panelSizes, preset.columns, preset.id]
  );

  const resetLayout = () => {
    setPanelSizes({});
    setActivePanelIds(allPanels.map((panel) => panel.id));
    if (persistenceEnabled && layoutPersistenceScopeKey) {
      resetWorkbenchLayout(layoutPersistenceScopeKey);
      setMigrationNotice('Layout reset to defaults.');
    }
    setWidgetNotice('');
  };

  useEffect(() => {
    if (!resizeSession) return undefined;

    const handlePointerMove = (event) => {
      const deltaX = event.clientX - resizeSession.startX;
      const deltaY = event.clientY - resizeSession.startY;
      const colDelta = Math.round(deltaX / 140);
      const rowDelta = Math.round(deltaY / 110);
      const nextSize = {
        colSpan: clampColSpan(resizeSession.startColSpan + colDelta, preset.columns),
        rowSpan: clampRowSpan(resizeSession.startRowSpan + rowDelta),
      };
      setPanelSizes((prev) => ({
        ...prev,
        [resizeSession.panelId]: nextSize,
      }));
    };

    const handlePointerUp = () => {
      setResizeSession(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [preset.columns, resizeSession]);

  useEffect(() => {
    const valid = new Set(allPanels.map((panel) => panel.id));
    setActivePanelIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      for (const panel of allPanels) {
        if (!next.includes(panel.id)) next.push(panel.id);
      }
      return next;
    });
  }, [allPanels, panelSignature]);

  useEffect(() => {
    if (!Array.isArray(initialActivePanelIds) || initialActivePanelIds.length === 0) return;
    const valid = new Set(allPanels.map((panel) => panel.id));
    const filtered = initialActivePanelIds.filter((id) => valid.has(id));
    if (filtered.length === 0) return;
    setActivePanelIds((prev) => (prev.join('|') === filtered.join('|') ? prev : filtered));
  }, [Array.isArray(initialActivePanelIds) ? initialActivePanelIds.join('|') : '', allPanels, panelSignature]);

  useEffect(() => {
    if (!persistenceEnabled || !layoutPersistenceScopeKey) {
      setLayoutHydrated(true);
      return;
    }

    const loaded = loadWorkbenchLayout({
      scopeKey: layoutPersistenceScopeKey,
      fallbackPresetId: preset.id,
      availablePanelIds: allPanels.map((panel) => panel.id),
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
  }, [allPanels, persistenceEnabled, layoutPersistenceScopeKey, panelSignature]);

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
      panels: allPanels,
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
  }, [allPanels, activePanelIds.join('|'), JSON.stringify(panelSizes), preset.id, preset.columns]);

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
      {widgetNotice ? (
        <div className="px-3 py-1.5 text-[11px] text-zinc-400 border-b border-zinc-800 bg-zinc-900/40">{widgetNotice}</div>
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
                            className={`min-h-0 relative ${dragSnapshot.isDragging ? 'opacity-95 ring-1 ring-orange-500/50 rounded-md' : ''}`}
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
                                      title={`Decrease width of ${panel.title}`}
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-7 w-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 grid place-items-center"
                                      aria-label={`Increase width of ${panel.title}`}
                                      onClick={() => resizePanel(panel.id, 'col', 1)}
                                      title={`Increase width of ${panel.title}`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-7 w-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 grid place-items-center"
                                      aria-label={`Decrease height of ${panel.title}`}
                                      onClick={() => resizePanel(panel.id, 'row', -1)}
                                      title={`Decrease height of ${panel.title}`}
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-7 w-7 rounded border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 grid place-items-center"
                                      aria-label={`Increase height of ${panel.title}`}
                                      onClick={() => resizePanel(panel.id, 'row', 1)}
                                      title={`Increase height of ${panel.title}`}
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
                                <PanelComponent
                                  panelId={panel.id}
                                  bridgeId={bridgeId}
                                  customWorkbenchWidgetMap={customWidgetMap}
                                  onEditCustomWorkbenchWidget={editWidget}
                                  onDeleteCustomWorkbenchWidget={deleteWidget}
                                  {...panelComponentProps}
                                />
                              </PanelFrame>
                            </PanelErrorBoundary>
                            <button
                              type="button"
                              className="absolute bottom-2 right-2 h-6 w-6 rounded border border-zinc-700 bg-zinc-900/75 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 grid place-items-center"
                              onPointerDown={(event) => beginPointerResize(event, panel.id)}
                              aria-label={`Drag to resize ${panel.title}`}
                              title={`Drag to resize ${panel.title}`}
                            >
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            </button>
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
              Drag by header handle, resize by edge grip or +/- controls, and create/share custom widgets.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-4 overflow-y-auto max-h-[calc(100vh-6rem)] pr-1">
            <section className="rounded border border-zinc-800 bg-zinc-900/55 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs uppercase tracking-widest text-zinc-300">Create Custom Widget</h3>
                {widgetForm.editingWidgetId ? <NexusBadge tone="warning">Editing</NexusBadge> : <NexusBadge tone="active">New</NexusBadge>}
              </div>
              <input
                value={widgetForm.title}
                onChange={(event) => applyWidgetFormUpdate({ title: event.target.value })}
                placeholder="Widget title"
                className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              />
              <input
                value={widgetForm.description}
                onChange={(event) => applyWidgetFormUpdate({ description: event.target.value })}
                placeholder="Description (optional)"
                className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              />
              <textarea
                value={widgetForm.body}
                onChange={(event) => applyWidgetFormUpdate({ body: event.target.value })}
                placeholder="Widget body (notes, checklist hints, links summary)"
                className="h-24 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={widgetForm.tone}
                  onChange={(event) => applyWidgetFormUpdate({ tone: event.target.value })}
                  className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                  aria-label="Widget tone"
                >
                  <option value="experimental">Experimental</option>
                  <option value="active">Active</option>
                  <option value="ok">OK</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                  <option value="neutral">Neutral</option>
                </select>
                <input
                  value={widgetForm.linkLabel}
                  onChange={(event) => applyWidgetFormUpdate({ linkLabel: event.target.value })}
                  placeholder="Link label"
                  className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                />
                <input
                  value={widgetForm.linkUrl}
                  onChange={(event) => applyWidgetFormUpdate({ linkUrl: event.target.value })}
                  placeholder="https://..."
                  className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <NexusButton size="sm" intent="primary" onClick={saveWidget}>
                  {widgetForm.editingWidgetId ? 'Update Widget' : 'Create Widget'}
                </NexusButton>
                <NexusButton size="sm" intent="subtle" onClick={clearWidgetForm}>
                  Clear
                </NexusButton>
              </div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/55 p-3 space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-zinc-300">Share / Import Widget</h3>
              <textarea
                value={widgetImportCode}
                onChange={(event) => setWidgetImportCode(event.target.value)}
                placeholder="Paste NXW1 share code here"
                className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              />
              <div className="flex items-center gap-2">
                <NexusButton size="sm" intent="primary" onClick={importWidget}>
                  Import
                </NexusButton>
                <NexusButton
                  size="sm"
                  intent="subtle"
                  onClick={() => {
                    const firstWidget = customWidgets[0];
                    if (!firstWidget) {
                      setWidgetNotice('Create a widget first to export.');
                      return;
                    }
                    copyWidgetShareCode(firstWidget.id);
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy First Widget Code
                </NexusButton>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-zinc-300">Registered Panels</h3>
            {allPanels.map((panel) => {
              const isActive = activePanelIds.includes(panel.id);
              const customWidgetId = parseCustomWorkbenchWidgetPanelId(panel.id);
              return (
                <div key={panel.id} className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-200 truncate">{panel.title}</div>
                    <div className="text-[11px] text-zinc-500">{panel.id}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive ? (
                      <NexusBadge tone="ok">Active</NexusBadge>
                    ) : (
                      <NexusButton size="sm" intent="primary" onClick={() => addPanel(panel.id)}>
                        Add
                      </NexusButton>
                    )}
                    {customWidgetId ? (
                      <>
                        <NexusButton size="sm" intent="subtle" onClick={() => editWidget(customWidgetId)}>
                          Edit
                        </NexusButton>
                        <NexusButton size="sm" intent="subtle" onClick={() => copyWidgetShareCode(customWidgetId)}>
                          Share
                        </NexusButton>
                        <NexusButton size="sm" intent="subtle" onClick={() => deleteWidget(customWidgetId)}>
                          Delete
                        </NexusButton>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {inactivePanels.length === 0 ? (
              <div className="text-xs text-zinc-500 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                All registered panels are currently active.
              </div>
            ) : null}
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
