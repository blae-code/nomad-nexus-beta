import {
  enqueueWorkspaceStateSave,
  loadWorkspaceStateSnapshot,
} from './workspaceStateBridgeService';

export type CustomWorkbenchWidgetTone =
  | 'neutral'
  | 'active'
  | 'ok'
  | 'warning'
  | 'danger'
  | 'locked'
  | 'experimental';

export type CustomWorkbenchWidgetKind = 'NOTE' | 'CHECKLIST' | 'METRIC' | 'TIMELINE';
export type CustomWorkbenchWidgetVisualStyle = 'STANDARD' | 'CONSOLE' | 'AURORA' | 'SURFACE';

export interface CustomWorkbenchWidgetLink {
  id: string;
  label: string;
  url: string;
}

export interface CustomWorkbenchWidget {
  id: string;
  title: string;
  description?: string;
  body: string;
  tone: CustomWorkbenchWidgetTone;
  kind: CustomWorkbenchWidgetKind;
  visualStyle: CustomWorkbenchWidgetVisualStyle;
  links: CustomWorkbenchWidgetLink[];
  tags: string[];
  isPinned: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomWorkbenchWidgetInput {
  id?: string;
  title: string;
  description?: string;
  body?: string;
  tone?: CustomWorkbenchWidgetTone;
  kind?: CustomWorkbenchWidgetKind;
  visualStyle?: CustomWorkbenchWidgetVisualStyle;
  links?: Array<Pick<CustomWorkbenchWidgetLink, 'label' | 'url'>>;
  tags?: string[];
  isPinned?: boolean;
  createdBy?: string;
}

interface CustomWorkbenchWidgetSharePayloadV1 {
  schema: 'nexus-os-custom-widget';
  version: 1 | 2;
  exportedAt: string;
  widget: {
    title: string;
    description?: string;
    body?: string;
    tone?: CustomWorkbenchWidgetTone;
    kind?: CustomWorkbenchWidgetKind;
    visualStyle?: CustomWorkbenchWidgetVisualStyle;
    links?: Array<Pick<CustomWorkbenchWidgetLink, 'label' | 'url'>>;
    tags?: string[];
    isPinned?: boolean;
    createdBy?: string;
  };
}

const STORAGE_PREFIX = 'nexus.os.workbench.customWidgets.v1';
const FALLBACK_SCOPE = 'global';
const WIDGET_REMOTE_NAMESPACE = 'custom_workbench_widgets';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const inMemoryStore = new Map<string, CustomWorkbenchWidget[]>();

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function storageKey(scopeKey?: string): string {
  return `${STORAGE_PREFIX}:${String(scopeKey || FALLBACK_SCOPE).trim() || FALLBACK_SCOPE}`;
}

function trimText(value: unknown, maxLength: number): string {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeIsoTimestamp(value: unknown, fallback: string): string {
  const token = String(value || '').trim();
  if (!token) return fallback;
  const parsed = Date.parse(token);
  if (Number.isNaN(parsed)) return fallback;
  return new Date(parsed).toISOString();
}

function normalizeTone(value: unknown): CustomWorkbenchWidgetTone {
  const token = String(value || '').trim().toLowerCase();
  if (
    token === 'neutral' ||
    token === 'active' ||
    token === 'ok' ||
    token === 'warning' ||
    token === 'danger' ||
    token === 'locked' ||
    token === 'experimental'
  ) {
    return token;
  }
  return 'experimental';
}

function normalizeWidgetKind(value: unknown): CustomWorkbenchWidgetKind {
  const token = String(value || '').trim().toUpperCase();
  if (token === 'CHECKLIST' || token === 'METRIC' || token === 'TIMELINE') return token;
  return 'NOTE';
}

function normalizeWidgetVisualStyle(value: unknown): CustomWorkbenchWidgetVisualStyle {
  const token = String(value || '').trim().toUpperCase();
  if (token === 'CONSOLE' || token === 'AURORA' || token === 'SURFACE') return token;
  return 'STANDARD';
}

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  const parts = hostname.split('.').map((entry) => Number(entry));
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!normalized.includes(':')) return false;
  if (normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80:')) return true;
  return false;
}

function isPrivateHost(hostname: string): boolean {
  const normalized = String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
  if (!normalized) return true;
  if (LOCAL_HOSTS.has(normalized)) return true;
  if (normalized.endsWith('.local') || normalized.endsWith('.internal') || normalized.endsWith('.home')) return true;
  if (isPrivateIpv4(normalized)) return true;
  if (isPrivateIpv6(normalized)) return true;
  return false;
}

function validUrl(url: string): boolean {
  const value = String(url || '').trim();
  if (!value) return false;
  if (value.startsWith('/')) return true;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (isPrivateHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeLinks(links: CustomWorkbenchWidgetInput['links']): CustomWorkbenchWidgetLink[] {
  const next = (links || [])
    .map((link, index) => {
      const label = trimText(link?.label, 64);
      const url = trimText(link?.url, 512);
      if (!label || !validUrl(url)) return null;
      return {
        id: `link_${index}_${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label,
        url,
      };
    })
    .filter((entry): entry is CustomWorkbenchWidgetLink => Boolean(entry));
  return next.slice(0, 6);
}

function normalizeTags(tags: CustomWorkbenchWidgetInput['tags']): string[] {
  const tokens = Array.isArray(tags) ? tags : [];
  const deduped = new Set<string>();
  for (const entry of tokens) {
    const normalized = trimText(entry, 24).toLowerCase();
    if (!normalized) continue;
    deduped.add(normalized);
    if (deduped.size >= 8) break;
  }
  return Array.from(deduped);
}

function createWidgetId(nowMs = Date.now()): string {
  return `cw_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function compareWidgets(a: CustomWorkbenchWidget, b: CustomWorkbenchWidget): number {
  if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
    return a.isPinned ? -1 : 1;
  }
  const aMs = Date.parse(a.updatedAt);
  const bMs = Date.parse(b.updatedAt);
  if (!Number.isNaN(aMs) && !Number.isNaN(bMs) && aMs !== bMs) {
    return bMs - aMs;
  }
  return a.title.localeCompare(b.title);
}

function latestWidgetUpdateMs(widgets: CustomWorkbenchWidget[]): number {
  let latest = 0;
  for (const widget of widgets) {
    const ms = Date.parse(String(widget?.updatedAt || widget?.createdAt || ''));
    if (!Number.isNaN(ms)) latest = Math.max(latest, ms);
  }
  return latest;
}

function encodeBase64Url(value: string): string {
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

function decodeBase64Url(value: string): string {
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

function sanitizeWidget(
  input: CustomWorkbenchWidgetInput,
  nowMs = Date.now(),
  existing?: CustomWorkbenchWidget
): CustomWorkbenchWidget {
  const now = nowIso(nowMs);
  const title = trimText(input.title, 72);
  if (!title) throw new Error('Widget title is required.');
  const body = trimText(input.body || '', 4000);
  const description = trimText(input.description || '', 220);
  const createdAt = existing?.createdAt || normalizeIsoTimestamp((input as { createdAt?: string }).createdAt, now);
  const updatedAt = existing
    ? now
    : normalizeIsoTimestamp((input as { updatedAt?: string }).updatedAt, now);
  return {
    id: trimText(input.id || existing?.id || createWidgetId(nowMs), 120),
    title,
    description: description || undefined,
    body,
    tone: normalizeTone(input.tone || existing?.tone || 'experimental'),
    kind: normalizeWidgetKind(input.kind || existing?.kind || 'NOTE'),
    visualStyle: normalizeWidgetVisualStyle(input.visualStyle || existing?.visualStyle || 'STANDARD'),
    links: normalizeLinks(input.links || existing?.links || []),
    tags: normalizeTags(input.tags ?? existing?.tags ?? []),
    isPinned: Boolean(input.isPinned ?? existing?.isPinned ?? false),
    createdBy: trimText(input.createdBy || existing?.createdBy || '', 120) || undefined,
    createdAt,
    updatedAt,
  };
}

function parseStoredList(value: string | null): CustomWorkbenchWidget[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => sanitizeWidget(entry, Date.now()))
      .filter(Boolean)
      .sort(compareWidgets);
  } catch {
    return [];
  }
}

function persistWidgetList(scopeKeyValue: string, widgets: CustomWorkbenchWidget[]): void {
  const sorted = [...widgets].sort(compareWidgets);
  inMemoryStore.set(scopeKeyValue, sorted);
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(storageKey(scopeKeyValue), JSON.stringify(sorted));
  } catch {
    // best effort
  }
  enqueueWorkspaceStateSave({
    namespace: WIDGET_REMOTE_NAMESPACE,
    scopeKey: scopeKeyValue,
    schemaVersion: 2,
    state: sorted,
    debounceMs: 700,
  });
}

function loadWidgetList(scopeKeyValue: string): CustomWorkbenchWidget[] {
  const inMemory = inMemoryStore.get(scopeKeyValue);
  if (inMemory) return [...inMemory];
  if (!storageAvailable()) return [];
  const parsed = parseStoredList(localStorage.getItem(storageKey(scopeKeyValue)));
  inMemoryStore.set(scopeKeyValue, parsed);
  return [...parsed];
}

export function customWorkbenchWidgetPanelId(widgetId: string): string {
  return `custom-widget:${String(widgetId || '').trim()}`;
}

export function parseCustomWorkbenchWidgetPanelId(panelId: string): string | null {
  const value = String(panelId || '').trim();
  if (!value.startsWith('custom-widget:')) return null;
  const widgetId = value.slice('custom-widget:'.length).trim();
  return widgetId || null;
}

export function listCustomWorkbenchWidgets(scopeKeyValue?: string): CustomWorkbenchWidget[] {
  const scope = String(scopeKeyValue || FALLBACK_SCOPE).trim() || FALLBACK_SCOPE;
  return loadWidgetList(scope);
}

export async function hydrateCustomWorkbenchWidgetsFromBackend(scopeKeyValue?: string): Promise<CustomWorkbenchWidget[]> {
  const scope = String(scopeKeyValue || FALLBACK_SCOPE).trim() || FALLBACK_SCOPE;
  const local = loadWidgetList(scope);
  const remote = await loadWorkspaceStateSnapshot<unknown>({
    namespace: WIDGET_REMOTE_NAMESPACE,
    scopeKey: scope,
  }).catch(() => null);
  const remoteState = remote?.state;
  if (!remoteState) return local;
  const rawList = Array.isArray(remoteState)
    ? remoteState
    : Array.isArray((remoteState as { widgets?: unknown[] }).widgets)
      ? (remoteState as { widgets: unknown[] }).widgets
      : [];
  if (!Array.isArray(rawList) || rawList.length === 0) return local;
  const normalized = rawList
    .map((entry) => {
      try {
        return sanitizeWidget(entry as CustomWorkbenchWidgetInput, Date.now());
      } catch {
        return null;
      }
    })
    .filter((entry): entry is CustomWorkbenchWidget => Boolean(entry))
    .sort(compareWidgets);
  if (normalized.length === 0) return local;
  const localFreshness = latestWidgetUpdateMs(local);
  const remoteFreshness = Math.max(
    latestWidgetUpdateMs(normalized),
    Date.parse(String(remote?.persistedAt || '')) || 0
  );
  if (localFreshness > 0 && remoteFreshness > 0 && remoteFreshness < localFreshness) {
    return local;
  }
  persistWidgetList(scope, normalized);
  return loadWidgetList(scope);
}

export function upsertCustomWorkbenchWidget(
  scopeKeyValue: string | undefined,
  input: CustomWorkbenchWidgetInput,
  nowMs = Date.now()
): CustomWorkbenchWidget {
  const scope = String(scopeKeyValue || FALLBACK_SCOPE).trim() || FALLBACK_SCOPE;
  const current = loadWidgetList(scope);
  const existing = input.id ? current.find((entry) => entry.id === input.id) : undefined;
  const widget = sanitizeWidget(input, nowMs, existing);
  const next = existing
    ? current.map((entry) => (entry.id === widget.id ? widget : entry))
    : [widget, ...current];
  persistWidgetList(scope, next);
  return widget;
}

export function removeCustomWorkbenchWidget(scopeKeyValue: string | undefined, widgetId: string): boolean {
  const scope = String(scopeKeyValue || FALLBACK_SCOPE).trim() || FALLBACK_SCOPE;
  const current = loadWidgetList(scope);
  const next = current.filter((entry) => entry.id !== widgetId);
  if (next.length === current.length) return false;
  persistWidgetList(scope, next);
  return true;
}

export function exportCustomWorkbenchWidgetShareCode(widget: CustomWorkbenchWidget, nowMs = Date.now()): string {
  const payload: CustomWorkbenchWidgetSharePayloadV1 = {
    schema: 'nexus-os-custom-widget',
    version: 2,
    exportedAt: nowIso(nowMs),
    widget: {
      title: widget.title,
      description: widget.description,
      body: widget.body,
      tone: widget.tone,
      kind: widget.kind,
      visualStyle: widget.visualStyle,
      links: widget.links,
      tags: widget.tags,
      isPinned: widget.isPinned,
      createdBy: widget.createdBy,
    },
  };
  return `NXW1.${encodeBase64Url(JSON.stringify(payload))}`;
}

function parseSharePayload(value: string): CustomWorkbenchWidgetSharePayloadV1 {
  const trimmed = String(value || '').trim();
  const encoded = trimmed.startsWith('NXW1.') ? trimmed.slice(5) : trimmed;
  const decoded = decodeBase64Url(encoded);
  const parsed = JSON.parse(decoded) as CustomWorkbenchWidgetSharePayloadV1;
  const validVersion = parsed?.version === 1 || parsed?.version === 2;
  if (!parsed || parsed.schema !== 'nexus-os-custom-widget' || !validVersion || !parsed.widget) {
    throw new Error('Invalid widget share code.');
  }
  return parsed;
}

export function importCustomWorkbenchWidgetFromShareCode(
  scopeKeyValue: string | undefined,
  shareCode: string,
  nowMs = Date.now()
): CustomWorkbenchWidget {
  const payload = parseSharePayload(shareCode);
  const imported = upsertCustomWorkbenchWidget(
    scopeKeyValue,
    {
      title: payload.widget.title,
      description: payload.widget.description,
      body: payload.widget.body,
      tone: payload.widget.tone,
      kind: payload.widget.kind,
      visualStyle: payload.widget.visualStyle,
      links: payload.widget.links,
      tags: payload.widget.tags,
      isPinned: payload.widget.isPinned,
      createdBy: payload.widget.createdBy,
    },
    nowMs
  );
  return imported;
}

export function resetCustomWorkbenchWidgetStore(scopeKeyValue?: string): void {
  if (!scopeKeyValue) {
    inMemoryStore.clear();
    if (storageAvailable()) {
      try {
        const prefix = `${STORAGE_PREFIX}:`;
        const keys: string[] = [];
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key && key.startsWith(prefix)) keys.push(key);
        }
        for (const key of keys) localStorage.removeItem(key);
      } catch {
        // best effort
      }
    }
    return;
  }

  const scope = String(scopeKeyValue || FALLBACK_SCOPE).trim() || FALLBACK_SCOPE;
  inMemoryStore.delete(scope);
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(storageKey(scope));
  } catch {
    // best effort
  }
}
