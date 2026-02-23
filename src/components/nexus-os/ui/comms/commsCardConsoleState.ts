import { enqueueWorkspaceStateSave, loadWorkspaceStateSnapshot } from '../../services/workspaceStateBridgeService';

export interface BridgeTemplate {
  id: string;
  name: string;
  squadIds: string[];
  defaultTtlSec: number;
  updatedAt: string;
}

export interface CommsCardConsoleSlaPolicy {
  checkinWarnSec: number;
  checkinCritSec: number;
  ackWarnSec: number;
  ackCritSec: number;
  offNetWarnSec: number;
  offNetCritSec: number;
}

export interface CommsCardConsoleUiPrefs {
  lastTemplateId: string;
  compactMode: boolean;
}

export interface CommsCardConsoleStateV1 {
  version: 1;
  watchlistSquadIds: string[];
  bridgeTemplates: BridgeTemplate[];
  slaPolicy: CommsCardConsoleSlaPolicy;
  uiPrefs: CommsCardConsoleUiPrefs;
  updatedAt: string;
}

export interface CommsCardConsoleScopeInput {
  sessionScopeKey?: string;
  variantId?: string;
  opId?: string;
}

export interface BridgeTemplateInput {
  id?: string;
  name: string;
  squadIds: string[];
  defaultTtlSec?: number;
  nowMs?: number;
}

export const COMMS_CARD_CONSOLE_STORAGE_PREFIX = 'nexus.os.comms-card-console.v1';
export const COMMS_CARD_CONSOLE_REMOTE_NAMESPACE = 'comms_card_console_state';
export const COMMS_CARD_CONSOLE_SCHEMA_VERSION = 1;
export const COMMS_CARD_CONSOLE_MAX_TEMPLATES = 12;
export const COMMS_CARD_CONSOLE_MAX_TEMPLATE_SQUADS = 5;
export const COMMS_CARD_CONSOLE_MAX_WATCHLIST_IDS = 24;
export const COMMS_CARD_CONSOLE_DEFAULT_TTL_SEC = 300;
export const COMMS_CARD_CONSOLE_TTL_PRESETS = Object.freeze([120, 300, 600, 0]);
export const COMMS_CARD_UTILITY_CORE_FLAG = 'nexus.commsCard.utilityCore.v1';

const MAX_TEXT = 120;

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function toText(value: unknown, fallback = ''): string {
  const token = String(value ?? '').trim().slice(0, MAX_TEXT);
  return token || fallback;
}

function normalizeIso(value: unknown, fallbackIso: string): string {
  const parsed = Date.parse(String(value || ''));
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return fallbackIso;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.round(parsed), max));
}

function normalizeTtlSec(value: unknown, fallback = COMMS_CARD_CONSOLE_DEFAULT_TTL_SEC): number {
  const token = clampInt(value, fallback, 0, 3600);
  if (COMMS_CARD_CONSOLE_TTL_PRESETS.includes(token)) return token;
  return fallback;
}

function normalizeSquadIds(value: unknown, maxItems = COMMS_CARD_CONSOLE_MAX_TEMPLATE_SQUADS): string[] {
  if (!Array.isArray(value)) return [];
  const deduped = new Set<string>();
  for (const raw of value) {
    const squadId = toText(raw);
    if (!squadId) continue;
    deduped.add(squadId);
    if (deduped.size >= maxItems) break;
  }
  return Array.from(deduped);
}

function normalizeWatchlistIds(value: unknown): string[] {
  return normalizeSquadIds(value, COMMS_CARD_CONSOLE_MAX_WATCHLIST_IDS);
}

function normalizeTemplate(input: unknown, fallbackIso: string): BridgeTemplate | null {
  if (!input || typeof input !== 'object') return null;
  const source = input as Partial<BridgeTemplate>;
  const id = toText(source.id);
  const name = toText(source.name);
  if (!id || !name) return null;
  const squadIds = normalizeSquadIds(source.squadIds);
  if (squadIds.length === 0) return null;
  return {
    id,
    name,
    squadIds,
    defaultTtlSec: normalizeTtlSec(source.defaultTtlSec),
    updatedAt: normalizeIso(source.updatedAt, fallbackIso),
  };
}

