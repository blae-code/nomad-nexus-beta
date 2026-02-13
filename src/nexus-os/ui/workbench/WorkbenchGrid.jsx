import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getUserOperationPreference } from '../../services/operationEnhancementService';
import { recommendWorkspaceActivityPacks } from '../../services/workspaceConfigurationService';

function clampRowSpan(value) {
  return Math.max(MIN_ROW_SPAN, Math.min(MAX_ROW_SPAN, value));
}

function clampColSpan(value, columns) {
  return Math.max(1, Math.min(columns, value));
}

const DEFAULT_WIDGET_TONE = 'experimental';
const MAX_ROW_SPAN = 8;
const MIN_ROW_SPAN = 1;
const DEFAULT_WIDGET_COL_SPAN = 1;
const DEFAULT_WIDGET_ROW_SPAN = 2;
const WORKSPACE_CAPSULE_PREFIX = 'NXWS1';
const PRESET_ATMOSPHERE = {
  GRID_2X2:
    'radial-gradient(circle at 20% 18%, rgba(255, 135, 72, 0.14), transparent 34%)',
  GRID_3_COLUMN:
    'radial-gradient(circle at 74% 26%, rgba(98, 182, 255, 0.14), transparent 36%)',
  COMMAND_LEFT:
    'radial-gradient(circle at 16% 50%, rgba(255, 194, 109, 0.14), transparent 38%)',
  OPERATIONS_HUB:
    'radial-gradient(circle at 52% 40%, rgba(87, 189, 228, 0.16), transparent 44%)',
  WIDE_MESH:
    'radial-gradient(circle at 62% 60%, rgba(77, 184, 141, 0.14), transparent 42%)',
};

const WIDGET_TEMPLATES = [
  {
    id: 'status-brief',
    label: 'Status Brief',
    title: 'Status Brief',
    description: 'Concise checkpoint for cross-team synchronization.',
    body: '- Situation\n- Risks\n- Decisions needed\n- Next checkpoint',
    tone: 'active',
    kind: 'NOTE',
    visualStyle: 'AURORA',
    colSpan: 2,
    rowSpan: 2,
  },
  {
    id: 'decision-log',
    label: 'Decision Log',
    title: 'Decision Log',
    description: 'Capture decisions with owners and timestamps.',
    body: '- Decision\n- Owner\n- Why now\n- Follow-up trigger',
    tone: 'warning',
    kind: 'TIMELINE',
    visualStyle: 'CONSOLE',
    colSpan: 1,
    rowSpan: 2,
  },
  {
    id: 'handoff',
    label: 'Handoff Card',
    title: 'Handoff Card',
    description: 'Shift-change handoff and continuity checklist.',
    body: '- Outgoing summary\n- Open blockers\n- Assigned responders\n- Next update window',
    tone: 'ok',
    kind: 'CHECKLIST',
    visualStyle: 'SURFACE',
    colSpan: 1,
    rowSpan: 2,
  },
];

function copyToClipboard(value) {
  if (!String(value || '').trim()) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(() => {});
    return true;
  }
  return false;
}

