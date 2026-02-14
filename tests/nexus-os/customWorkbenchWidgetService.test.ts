import { beforeEach, describe, expect, it } from 'vitest';
import {
  customWorkbenchWidgetPanelId,
  exportCustomWorkbenchWidgetShareCode,
  importCustomWorkbenchWidgetFromShareCode,
  listCustomWorkbenchWidgets,
  parseCustomWorkbenchWidgetPanelId,
  removeCustomWorkbenchWidget,
  resetCustomWorkbenchWidgetStore,
  upsertCustomWorkbenchWidget,
} from '../../src/components/nexus-os/services/customWorkbenchWidgetService';

describe('customWorkbenchWidgetService', () => {
  beforeEach(() => {
    resetCustomWorkbenchWidgetStore();
  });

  it('creates, updates, and removes widgets by scope', () => {
    const scopeA = 'bridge:alpha';
    const scopeB = 'bridge:bravo';

    const created = upsertCustomWorkbenchWidget(
      scopeA,
      {
        title: 'Ops Checklist',
        body: '1. Confirm comms',
        tone: 'warning',
      },
      1_736_000_000_000
    );

    const updated = upsertCustomWorkbenchWidget(
      scopeA,
      {
        id: created.id,
        title: 'Ops Checklist',
        body: '1. Confirm comms\n2. Confirm medevac',
        tone: 'warning',
      },
      1_736_000_030_000
    );

    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).not.toBe(created.updatedAt);
    expect(updated.tags).toEqual([]);
    expect(updated.isPinned).toBe(false);

    expect(listCustomWorkbenchWidgets(scopeA)).toHaveLength(1);
    expect(listCustomWorkbenchWidgets(scopeA)[0].body).toContain('medevac');
    expect(listCustomWorkbenchWidgets(scopeB)).toHaveLength(0);

    expect(removeCustomWorkbenchWidget(scopeA, created.id)).toBe(true);
    expect(removeCustomWorkbenchWidget(scopeA, created.id)).toBe(false);
    expect(listCustomWorkbenchWidgets(scopeA)).toHaveLength(0);
  });

  it('encodes and parses panel ids for custom widgets', () => {
    const panelId = customWorkbenchWidgetPanelId('cw_abc123');
    expect(panelId).toBe('custom-widget:cw_abc123');
    expect(parseCustomWorkbenchWidgetPanelId(panelId)).toBe('cw_abc123');
    expect(parseCustomWorkbenchWidgetPanelId('core:map-panel')).toBeNull();
  });

  it('exports and imports share codes', () => {
    const sourceScope = 'bridge:source';
    const targetScope = 'bridge:target';
    const source = upsertCustomWorkbenchWidget(
      sourceScope,
      {
        title: 'Rescue SOP',
        description: 'Pinned command fallback',
        body: 'Hold perimeter until medevac is clear.',
        tone: 'active',
        links: [{ label: 'Runbook', url: 'https://example.com/runbook' }],
        tags: ['ops', 'rescue'],
        isPinned: true,
        createdBy: 'admin-01',
      },
      1_736_100_000_000
    );

    const shareCode = exportCustomWorkbenchWidgetShareCode(source, 1_736_100_010_000);
    expect(shareCode.startsWith('NXW1.')).toBe(true);

    const imported = importCustomWorkbenchWidgetFromShareCode(
      targetScope,
      shareCode,
      1_736_100_020_000
    );

    expect(imported.id).not.toBe(source.id);
    expect(imported.title).toBe(source.title);
    expect(imported.description).toBe(source.description);
    expect(imported.body).toBe(source.body);
    expect(imported.tone).toBe(source.tone);
    expect(imported.links[0]?.url).toBe('https://example.com/runbook');
    expect(imported.tags).toEqual(['ops', 'rescue']);
    expect(imported.isPinned).toBe(true);
    expect(listCustomWorkbenchWidgets(targetScope)).toHaveLength(1);
  });

  it('prioritizes pinned widgets in scope ordering', () => {
    const scope = 'bridge:priority';
    upsertCustomWorkbenchWidget(
      scope,
      {
        title: 'Unpinned',
        body: 'Standard queue',
        isPinned: false,
      },
      1_736_200_000_000
    );
    upsertCustomWorkbenchWidget(
      scope,
      {
        title: 'Pinned',
        body: 'High visibility',
        isPinned: true,
      },
      1_736_200_010_000
    );

    const widgets = listCustomWorkbenchWidgets(scope);
    expect(widgets).toHaveLength(2);
    expect(widgets[0].title).toBe('Pinned');
    expect(widgets[0].isPinned).toBe(true);
  });

  it('imports legacy v1 share payloads with default metadata', () => {
    const legacyPayload = {
      schema: 'nexus-os-custom-widget',
      version: 1,
      exportedAt: new Date(1_736_210_000_000).toISOString(),
      widget: {
        title: 'Legacy Widget',
        description: 'Imported from v1',
        body: 'Legacy body',
        tone: 'neutral',
        kind: 'NOTE',
        visualStyle: 'STANDARD',
        links: [{ label: 'Legacy', url: 'https://example.com/legacy' }],
      },
    };
    const encoded = Buffer.from(JSON.stringify(legacyPayload), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const imported = importCustomWorkbenchWidgetFromShareCode('bridge:legacy', `NXW1.${encoded}`);

    expect(imported.title).toBe('Legacy Widget');
    expect(imported.tags).toEqual([]);
    expect(imported.isPinned).toBe(false);
  });

  it('rejects invalid widget share codes', () => {
    expect(() => importCustomWorkbenchWidgetFromShareCode('bridge:alpha', 'NOT_A_CODE')).toThrow();
  });
});