function normalizeTemplates(value: unknown, fallbackIso: string): BridgeTemplate[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, BridgeTemplate>();
  for (const entry of value) {
    const template = normalizeTemplate(entry, fallbackIso);
    if (!template) continue;
    const current = byId.get(template.id);
    if (!current || Date.parse(template.updatedAt) >= Date.parse(current.updatedAt)) {
      byId.set(template.id, template);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, COMMS_CARD_CONSOLE_MAX_TEMPLATES);
}

function normalizeSlaPolicy(value: unknown): CommsCardConsoleSlaPolicy {
  const source = value && typeof value === 'object' ? (value as Partial<CommsCardConsoleSlaPolicy>) : {};
  const checkinWarnSec = clampInt(source.checkinWarnSec, 120, 20, 3600);
  const checkinCritSec = clampInt(source.checkinCritSec, 240, checkinWarnSec + 5, 3600);
  const ackWarnSec = clampInt(source.ackWarnSec, 90, 15, 3600);
  const ackCritSec = clampInt(source.ackCritSec, 180, ackWarnSec + 5, 3600);
  const offNetWarnSec = clampInt(source.offNetWarnSec, 60, 10, 3600);
  const offNetCritSec = clampInt(source.offNetCritSec, 180, offNetWarnSec + 5, 3600);
  return {
    checkinWarnSec,
    checkinCritSec,
    ackWarnSec,
    ackCritSec,
    offNetWarnSec,
    offNetCritSec,
  };
}

function normalizeUiPrefs(value: unknown): CommsCardConsoleUiPrefs {
  const source = value && typeof value === 'object' ? (value as Partial<CommsCardConsoleUiPrefs>) : {};
  return {
    lastTemplateId: toText(source.lastTemplateId),
    compactMode: Boolean(source.compactMode),
  };
}

function mergeWatchlistIds(remoteIds: string[], localIds: string[]): string[] {
  const ordered = new Set<string>();
  for (const id of [...remoteIds, ...localIds]) {
    const token = toText(id);
    if (!token) continue;
    ordered.add(token);
    if (ordered.size >= COMMS_CARD_CONSOLE_MAX_WATCHLIST_IDS) break;
  }
  return Array.from(ordered);
}

function mergeTemplates(remoteTemplates: BridgeTemplate[], localTemplates: BridgeTemplate[]): BridgeTemplate[] {
  const byId = new Map<string, BridgeTemplate>();
  for (const template of [...remoteTemplates, ...localTemplates]) {
    const current = byId.get(template.id);
    if (!current || Date.parse(template.updatedAt) >= Date.parse(current.updatedAt)) {
      byId.set(template.id, template);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, COMMS_CARD_CONSOLE_MAX_TEMPLATES);
}

function normalizeScopeToken(value: unknown, fallback: string): string {
  return toText(value, fallback).replace(/[^a-zA-Z0-9._:-]+/g, '_').slice(0, 80) || fallback;
}

export function defaultCommsCardConsoleState(overrides: Partial<CommsCardConsoleStateV1> = {}): CommsCardConsoleStateV1 {
  const nowIso = new Date().toISOString();
  return {
    version: 1,
    watchlistSquadIds: [],
    bridgeTemplates: [],
    slaPolicy: normalizeSlaPolicy(undefined),
    uiPrefs: normalizeUiPrefs(undefined),
    updatedAt: nowIso,
    ...overrides,
  };
}

export function normalizeCommsCardConsoleState(
  input: unknown,
  fallback: CommsCardConsoleStateV1 = defaultCommsCardConsoleState()
): CommsCardConsoleStateV1 {
  if (!input || typeof input !== 'object') return fallback;
  const source = input as Partial<CommsCardConsoleStateV1>;
  const nowIso = fallback.updatedAt || new Date().toISOString();
  const templates = normalizeTemplates(source.bridgeTemplates, nowIso);
  const uiPrefs = normalizeUiPrefs(source.uiPrefs);
  const lastTemplateId = templates.some((entry) => entry.id === uiPrefs.lastTemplateId) ? uiPrefs.lastTemplateId : '';
  return {
    version: 1,
    watchlistSquadIds: normalizeWatchlistIds(source.watchlistSquadIds),
    bridgeTemplates: templates,
    slaPolicy: normalizeSlaPolicy(source.slaPolicy),
    uiPrefs: {
      ...uiPrefs,
      lastTemplateId,
    },
    updatedAt: normalizeIso(source.updatedAt, nowIso),
  };
}

export function mergeCommsCardConsoleState(
  localState: CommsCardConsoleStateV1,
  remoteState: CommsCardConsoleStateV1
): CommsCardConsoleStateV1 {
  const local = normalizeCommsCardConsoleState(localState);
  const remote = normalizeCommsCardConsoleState(remoteState, local);
  const mergedTemplates = mergeTemplates(remote.bridgeTemplates, local.bridgeTemplates);
  const merged = normalizeCommsCardConsoleState(
    {
      version: 1,
      watchlistSquadIds: mergeWatchlistIds(remote.watchlistSquadIds, local.watchlistSquadIds),
      bridgeTemplates: mergedTemplates,
      slaPolicy:
        Date.parse(remote.updatedAt) >= Date.parse(local.updatedAt) ? remote.slaPolicy : local.slaPolicy,
      uiPrefs: {
        lastTemplateId:
          remote.uiPrefs.lastTemplateId && mergedTemplates.some((entry) => entry.id === remote.uiPrefs.lastTemplateId)
            ? remote.uiPrefs.lastTemplateId
            : local.uiPrefs.lastTemplateId,
        compactMode:
          Date.parse(remote.updatedAt) >= Date.parse(local.updatedAt)
            ? remote.uiPrefs.compactMode
            : local.uiPrefs.compactMode,
      },
      updatedAt:
        Date.parse(remote.updatedAt) >= Date.parse(local.updatedAt) ? remote.updatedAt : local.updatedAt,
    },
    local
  );
  return merged;
}

export function buildCommsCardConsoleScopeKey(scope: CommsCardConsoleScopeInput): string {
  const sessionScopeKey = normalizeScopeToken(scope.sessionScopeKey, 'session');
  const variantId = normalizeScopeToken(scope.variantId, 'CQB-01');
  const opId = normalizeScopeToken(scope.opId, 'global');
  return `${sessionScopeKey}:${variantId}:${opId}`;
}

export function commsCardConsoleStorageKey(scope: CommsCardConsoleScopeInput): string {
  return `${COMMS_CARD_CONSOLE_STORAGE_PREFIX}:${buildCommsCardConsoleScopeKey(scope)}`;
}

function removeCorruptLocalState(scope: CommsCardConsoleScopeInput): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(commsCardConsoleStorageKey(scope));
  } catch {
    // best effort
  }
}