function encodeBase64Url(value) {
  if (typeof btoa === 'function') {
    const bytes = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    return btoa(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  if (typeof atob === 'function') {
    const bytes = atob(padded);
    const encoded = Array.from(bytes)
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('');
    return decodeURIComponent(encoded);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
}

function createWidgetFormState(overrides = {}) {
  return {
    editingWidgetId: '',
    title: '',
    description: '',
    body: '',
    tone: DEFAULT_WIDGET_TONE,
    kind: 'NOTE',
    visualStyle: 'STANDARD',
    linkLabel: '',
    linkUrl: '',
    colSpan: DEFAULT_WIDGET_COL_SPAN,
    rowSpan: DEFAULT_WIDGET_ROW_SPAN,
    ...overrides,
  };
}

function parsePromptKeywords(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function guessWidgetFromPrompt(prompt, actorPreference) {
  const text = String(prompt || '').trim();
  if (!text) throw new Error('Provide a short brief before generating.');
  const keywords = parsePromptKeywords(text);
  const hasMetricIntent = keywords.some((entry) => ['metric', 'kpi', 'trend', 'score', 'ratio', 'chart'].includes(entry));
  const hasChecklistIntent = keywords.some((entry) => ['checklist', 'todo', 'tasks', 'steps', 'runbook'].includes(entry));
  const hasTimelineIntent = keywords.some((entry) => ['timeline', 'history', 'log', 'events', 'handoff'].includes(entry));
  const roleHints = actorPreference?.preferredRoles || [];
  const activityHints = actorPreference?.activityTags || [];
  const focusTokens = [...roleHints.slice(0, 2), ...activityHints.slice(0, 2)].filter(Boolean);
  const titleSeed = text.length > 46 ? `${text.slice(0, 43)}...` : text;

  if (hasMetricIntent) {
    return {
      title: `Metric: ${titleSeed}`,
      description: `Generated from your brief${focusTokens.length ? ` (${focusTokens.join(', ')})` : ''}.`,
      body: 'Readiness: 74\nCoverage: 61\nRisk Delta: -8\nSignal Quality: 82',
      kind: 'METRIC',
      visualStyle: 'CONSOLE',
      tone: 'active',
      colSpan: 2,
      rowSpan: 2,
    };
  }
  if (hasChecklistIntent) {
    return {
      title: `Checklist: ${titleSeed}`,
      description: `Generated checklist for ${focusTokens[0] || 'operation prep'}.`,
      body: '- Confirm objective scope\n- Confirm role assignments\n- Validate comms + fallback\n- Post launch checkpoint',
      kind: 'CHECKLIST',
      visualStyle: 'SURFACE',
      tone: 'ok',
      colSpan: 2,
      rowSpan: 2,
    };
  }
  if (hasTimelineIntent) {
    return {
      title: `Timeline: ${titleSeed}`,
      description: 'Generated event timeline template.',
      body: '- Phase 1: Setup\n- Phase 2: Execute\n- Phase 3: Recover\n- Phase 4: Debrief',
      kind: 'TIMELINE',
      visualStyle: 'AURORA',
      tone: 'warning',
      colSpan: 2,
      rowSpan: 2,
    };
  }
  return {
    title: `Brief: ${titleSeed}`,
    description: `Generated workspace note${focusTokens.length ? ` aligned to ${focusTokens.join(', ')}` : ''}.`,
    body: text,
    kind: 'NOTE',
    visualStyle: 'STANDARD',
    tone: 'experimental',
    colSpan: 2,
    rowSpan: 2,
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
  defaultActivationMode = 'all',
  enableOnboardingExperience = false,
  workspaceUserDisplayName = 'Operator',
  onCompleteOnboarding,
  atmosphereMode = 'standard',
}) {
  const vars = getNexusCssVars();
  const reducedMotion = useReducedMotion();
  const [isPanelDrawerOpen, setIsPanelDrawerOpen] = useState(false);
  const [panelSizes, setPanelSizes] = useState({});
  const [layoutHydrated, setLayoutHydrated] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState('');
  const [widgetNotice, setWidgetNotice] = useState('');
  const [customWidgets, setCustomWidgets] = useState([]);
  const [widgetForm, setWidgetForm] = useState(() => createWidgetFormState());
  const [widgetImportCode, setWidgetImportCode] = useState('');
  const [workspaceImportCode, setWorkspaceImportCode] = useState('');
  const [selectedShareWidgetId, setSelectedShareWidgetId] = useState('');
  const [selectedActivityPackId, setSelectedActivityPackId] = useState('');
  const [panelSearchQuery, setPanelSearchQuery] = useState('');
  const [widgetPrompt, setWidgetPrompt] = useState('');
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [resizeSession, setResizeSession] = useState(null);
  const resizeRafRef = useRef(0);
  const widgetScopeKey = useMemo(() => {
    if (layoutPersistenceScopeKey) return `${layoutPersistenceScopeKey}:custom`;
    return `bridge:${String(bridgeId || 'global').toLowerCase()}`;
  }, [bridgeId, layoutPersistenceScopeKey]);
  const hasExplicitInitialPanels = Array.isArray(initialActivePanelIds);
  const [activePanelIds, setActivePanelIds] = useState(() => {
    if (Array.isArray(initialActivePanelIds)) {
      return [...initialActivePanelIds];
    }
    return defaultActivationMode === 'empty' ? [] : panels.map((panel) => panel.id);
  });

  const preset = WORKBENCH_PRESETS[presetId] || WORKBENCH_PRESETS[DEFAULT_WORKBENCH_PRESET_ID];
  const minimalAtmosphere = atmosphereMode === 'minimal';
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
  const hasVisiblePanels = activePanels.length > 0;

  const inactivePanels = useMemo(() => {
    return allPanels.filter((panel) => !activePanelIds.includes(panel.id));
  }, [allPanels, activePanelIds]);
  const filteredPanels = useMemo(() => {
    const token = String(panelSearchQuery || '').trim().toLowerCase();
    if (!token) return allPanels;
    return allPanels.filter((panel) => {
      const title = String(panel.title || '').toLowerCase();
      const id = String(panel.id || '').toLowerCase();
      return title.includes(token) || id.includes(token);
    });
  }, [allPanels, panelSearchQuery]);
  const actorId = String(panelComponentProps?.actorId || '').trim();
  const actorPreference = useMemo(
    () => (actorId ? getUserOperationPreference(actorId) : null),
    [actorId]
  );
  const recommendedTemplates = useMemo(() => {
    if (!actorPreference) return WIDGET_TEMPLATES;
    const roleToken = String(actorPreference.preferredRoles?.[0] || '').toLowerCase();
    const activityToken = String(actorPreference.activityTags?.[0] || '').toLowerCase();
    const roleTemplate = {
      id: 'role-focus',
      label: 'Role Focus',
      title: `${actorPreference.preferredRoles?.[0] || 'Role'} Focus`,
      description: 'Preference-aligned role activity panel.',
      body: `- Preferred role: ${actorPreference.preferredRoles?.join(', ') || 'none'}\n- Activities: ${actorPreference.activityTags?.join(', ') || 'none'}\n- Availability: ${actorPreference.availability || 'AUTO'}`,
      tone: roleToken.includes('lead') ? 'active' : 'ok',
      kind: activityToken.includes('metric') ? 'METRIC' : 'NOTE',
      visualStyle: activityToken.includes('ship') ? 'CONSOLE' : 'AURORA',
      colSpan: 2,
      rowSpan: 2,
    };
    return [roleTemplate, ...WIDGET_TEMPLATES];
  }, [actorPreference]);
  const activityPacks = useMemo(
    () =>
      recommendWorkspaceActivityPacks({
        activityTags: actorPreference?.activityTags || [],
        availablePanelIds: allPanels.map((panel) => panel.id),
        maxPacks: 4,
      }),
    [actorPreference, allPanels]
  );
  const selectedActivityPack = useMemo(() => {
    if (activityPacks.length === 0) return null;
    return activityPacks.find((pack) => pack.id === selectedActivityPackId) || activityPacks[0];
  }, [activityPacks, selectedActivityPackId]);
  const onboardingVisible = enableOnboardingExperience && !onboardingDismissed && !hasVisiblePanels;
  const fallbackStarterPanelIds = useMemo(() => {
    if (allPanels.length === 0) return [];
    const preferred = allPanels.filter((panel) => {
      const token = `${panel.id} ${panel.title}`.toLowerCase();
      return (
        token.includes('command') ||
        token.includes('map') ||
        token.includes('team') ||
        token.includes('feed') ||
        token.includes('comms')
      );
    });
    const pool = preferred.length >= 3 ? preferred : allPanels;
    return pool.slice(0, Math.min(3, pool.length)).map((panel) => panel.id);
  }, [allPanels]);
  const starterPanelIds = useMemo(
    () => (selectedActivityPack?.panelIds?.length ? selectedActivityPack.panelIds : fallbackStarterPanelIds),
    [fallbackStarterPanelIds, selectedActivityPack]
  );

  const completeOnboarding = useCallback(() => {
    if (onboardingDismissed) return;
    setOnboardingDismissed(true);
    onCompleteOnboarding?.();
  }, [onboardingDismissed, onCompleteOnboarding]);

  useEffect(() => {
    setCustomWidgets(listCustomWorkbenchWidgets(widgetScopeKey));
  }, [widgetScopeKey]);

  useEffect(() => {
    if (customWidgets.length === 0) {
      setSelectedShareWidgetId('');
      return;
    }
    setSelectedShareWidgetId((prev) => (prev && customWidgets.some((widget) => widget.id === prev) ? prev : customWidgets[0].id));
  }, [customWidgets]);

  useEffect(() => {
    if (activityPacks.length === 0) {
      setSelectedActivityPackId('');
      return;
    }
    setSelectedActivityPackId((prev) => (prev && activityPacks.some((pack) => pack.id === prev) ? prev : activityPacks[0].id));
  }, [activityPacks]);

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
      const currentSize = panelSizes[customWorkbenchWidgetPanelId(widget.id)] || {};
      applyWidgetFormUpdate({
        editingWidgetId: widget.id,
        title: widget.title || '',
        description: widget.description || '',
        body: widget.body || '',
        tone: widget.tone || DEFAULT_WIDGET_TONE,
        kind: widget.kind || 'NOTE',
        visualStyle: widget.visualStyle || 'STANDARD',
        linkLabel: widget.links?.[0]?.label || '',
        linkUrl: widget.links?.[0]?.url || '',
        colSpan: clampColSpan(Number(currentSize.colSpan) || DEFAULT_WIDGET_COL_SPAN, preset.columns),
        rowSpan: clampRowSpan(Number(currentSize.rowSpan) || DEFAULT_WIDGET_ROW_SPAN),
      });
      setWidgetNotice(`Editing widget "${widget.title}".`);
      setIsPanelDrawerOpen(true);
    },
    [applyWidgetFormUpdate, customWidgetMap, panelSizes, preset.columns]
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
        kind: widgetForm.kind,
        visualStyle: widgetForm.visualStyle,
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
      const panelId = customWorkbenchWidgetPanelId(created.id);
      setPanelSizes((prev) => ({
        ...prev,
        [panelId]: {
          colSpan: clampColSpan(Number(widgetForm.colSpan) || DEFAULT_WIDGET_COL_SPAN, preset.columns),
          rowSpan: clampRowSpan(Number(widgetForm.rowSpan) || DEFAULT_WIDGET_ROW_SPAN),
        },
      }));
      setWidgetNotice(
        widgetForm.editingWidgetId
          ? `Updated widget "${created.title}".`
          : `Created widget "${created.title}".`
      );
      clearWidgetForm();
      completeOnboarding();
    } catch (error) {
      setWidgetNotice(error instanceof Error ? error.message : 'Unable to save widget.');
    }
  }, [clearWidgetForm, completeOnboarding, preset.columns, widgetForm, widgetScopeKey]);

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

  const applyWidgetTemplate = useCallback(
    (templateId) => {
      const template = recommendedTemplates.find((entry) => entry.id === templateId);
      if (!template) return;
      applyWidgetFormUpdate({
        title: template.title,
        description: template.description,
        body: template.body,
        tone: template.tone,
        kind: template.kind,
        visualStyle: template.visualStyle,
        colSpan: template.colSpan,
        rowSpan: template.rowSpan,
      });
      setWidgetNotice(`Template "${template.label}" applied.`);
    },
    [applyWidgetFormUpdate, recommendedTemplates]
  );

  const generateWidgetDraftFromPrompt = useCallback(() => {
    try {
      const generated = guessWidgetFromPrompt(widgetPrompt, actorPreference);
      applyWidgetFormUpdate({
        editingWidgetId: '',
        ...generated,
      });
      setWidgetNotice('Generated widget draft from brief.');
    } catch (error) {
      setWidgetNotice(error instanceof Error ? error.message : 'Unable to generate widget draft.');
    }
  }, [actorPreference, applyWidgetFormUpdate, widgetPrompt]);

  const duplicateWidget = useCallback(
    (widgetId) => {
      const widget = customWidgetMap[widgetId];
      if (!widget) return;
      try {
        const duplicated = upsertCustomWorkbenchWidget(widgetScopeKey, {
          title: `${widget.title} Copy`,
          description: widget.description,
          body: widget.body,
          tone: widget.tone,
          kind: widget.kind,
          visualStyle: widget.visualStyle,
          links: widget.links?.map((entry) => ({ label: entry.label, url: entry.url })) || [],
          createdBy: widget.createdBy,
        });
        const sourcePanelId = customWorkbenchWidgetPanelId(widget.id);
        const duplicatedPanelId = customWorkbenchWidgetPanelId(duplicated.id);
        setCustomWidgets(listCustomWorkbenchWidgets(widgetScopeKey));
        setActivePanelIds((prev) => (prev.includes(duplicatedPanelId) ? prev : [...prev, duplicatedPanelId]));
        setPanelSizes((prev) => {
          const sourceSize = prev[sourcePanelId];
          if (!sourceSize) return prev;
          return {
            ...prev,
            [duplicatedPanelId]: sourceSize,
          };
        });
        setWidgetNotice(`Duplicated widget "${widget.title}".`);
      } catch (error) {
        setWidgetNotice(error instanceof Error ? error.message : 'Unable to duplicate widget.');
      }
    },
    [customWidgetMap, widgetScopeKey]
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
      completeOnboarding();
    } catch (error) {
      setWidgetNotice(error instanceof Error ? error.message : 'Invalid widget share code.');
    }
  }, [completeOnboarding, widgetImportCode, widgetScopeKey]);

  const exportWorkspaceCapsule = useCallback(() => {
    const payload = {
      schema: 'nexus-os-workspace-capsule',
      version: 1,
      exportedAt: new Date().toISOString(),
      presetId: preset.id,
      activePanelIds,
      panelSizes,
      widgets: customWidgets.map((widget) => ({
        id: widget.id,
        title: widget.title,
        description: widget.description,
        body: widget.body,
        tone: widget.tone,
        kind: widget.kind,
        visualStyle: widget.visualStyle,
        links: widget.links?.map((entry) => ({ label: entry.label, url: entry.url })) || [],
        createdBy: widget.createdBy,
      })),
    };
    const capsule = `${WORKSPACE_CAPSULE_PREFIX}.${encodeBase64Url(JSON.stringify(payload))}`;
    const copied = copyToClipboard(capsule);
    setWidgetNotice(copied ? 'Workspace capsule copied to clipboard.' : 'Workspace capsule generated.');
    if (!copied) setWorkspaceImportCode(capsule);
  }, [activePanelIds, customWidgets, panelSizes, preset.id]);

  const importWorkspaceCapsule = useCallback(() => {
    const raw = String(workspaceImportCode || '').trim();
    if (!raw) {
      setWidgetNotice('Paste a workspace capsule first.');
      return;
    }
    try {
      const encoded = raw.startsWith(`${WORKSPACE_CAPSULE_PREFIX}.`) ? raw.slice(`${WORKSPACE_CAPSULE_PREFIX}.`.length) : raw;
      const parsed = JSON.parse(decodeBase64Url(encoded));
      if (!parsed || parsed.schema !== 'nexus-os-workspace-capsule' || parsed.version !== 1) {
        throw new Error('Invalid workspace capsule.');
      }

      if (typeof parsed.presetId === 'string' && WORKBENCH_PRESETS[parsed.presetId]) {
        onPresetChange?.(parsed.presetId);
      }

      if (Array.isArray(parsed.widgets)) {
        for (const widget of parsed.widgets) {
          upsertCustomWorkbenchWidget(widgetScopeKey, {
            id: widget.id,
            title: widget.title,
            description: widget.description,
            body: widget.body,
            tone: widget.tone,
            kind: widget.kind,
            visualStyle: widget.visualStyle,
            links: Array.isArray(widget.links)
              ? widget.links.map((entry) => ({ label: entry?.label, url: entry?.url }))
              : [],
            createdBy: widget.createdBy,
          });
        }
      }

      const refreshedWidgets = listCustomWorkbenchWidgets(widgetScopeKey);
      const validPanelIds = new Set([
        ...panels.map((panel) => panel.id),
        ...refreshedWidgets.map((widget) => customWorkbenchWidgetPanelId(widget.id)),
      ]);

      const nextActivePanelIds = Array.isArray(parsed.activePanelIds)
        ? parsed.activePanelIds.filter((panelId) => validPanelIds.has(panelId))
        : [];
      const nextPanelSizes = {};
      if (parsed.panelSizes && typeof parsed.panelSizes === 'object') {
        for (const [panelId, size] of Object.entries(parsed.panelSizes)) {
          if (!validPanelIds.has(panelId)) continue;
          nextPanelSizes[panelId] = {
            colSpan: clampColSpan(Number(size?.colSpan) || DEFAULT_WIDGET_COL_SPAN, preset.columns),
            rowSpan: clampRowSpan(Number(size?.rowSpan) || DEFAULT_WIDGET_ROW_SPAN),
          };
        }
      }

      setCustomWidgets(refreshedWidgets);
      if (Array.isArray(parsed.activePanelIds)) setActivePanelIds(nextActivePanelIds);
      setPanelSizes(nextPanelSizes);
      setWorkspaceImportCode('');
      setWidgetNotice('Workspace capsule imported and synchronized.');
      completeOnboarding();
    } catch (error) {
      setWidgetNotice(error instanceof Error ? error.message : 'Invalid workspace capsule.');
    }
  }, [completeOnboarding, onPresetChange, panels, preset.columns, widgetScopeKey, workspaceImportCode]);

  const addPanel = useCallback(
    (panelId) => {
      setActivePanelIds((prev) => (prev.includes(panelId) ? prev : [...prev, panelId]));
      completeOnboarding();
    },
    [completeOnboarding]
  );

  const applyActivityPack = useCallback(
    (packId) => {
      const pack = activityPacks.find((entry) => entry.id === packId);
      if (!pack) return false;
      if (pack.presetId && WORKBENCH_PRESETS[pack.presetId] && pack.presetId !== preset.id) {
        onPresetChange?.(pack.presetId);
      }
      setActivePanelIds(pack.panelIds);
      setPanelSizes(pack.panelSizes || {});
      setSelectedActivityPackId(pack.id);
      setWidgetNotice(`Applied "${pack.label}" workspace pack.`);
      completeOnboarding();
      return true;
    },
    [activityPacks, completeOnboarding, onPresetChange, preset.id]
  );

  const activateStarterPack = useCallback(() => {
    if (selectedActivityPack?.id) {
      const applied = applyActivityPack(selectedActivityPack.id);
      if (applied) return;
    }
    if (starterPanelIds.length === 0) {
      setWidgetNotice('No starter panels registered yet.');
      setIsPanelDrawerOpen(true);
      return;
    }
    setActivePanelIds((prev) => {
      const next = [...prev];
      for (const panelId of starterPanelIds) {
        if (!next.includes(panelId)) next.push(panelId);
      }
      return next;
    });
    setWidgetNotice('Starter workspace activated.');
    completeOnboarding();
  }, [applyActivityPack, completeOnboarding, selectedActivityPack?.id, starterPanelIds]);

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
    setActivePanelIds(onboardingVisible ? [] : allPanels.map((panel) => panel.id));
    if (persistenceEnabled && layoutPersistenceScopeKey) {
      resetWorkbenchLayout(layoutPersistenceScopeKey);
      setMigrationNotice('Layout reset to defaults.');
    }
    setWidgetNotice('');
  };

  useEffect(() => {
    if (!resizeSession) return undefined;
    let latestX = resizeSession.startX;
    let latestY = resizeSession.startY;

    const applyResize = () => {
      resizeRafRef.current = 0;
      const deltaX = latestX - resizeSession.startX;
      const deltaY = latestY - resizeSession.startY;
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

    const handlePointerMove = (event) => {
      latestX = event.clientX;
      latestY = event.clientY;
      if (resizeRafRef.current) return;
      resizeRafRef.current = requestAnimationFrame(applyResize);
    };

    const handlePointerUp = () => {
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = 0;
      }
      setResizeSession(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = 0;
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [preset.columns, resizeSession]);

  useEffect(() => {
    const valid = new Set(allPanels.map((panel) => panel.id));
    setActivePanelIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [allPanels, panelSignature]);

  useEffect(() => {
    if (!hasExplicitInitialPanels) return;
    const valid = new Set(allPanels.map((panel) => panel.id));
    const filtered = initialActivePanelIds.filter((id) => valid.has(id));
    setActivePanelIds((prev) => (prev.join('|') === filtered.join('|') ? prev : filtered));
  }, [allPanels, hasExplicitInitialPanels, initialActivePanelIds, panelSignature]);

  useEffect(() => {
    if (!enableOnboardingExperience || onboardingDismissed || !hasVisiblePanels) return;
    completeOnboarding();
  }, [completeOnboarding, enableOnboardingExperience, hasVisiblePanels, onboardingDismissed]);

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
    <div
      className={`h-full min-h-[28rem] md:min-h-[34rem] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 flex flex-col relative ${minimalAtmosphere ? '' : 'nexus-panel-glow'}`.trim()}
      style={{
        ...vars,
        backgroundColor: 'var(--nx-shell-bg-elevated)',
        borderColor: 'var(--nx-border)',
        contain: 'layout paint style',
        overflow: 'clip',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
    >
      {minimalAtmosphere ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 10%, rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.08), transparent 40%), radial-gradient(circle at 85% 80%, rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.07), transparent 44%)',
          }}
        />
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-0 opacity-95"
            style={{
              backgroundImage:
                `${PRESET_ATMOSPHERE[preset.id] || PRESET_ATMOSPHERE.GRID_2X2}, radial-gradient(circle at 14% 12%, rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)),0.18), transparent 40%), radial-gradient(circle at 86% 82%, rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)),0.16), transparent 46%), repeating-linear-gradient(0deg, rgba(var(--nx-bridge-c-rgb, var(--nx-bridge-c-rgb-base)),0.055) 0px, rgba(var(--nx-bridge-c-rgb, var(--nx-bridge-c-rgb-base)),0.055) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)),0.04) 0px, rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)),0.04) 1px, transparent 1px, transparent 52px)`,
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgba(0,0,0,0.45)_100%)]" />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent, rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.42), transparent)',
            }}
          />
        </>
      )}
      <div
        className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2"
        style={{
          borderColor: 'var(--nx-border)',
          backgroundImage:
            'linear-gradient(180deg, rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.13), rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.05) 42%, rgba(0,0,0,0))',
        }}
      >
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

      <div className={`flex-1 min-h-0 overflow-hidden p-3 ${minimalAtmosphere ? '' : 'bg-[radial-gradient(circle_at_top,rgba(102,162,212,0.06),transparent_36%)]'}`}>
        <AnimatedMount show durationMs={reducedMotion ? 0 : motionTokens.duration.fast} fromOpacity={0.92} toOpacity={1} fromY={3} toY={0} className="h-full min-h-0">
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
                  className={`h-full min-h-0 grid gap-3 overflow-auto overflow-x-hidden overscroll-contain ${dropSnapshot.isDraggingOver ? 'outline outline-1 outline-sky-500/40' : ''}`}
                  style={{
                    gridTemplateColumns: `repeat(${preset.columns}, minmax(0, 1fr))`,
                    gridAutoRows: `${preset.minRowHeightPx}px`,
                    alignContent: 'start',
                    minHeight: '100%',
                    scrollbarGutter: 'stable',
                  }}
                  aria-label="Workbench panel layout"
                >
                  {!hasVisiblePanels ? (
                    <div
                      className="rounded-lg border border-zinc-800/90 bg-[linear-gradient(180deg,rgba(18,24,32,0.82),rgba(10,14,20,0.9))] p-5 text-zinc-200 flex flex-col items-start justify-between gap-3 shadow-[inset_0_0_0_1px_rgba(98,164,215,0.08)]"
                      style={{ gridColumn: `1 / span ${preset.columns}`, minHeight: Math.max(260, preset.minRowHeightPx * 4) }}
                    >
                      <div className="space-y-1 w-full">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                          {onboardingVisible ? 'NexusOS Guided Workspace' : 'NexusOS Desktop'}
                        </div>
                        <h3
                          className="text-sm sm:text-base font-semibold uppercase tracking-[0.1em]"
                          style={{ color: 'rgba(var(--nx-bridge-c-rgb, var(--nx-bridge-c-rgb-base)), 0.96)' }}
                        >
                          {onboardingVisible ? `Welcome, ${workspaceUserDisplayName}` : 'Workspace Standby'}
                        </h3>
                        <p className="text-xs text-zinc-400 max-w-2xl">
                          {onboardingVisible
                            ? 'Start from an empty desk, then stage only what you need. Use starter packs, templates, or a custom brief to generate bespoke widgets and visualizations.'
                            : 'No visible widgets are mounted. Restore panel visibility or open Workspace Studio to curate a cleaner layout.'}
                        </p>
                      </div>
                      {onboardingVisible ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                          <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] text-zinc-400">
                            <div className="text-zinc-300 uppercase tracking-[0.16em] text-[10px]">Step 1</div>
                            Choose a preconfigured activity pack based on your onboarding preferences.
                          </div>
                          <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] text-zinc-400">
                            <div className="text-zinc-300 uppercase tracking-[0.16em] text-[10px]">Step 2</div>
                            Apply a template tuned to your preferred role and activity profile.
                          </div>
                          <div className="rounded border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] text-zinc-400">
                            <div className="text-zinc-300 uppercase tracking-[0.16em] text-[10px]">Step 3</div>
                            Generate custom widgets from a short brief, then resize and reorder.
                          </div>
                        </div>
                      ) : null}
                      {onboardingVisible && activityPacks.length > 0 ? (
                        <div className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-3 space-y-2 w-full">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Recommended Activity Packs</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activityPacks.slice(0, 4).map((pack) => {
                              const selected = selectedActivityPack?.id === pack.id;
                              return (
                                <button
                                  key={pack.id}
                                  type="button"
                                  onClick={() => setSelectedActivityPackId(pack.id)}
                                  className={`text-left rounded border px-3 py-2 transition ${
                                    selected
                                      ? 'border-sky-500/60 bg-sky-500/10'
                                      : 'border-zinc-800 bg-zinc-900/45 hover:border-zinc-600'
                                  }`}
                                >
                                  <div className="text-xs text-zinc-100">{pack.label}</div>
                                  <div className="text-[11px] text-zinc-500">{pack.description}</div>
                                  <div className="text-[10px] text-zinc-600 mt-1">{pack.panelIds.length} panels · {pack.presetId}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      {onboardingVisible ? (
                        <div className="rounded border border-zinc-800 bg-zinc-950/60 px-3 py-3 space-y-2 w-full">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Custom Widget Brief</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              value={widgetPrompt}
                              onChange={(event) => setWidgetPrompt(event.target.value)}
                              placeholder="Example: Ship gunner readiness chart with risk trend"
                              className="h-8 flex-1 min-w-[14rem] rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                            />
                            <NexusButton
                              size="sm"
                              intent="subtle"
                              onClick={() => {
                                generateWidgetDraftFromPrompt();
                                setIsPanelDrawerOpen(true);
                              }}
                            >
                              Generate Draft
                            </NexusButton>
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {actorPreference
                              ? `Aligned to preferences: roles ${actorPreference.preferredRoles.join(', ') || 'none'}; activities ${actorPreference.activityTags.join(', ') || 'none'}.`
                              : 'Set role and activity preferences to get auto-tailored templates and prompts.'}
                          </div>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        {onboardingVisible ? (
                          <NexusButton size="sm" intent="primary" onClick={activateStarterPack}>
                            Launch {selectedActivityPack?.label || 'Starter Pack'}
                          </NexusButton>
                        ) : (
                          <NexusButton
                            size="sm"
                            intent="primary"
                            onClick={() => setActivePanelIds(allPanels.map((panel) => panel.id))}
                          >
                            Restore All Panels
                          </NexusButton>
                        )}
                        <NexusButton
                          size="sm"
                          intent="subtle"
                          onClick={() => {
                            if (onboardingVisible && recommendedTemplates[0]) {
                              applyWidgetTemplate(recommendedTemplates[0].id);
                            }
                            setIsPanelDrawerOpen(true);
                          }}
                        >
                          {onboardingVisible ? 'Open Guided Studio' : 'Open Panel Drawer'}
                        </NexusButton>
                        {onboardingVisible ? (
                          <NexusButton size="sm" intent="subtle" onClick={completeOnboarding}>
                            Skip Tour
                          </NexusButton>
                        ) : null}
                        <span className="text-[11px] text-zinc-500">Use drag handles to stage panels like an OS desktop surface.</span>
                      </div>
                    </div>
                  ) : null}
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
                            className={`min-h-0 min-w-0 relative ${dragSnapshot.isDragging ? 'opacity-95 ring-1 ring-sky-500/50 rounded-md' : ''}`}
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
                                  <div className="flex items-center gap-1.5 max-w-full overflow-x-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
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
                                  onDuplicateCustomWorkbenchWidget={duplicateWidget}
                                  onShareCustomWorkbenchWidget={copyWidgetShareCode}
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
        <SheetContent side="right" className="w-[min(36rem,100vw)] bg-zinc-950 border-zinc-800 text-zinc-100">
          <SheetHeader>
            <SheetTitle className="uppercase tracking-wide" style={{ color: 'rgba(var(--nx-bridge-c-rgb, var(--nx-bridge-c-rgb-base)), 0.92)' }}>
              Workspace Studio
            </SheetTitle>
            <SheetDescription className="text-zinc-500">
              Build custom widgets, share full workspace capsules, and curate panel staging for collaborative loops.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-4 overflow-y-auto overscroll-contain max-h-[calc(100vh-6rem)] pr-1" style={{ scrollbarGutter: 'stable' }}>
            <section className="rounded border border-zinc-800 bg-zinc-900/55 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs uppercase tracking-widest text-zinc-300">Activity Packs</h3>
                <NexusBadge tone="neutral">{activityPacks.length}</NexusBadge>
              </div>
              {activityPacks.length > 0 ? (
                <div className="space-y-2">
                  {activityPacks.map((pack) => {
                    const selected = selectedActivityPack?.id === pack.id;
                    return (
                      <div
                        key={pack.id}
                        className={`rounded border px-2 py-2 ${selected ? 'border-sky-500/60 bg-sky-500/10' : 'border-zinc-800 bg-zinc-950/55'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs text-zinc-100 truncate">{pack.label}</div>
                            <div className="text-[10px] text-zinc-500 truncate">{pack.description}</div>
                          </div>
                          <NexusButton
                            size="sm"
                            intent={selected ? 'primary' : 'subtle'}
                            onClick={() => applyActivityPack(pack.id)}
                          >
                            Apply
                          </NexusButton>
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1">
                          {pack.panelIds.length} panels · {pack.presetId}
                          {pack.matchedTags.length > 0 ? ` · tags: ${pack.matchedTags.join(', ')}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-zinc-500 rounded border border-zinc-800 bg-zinc-950/55 p-2">
                  No themed packs available for the current panel registry.
                </div>
              )}
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/55 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs uppercase tracking-widest text-zinc-300">Widget Studio</h3>
                {widgetForm.editingWidgetId ? <NexusBadge tone="warning">Editing</NexusBadge> : <NexusBadge tone="active">New</NexusBadge>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {recommendedTemplates.map((template) => (
                  <NexusButton key={template.id} size="sm" intent="subtle" onClick={() => applyWidgetTemplate(template.id)}>
                    {template.label}
                  </NexusButton>
                ))}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-2 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Generate from brief</div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={widgetPrompt}
                    onChange={(event) => setWidgetPrompt(event.target.value)}
                    placeholder="Describe the widget or visualization you need"
                    className="h-8 flex-1 min-w-[12rem] rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                  />
                  <NexusButton size="sm" intent="subtle" onClick={generateWidgetDraftFromPrompt}>
                    Generate Draft
                  </NexusButton>
                </div>
                {actorPreference ? (
                  <div className="text-[10px] text-zinc-500">
                    Role alignment: {actorPreference.preferredRoles.join(', ') || 'none'} | Activity alignment:{' '}
                    {actorPreference.activityTags.join(', ') || 'none'}
                  </div>
                ) : null}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <select
                  value={widgetForm.kind}
                  onChange={(event) => applyWidgetFormUpdate({ kind: event.target.value })}
                  className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                  aria-label="Widget kind"
                >
                  <option value="NOTE">Note</option>
                  <option value="CHECKLIST">Checklist</option>
                  <option value="METRIC">Metric</option>
                  <option value="TIMELINE">Timeline</option>
                </select>
                <select
                  value={widgetForm.visualStyle}
                  onChange={(event) => applyWidgetFormUpdate({ visualStyle: event.target.value })}
                  className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                  aria-label="Widget visual style"
                >
                  <option value="STANDARD">Standard</option>
                  <option value="CONSOLE">Console</option>
                  <option value="AURORA">Aurora</option>
                  <option value="SURFACE">Surface</option>
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
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-zinc-500 flex flex-col gap-1">
                  Width span
                  <input
                    type="number"
                    min={1}
                    max={preset.columns}
                    value={widgetForm.colSpan}
                    onChange={(event) =>
                      applyWidgetFormUpdate({
                        colSpan: clampColSpan(Number(event.target.value) || DEFAULT_WIDGET_COL_SPAN, preset.columns),
                      })
                    }
                    className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                  />
                </label>
                <label className="text-[11px] text-zinc-500 flex flex-col gap-1">
                  Height span
                  <input
                    type="number"
                    min={MIN_ROW_SPAN}
                    max={MAX_ROW_SPAN}
                    value={widgetForm.rowSpan}
                    onChange={(event) =>
                      applyWidgetFormUpdate({
                        rowSpan: clampRowSpan(Number(event.target.value) || DEFAULT_WIDGET_ROW_SPAN),
                      })
                    }
                    className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                  />
                </label>
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-2 space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Preview</div>
                <div className="text-sm text-zinc-200 truncate">{widgetForm.title || 'Untitled widget'}</div>
                <div className="text-[11px] text-zinc-500 line-clamp-2">{widgetForm.description || 'No description yet.'}</div>
                <div className="text-[10px] text-zinc-500">{widgetForm.kind} · {widgetForm.visualStyle}</div>
                <div className="text-[10px] text-zinc-600">Span {widgetForm.colSpan}x{widgetForm.rowSpan}</div>
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
              {customWidgets.length > 0 ? (
                <select
                  value={selectedShareWidgetId}
                  onChange={(event) => setSelectedShareWidgetId(event.target.value)}
                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                  aria-label="Widget to share"
                >
                  {customWidgets.map((widget) => (
                    <option key={widget.id} value={widget.id}>
                      {widget.title}
                    </option>
                  ))}
                </select>
              ) : null}
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
                    if (!selectedShareWidgetId) {
                      setWidgetNotice('Create a widget first to export.');
                      return;
                    }
                    copyWidgetShareCode(selectedShareWidgetId);
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy Widget Code
                </NexusButton>
              </div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/55 p-3 space-y-2">
              <h3 className="text-xs uppercase tracking-widest text-zinc-300">Workspace Capsule</h3>
              <textarea
                value={workspaceImportCode}
                onChange={(event) => setWorkspaceImportCode(event.target.value)}
                placeholder="Paste NXWS1 workspace capsule here"
                className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              />
              <div className="flex items-center gap-2">
                <NexusButton size="sm" intent="primary" onClick={importWorkspaceCapsule}>
                  Import Capsule
                </NexusButton>
                <NexusButton size="sm" intent="subtle" onClick={exportWorkspaceCapsule}>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy Capsule
                </NexusButton>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs uppercase tracking-widest text-zinc-300">Registered Panels</h3>
                <NexusBadge tone="neutral">{filteredPanels.length}</NexusBadge>
              </div>
              <input
                value={panelSearchQuery}
                onChange={(event) => setPanelSearchQuery(event.target.value)}
                placeholder="Filter panels by title or id"
                className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              />
            {filteredPanels.map((panel) => {
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
                        <NexusButton size="sm" intent="subtle" onClick={() => duplicateWidget(customWidgetId)}>
                          Duplicate
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
            {filteredPanels.length === 0 ? (
              <div className="text-xs text-zinc-500 rounded border border-zinc-800 bg-zinc-900/50 p-3">
                No panels match this filter.
              </div>
            ) : null}
            {inactivePanels.length === 0 && filteredPanels.length > 0 ? (
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