export function loadLocalCommsCardConsoleState(scope: CommsCardConsoleScopeInput): CommsCardConsoleStateV1 {
  const fallback = defaultCommsCardConsoleState();
  if (!storageAvailable()) return fallback;
  try {
    const raw = localStorage.getItem(commsCardConsoleStorageKey(scope));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return normalizeCommsCardConsoleState(parsed, fallback);
  } catch {
    removeCorruptLocalState(scope);
    return fallback;
  }
}

export function persistCommsCardConsoleState(scope: CommsCardConsoleScopeInput, state: CommsCardConsoleStateV1): void {
  const persisted = normalizeCommsCardConsoleState(
    {
      ...state,
      version: 1,
      updatedAt: new Date().toISOString(),
    },
    defaultCommsCardConsoleState()
  );
  if (storageAvailable()) {
    try {
      localStorage.setItem(commsCardConsoleStorageKey(scope), JSON.stringify(persisted));
    } catch {
      // best effort
    }
  }
  enqueueWorkspaceStateSave({
    namespace: COMMS_CARD_CONSOLE_REMOTE_NAMESPACE,
    scopeKey: buildCommsCardConsoleScopeKey(scope),
    schemaVersion: COMMS_CARD_CONSOLE_SCHEMA_VERSION,
    state: persisted,
    debounceMs: 800,
  });
}

export async function hydrateCommsCardConsoleState(
  scope: CommsCardConsoleScopeInput,
  localState: CommsCardConsoleStateV1
): Promise<CommsCardConsoleStateV1> {
  const local = normalizeCommsCardConsoleState(localState);
  const snapshot = await loadWorkspaceStateSnapshot<unknown>({
    namespace: COMMS_CARD_CONSOLE_REMOTE_NAMESPACE,
    scopeKey: buildCommsCardConsoleScopeKey(scope),
  }).catch(() => null);
  if (!snapshot?.state) return local;
  const remote = normalizeCommsCardConsoleState(snapshot.state, local);
  const merged = mergeCommsCardConsoleState(local, remote);
  if (storageAvailable()) {
    try {
      localStorage.setItem(commsCardConsoleStorageKey(scope), JSON.stringify(merged));
    } catch {
      // best effort
    }
  }
  return merged;
}

export function createBridgeTemplateId(nowMs = Date.now(), name = 'template'): string {
  const base = toText(name, 'template')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `tpl:${base || 'template'}:${Math.max(0, Math.floor(nowMs))}`;
}

export function upsertBridgeTemplate(
  state: CommsCardConsoleStateV1,
  input: BridgeTemplateInput
): CommsCardConsoleStateV1 {
  const current = normalizeCommsCardConsoleState(state);
  const nowMs = Number.isFinite(input.nowMs) ? Number(input.nowMs) : Date.now();
  const squadIds = normalizeSquadIds(input.squadIds);
  if (!input.name || squadIds.length === 0) return current;
  const template: BridgeTemplate = {
    id: toText(input.id) || createBridgeTemplateId(nowMs, input.name),
    name: toText(input.name, 'Bridge Template'),
    squadIds,
    defaultTtlSec: normalizeTtlSec(input.defaultTtlSec),
    updatedAt: new Date(nowMs).toISOString(),
  };
  const without = current.bridgeTemplates.filter((entry) => entry.id !== template.id);
  const next = normalizeCommsCardConsoleState(
    {
      ...current,
      bridgeTemplates: [template, ...without].slice(0, COMMS_CARD_CONSOLE_MAX_TEMPLATES),
      uiPrefs: { ...current.uiPrefs, lastTemplateId: template.id },
      updatedAt: new Date(nowMs).toISOString(),
    },
    current
  );
  return next;
}

export function renameBridgeTemplate(
  state: CommsCardConsoleStateV1,
  templateId: string,
  name: string,
  nowMs = Date.now()
): CommsCardConsoleStateV1 {
  const current = normalizeCommsCardConsoleState(state);
  const targetId = toText(templateId);
  const nextName = toText(name);
  if (!targetId || !nextName) return current;
  const templates = current.bridgeTemplates.map((entry) =>
    entry.id === targetId ? { ...entry, name: nextName, updatedAt: new Date(nowMs).toISOString() } : entry
  );
  return normalizeCommsCardConsoleState(
    {
      ...current,
      bridgeTemplates: templates,
      updatedAt: new Date(nowMs).toISOString(),
    },
    current
  );
}

export function removeBridgeTemplate(state: CommsCardConsoleStateV1, templateId: string, nowMs = Date.now()): CommsCardConsoleStateV1 {
  const current = normalizeCommsCardConsoleState(state);
  const targetId = toText(templateId);
  if (!targetId) return current;
  const templates = current.bridgeTemplates.filter((entry) => entry.id !== targetId);
  return normalizeCommsCardConsoleState(
    {
      ...current,
      bridgeTemplates: templates,
      uiPrefs: {
        ...current.uiPrefs,
        lastTemplateId: current.uiPrefs.lastTemplateId === targetId ? '' : current.uiPrefs.lastTemplateId,
      },
      updatedAt: new Date(nowMs).toISOString(),
    },
    current
  );
}

export function toggleWatchlistSquad(
  state: CommsCardConsoleStateV1,
  squadId: string,
  nowMs = Date.now()
): CommsCardConsoleStateV1 {
  const current = normalizeCommsCardConsoleState(state);
  const targetId = toText(squadId);
  if (!targetId) return current;
  const set = new Set(current.watchlistSquadIds);
  if (set.has(targetId)) set.delete(targetId);
  else if (set.size < COMMS_CARD_CONSOLE_MAX_WATCHLIST_IDS) set.add(targetId);
  return normalizeCommsCardConsoleState(
    {
      ...current,
      watchlistSquadIds: Array.from(set),
      updatedAt: new Date(nowMs).toISOString(),
    },
    current
  );
}

export function isCommsCardUtilityCoreEnabled(): boolean {
  if (!storageAvailable()) return true;
  try {
    const raw = localStorage.getItem(COMMS_CARD_UTILITY_CORE_FLAG);
    if (!raw) return true;
    const token = raw.trim().toLowerCase();
    return !(token === '0' || token === 'false' || token === 'off' || token === 'disabled');
  } catch {
    return true;
  }
}

