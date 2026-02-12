import type { OperationPosture } from '../schemas/opSchemas';

export type DoctrineLevel = 'INDIVIDUAL' | 'SQUAD' | 'WING' | 'FLEET';
export type MandateEnforcement = 'HARD' | 'SOFT' | 'ADVISORY';

export interface DoctrineDefinition {
  id: string;
  level: DoctrineLevel;
  label: string;
  description: string;
  modifierText: string;
}

export interface DoctrineSelection {
  doctrineId: string;
  enabled: boolean;
  weight: number;
}

export interface OperationDoctrineProfile {
  opId: string;
  posture: OperationPosture;
  doctrineByLevel: Record<DoctrineLevel, DoctrineSelection[]>;
  updatedAt: string;
  updatedBy?: string;
}

export interface RoleMandate {
  id: string;
  role: string;
  minCount: number;
  maxCount?: number;
  enforcement: MandateEnforcement;
  requiredLoadoutTags: string[];
  blockedLoadoutTags: string[];
  notes?: string;
}

export interface LoadoutMandate {
  id: string;
  label: string;
  tagsAny: string[];
  tagsAll: string[];
  blockedTags: string[];
  appliesToRoles: string[];
  enforcement: MandateEnforcement;
  notes?: string;
}

export interface AssetMandate {
  id: string;
  assetTag: string;
  minCount: number;
  maxCount?: number;
  enforcement: MandateEnforcement;
  notes?: string;
}

export interface OperationMandateProfile {
  opId: string;
  roleMandates: RoleMandate[];
  loadoutMandates: LoadoutMandate[];
  assetMandates: AssetMandate[];
  updatedAt: string;
  updatedBy?: string;
}

export interface UserOperationPreference {
  userId: string;
  preferredRoles: string[];
  activityTags: string[];
  postureAffinity: OperationPosture | 'ANY';
  availability: 'AUTO' | 'MANUAL' | 'AWAY';
  notifyOptIn: boolean;
  updatedAt: string;
}

export interface CandidatePoolEntry {
  userId: string;
  callsign?: string;
  role?: string;
  element?: string;
  loadoutTags?: string[];
  activityTags?: string[];
  availability?: 'READY' | 'LIMITED' | 'OFFLINE';
}

export interface SeatDemand {
  role: string;
  qty: number;
  source: 'OPEN_SEAT' | 'ROLE_MANDATE';
}

export interface CandidateMatch {
  userId: string;
  callsign?: string;
  matchedRole: string;
  score: number;
  reasons: string[];
  blockedByHardMandate: boolean;
}

export interface LeadAlert {
  id: string;
  opId: string;
  severity: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
  title: string;
  summary: string;
  demandRole: string;
  notifiedUserIds: string[];
  createdAt: string;
}

interface OperationEnhancementListenerState {
  doctrines: OperationDoctrineProfile[];
  mandates: OperationMandateProfile[];
  preferences: UserOperationPreference[];
  alerts: LeadAlert[];
}

interface PersistedOperationEnhancementState {
  schema: 'nexus-os-operation-enhancements';
  version: 1;
  doctrines: OperationDoctrineProfile[];
  mandates: OperationMandateProfile[];
  preferences: UserOperationPreference[];
  alerts: LeadAlert[];
}

type OperationEnhancementListener = (state: OperationEnhancementListenerState) => void;

interface DoctrinePresetWeight {
  casual: number;
  focused: number;
  casualEnabled?: boolean;
  focusedEnabled?: boolean;
}

const DOCTRINE_LIBRARY: DoctrineDefinition[] = [
  {
    id: 'ind-prebrief-checklist',
    level: 'INDIVIDUAL',
    label: 'Pre-Brief Checklist',
    description: 'Each member confirms readiness, comms, and fallback plan before execution.',
    modifierText: '+Readiness, -late joins',
  },
  {
    id: 'ind-role-discipline',
    level: 'INDIVIDUAL',
    label: 'Role Discipline',
    description: 'Members stay inside assigned lane unless explicitly redirected by lead.',
    modifierText: '+Execution tempo, -role drift',
  },
  {
    id: 'ind-self-recovery',
    level: 'INDIVIDUAL',
    label: 'Self-Recovery',
    description: 'Members own local recovery first and escalate only when blocked.',
    modifierText: '+Lead bandwidth, +resilience',
  },
  {
    id: 'sq-comms-stack',
    level: 'SQUAD',
    label: 'Comms Stack',
    description: 'Squads maintain short, structured updates with exception-only interrupts.',
    modifierText: '+Signal quality, -channel noise',
  },
  {
    id: 'sq-buddy-coverage',
    level: 'SQUAD',
    label: 'Buddy Coverage',
    description: 'Squad members track pair coverage and enforce overlap windows.',
    modifierText: '+Continuity, -single-point failure',
  },
  {
    id: 'sq-handoff-ritual',
    level: 'SQUAD',
    label: 'Handoff Ritual',
    description: 'Formal squad handoff for phase changes and role transitions.',
    modifierText: '+Transition quality, -task bleed',
  },
  {
    id: 'wing-fallback-lanes',
    level: 'WING',
    label: 'Fallback Lanes',
    description: 'Wing-level fallback lanes are pre-assigned for disruption scenarios.',
    modifierText: '+Recovery speed, -chaotic reroutes',
  },
  {
    id: 'wing-load-balance',
    level: 'WING',
    label: 'Load Balance',
    description: 'Workload and critical tasks are balanced across squads and assets.',
    modifierText: '+Sustainability, -burnout spikes',
  },
  {
    id: 'wing-intel-loop',
    level: 'WING',
    label: 'Intel Loop',
    description: 'Wing keeps update cadence for changing threats and opportunity windows.',
    modifierText: '+Decision freshness',
  },
  {
    id: 'fleet-priority-ladder',
    level: 'FLEET',
    label: 'Priority Ladder',
    description: 'Fleet aligns objective priority ladder and escalation order.',
    modifierText: '+Command coherence',
  },
  {
    id: 'fleet-risk-budget',
    level: 'FLEET',
    label: 'Risk Budget',
    description: 'Fleet pre-allocates risk tolerance by phase and objective.',
    modifierText: '+Risk control, +predictability',
  },
  {
    id: 'fleet-contingency-window',
    level: 'FLEET',
    label: 'Contingency Window',
    description: 'Fleet reserves cross-wing contingency capacity for rapid response.',
    modifierText: '+Contingency coverage',
  },
];

const DOCTRINE_PRESET_WEIGHTS: Record<string, DoctrinePresetWeight> = {
  'ind-prebrief-checklist': { casual: 0.7, focused: 1, casualEnabled: true, focusedEnabled: true },
  'ind-role-discipline': { casual: 0.58, focused: 0.95, casualEnabled: true, focusedEnabled: true },
  'ind-self-recovery': { casual: 0.82, focused: 0.86, casualEnabled: true, focusedEnabled: true },
  'sq-comms-stack': { casual: 0.66, focused: 0.98, casualEnabled: true, focusedEnabled: true },
  'sq-buddy-coverage': { casual: 0.72, focused: 0.9, casualEnabled: true, focusedEnabled: true },
  'sq-handoff-ritual': { casual: 0.61, focused: 0.88, casualEnabled: true, focusedEnabled: true },
  'wing-fallback-lanes': { casual: 0.68, focused: 0.92, casualEnabled: true, focusedEnabled: true },
  'wing-load-balance': { casual: 0.76, focused: 0.88, casualEnabled: true, focusedEnabled: true },
  'wing-intel-loop': { casual: 0.64, focused: 0.94, casualEnabled: true, focusedEnabled: true },
  'fleet-priority-ladder': { casual: 0.62, focused: 0.96, casualEnabled: true, focusedEnabled: true },
  'fleet-risk-budget': { casual: 0.55, focused: 0.98, casualEnabled: false, focusedEnabled: true },
  'fleet-contingency-window': { casual: 0.73, focused: 0.9, casualEnabled: true, focusedEnabled: true },
};

const LEVELS: DoctrineLevel[] = ['INDIVIDUAL', 'SQUAD', 'WING', 'FLEET'];
const STORAGE_KEY = 'nexus.os.operationEnhancement.v1';
const listeners = new Set<OperationEnhancementListener>();
let doctrineStore: OperationDoctrineProfile[] = [];
let mandateStore: OperationMandateProfile[] = [];
let preferenceStore: UserOperationPreference[] = [];
let leadAlertStore: LeadAlert[] = [];
let storeHydrated = false;

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createId(prefix: string, nowMs = Date.now()): string {
  return `${prefix}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeToken(value: unknown, maxLength: number): string {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeTokenList(value: unknown, maxItemLength = 44): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((entry) => normalizeToken(entry, maxItemLength))
    .filter(Boolean);
  return [...new Set(normalized)];
}

function storageAvailable(): boolean {
  return typeof localStorage !== 'undefined';
}

function hydrateStore() {
  if (storeHydrated) return;
  storeHydrated = true;
  if (!storageAvailable()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedOperationEnhancementState;
    if (!parsed || parsed.schema !== 'nexus-os-operation-enhancements' || parsed.version !== 1) return;
    doctrineStore = Array.isArray(parsed.doctrines) ? parsed.doctrines : [];
    mandateStore = Array.isArray(parsed.mandates) ? parsed.mandates : [];
    preferenceStore = Array.isArray(parsed.preferences) ? parsed.preferences : [];
    leadAlertStore = Array.isArray(parsed.alerts) ? parsed.alerts : [];
  } catch {
    // best effort
  }
}

function persistStore() {
  if (!storeHydrated) return;
  if (!storageAvailable()) return;
  try {
    const payload: PersistedOperationEnhancementState = {
      schema: 'nexus-os-operation-enhancements',
      version: 1,
      doctrines: doctrineStore,
      mandates: mandateStore,
      preferences: preferenceStore,
      alerts: leadAlertStore,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // best effort
  }
}

function notifyListeners() {
  hydrateStore();
  const snapshot: OperationEnhancementListenerState = {
    doctrines: [...doctrineStore],
    mandates: [...mandateStore],
    preferences: [...preferenceStore],
    alerts: [...leadAlertStore],
  };
  persistStore();
  for (const listener of listeners) listener(snapshot);
}

function doctrineSelectionsByLevel(posture: OperationPosture): Record<DoctrineLevel, DoctrineSelection[]> {
  const doctrineByLevel: Record<DoctrineLevel, DoctrineSelection[]> = {
    INDIVIDUAL: [],
    SQUAD: [],
    WING: [],
    FLEET: [],
  };

  for (const doctrine of DOCTRINE_LIBRARY) {
    const preset = DOCTRINE_PRESET_WEIGHTS[doctrine.id] || { casual: 0.7, focused: 0.9 };
    const isFocused = posture === 'FOCUSED';
    doctrineByLevel[doctrine.level].push({
      doctrineId: doctrine.id,
      enabled: isFocused ? preset.focusedEnabled !== false : preset.casualEnabled !== false,
      weight: Number((isFocused ? preset.focused : preset.casual).toFixed(2)),
    });
  }
  return doctrineByLevel;
}

function defaultRoleMandates(posture: OperationPosture): RoleMandate[] {
  if (posture === 'FOCUSED') {
    return [
      {
        id: 'mandate-focused-lead',
        role: 'Lead',
        minCount: 1,
        maxCount: 2,
        enforcement: 'HARD',
        requiredLoadoutTags: ['comms'],
        blockedLoadoutTags: [],
        notes: 'Focused operations require explicit lead coverage.',
      },
      {
        id: 'mandate-focused-gunner',
        role: 'Gunner',
        minCount: 1,
        enforcement: 'SOFT',
        requiredLoadoutTags: ['ship-combat'],
        blockedLoadoutTags: [],
      },
    ];
  }
  return [
    {
      id: 'mandate-casual-lead',
      role: 'Lead',
      minCount: 1,
      maxCount: 3,
      enforcement: 'SOFT',
      requiredLoadoutTags: ['comms'],
      blockedLoadoutTags: [],
    },
  ];
}

function defaultLoadoutMandates(posture: OperationPosture): LoadoutMandate[] {
  if (posture === 'FOCUSED') {
    return [
      {
        id: 'loadout-focused-comms',
        label: 'Comms Baseline',
        tagsAny: ['comms'],
        tagsAll: [],
        blockedTags: [],
        appliesToRoles: [],
        enforcement: 'HARD',
        notes: 'All participants should be comms-ready.',
      },
      {
        id: 'loadout-focused-spares',
        label: 'Recovery Spares',
        tagsAny: ['med', 'repair', 'sustainment'],
        tagsAll: [],
        blockedTags: [],
        appliesToRoles: ['Support', 'Medic'],
        enforcement: 'SOFT',
      },
    ];
  }

  return [
    {
      id: 'loadout-casual-flex',
      label: 'Flexible Fit',
      tagsAny: ['comms', 'utility'],
      tagsAll: [],
      blockedTags: [],
      appliesToRoles: [],
      enforcement: 'ADVISORY',
    },
  ];
}

function defaultAssetMandates(posture: OperationPosture): AssetMandate[] {
  if (posture === 'FOCUSED') {
    return [
      {
        id: 'asset-focused-support',
        assetTag: 'support',
        minCount: 1,
        enforcement: 'SOFT',
      },
      {
        id: 'asset-focused-combat',
        assetTag: 'combat',
        minCount: 1,
        enforcement: 'SOFT',
      },
    ];
  }
  return [
    {
      id: 'asset-casual-utility',
      assetTag: 'utility',
      minCount: 1,
      enforcement: 'ADVISORY',
    },
  ];
}

function ensureMandateProfile(opId: string, posture: OperationPosture, nowMs = Date.now()): OperationMandateProfile {
  hydrateStore();
  const existing = mandateStore.find((entry) => entry.opId === opId);
  if (existing) return existing;
  const created: OperationMandateProfile = {
    opId,
    roleMandates: defaultRoleMandates(posture),
    loadoutMandates: defaultLoadoutMandates(posture),
    assetMandates: defaultAssetMandates(posture),
    updatedAt: nowIso(nowMs),
  };
  mandateStore = [created, ...mandateStore];
  return created;
}

function ensureDoctrineProfile(opId: string, posture: OperationPosture, nowMs = Date.now()): OperationDoctrineProfile {
  hydrateStore();
  const existing = doctrineStore.find((entry) => entry.opId === opId);
  if (existing) return existing;
  const created: OperationDoctrineProfile = {
    opId,
    posture,
    doctrineByLevel: doctrineSelectionsByLevel(posture),
    updatedAt: nowIso(nowMs),
  };
  doctrineStore = [created, ...doctrineStore];
  return created;
}

export function listDoctrineLibrary(): DoctrineDefinition[] {
  hydrateStore();
  return [...DOCTRINE_LIBRARY];
}

export function initializeOperationEnhancements(
  opId: string,
  posture: OperationPosture,
  actorId?: string,
  nowMs = Date.now()
): { doctrine: OperationDoctrineProfile; mandates: OperationMandateProfile } {
  const doctrine = ensureDoctrineProfile(opId, posture, nowMs);
  const mandates = ensureMandateProfile(opId, posture, nowMs);
  if (actorId) {
    doctrine.updatedBy = actorId;
    mandates.updatedBy = actorId;
  }
  notifyListeners();
  return { doctrine, mandates };
}

export function alignOperationEnhancementsToPosture(
  opId: string,
  posture: OperationPosture,
  actorId?: string,
  nowMs = Date.now()
): { doctrine: OperationDoctrineProfile; mandates: OperationMandateProfile } {
  const doctrine = ensureDoctrineProfile(opId, posture, nowMs);
  const mandates = ensureMandateProfile(opId, posture, nowMs);

  const nextDoctrine: OperationDoctrineProfile = {
    ...doctrine,
    posture,
    doctrineByLevel: doctrineSelectionsByLevel(posture),
    updatedAt: nowIso(nowMs),
    updatedBy: actorId || doctrine.updatedBy,
  };
  doctrineStore = doctrineStore.map((entry) => (entry.opId === opId ? nextDoctrine : entry));

  const nextMandates: OperationMandateProfile = {
    ...mandates,
    roleMandates: defaultRoleMandates(posture),
    loadoutMandates: defaultLoadoutMandates(posture),
    assetMandates: defaultAssetMandates(posture),
    updatedAt: nowIso(nowMs),
    updatedBy: actorId || mandates.updatedBy,
  };
  mandateStore = mandateStore.map((entry) => (entry.opId === opId ? nextMandates : entry));
  notifyListeners();
  return { doctrine: nextDoctrine, mandates: nextMandates };
}

export function getOperationDoctrineProfile(opId: string): OperationDoctrineProfile | null {
  hydrateStore();
  return doctrineStore.find((entry) => entry.opId === opId) || null;
}

export function getOperationMandateProfile(opId: string): OperationMandateProfile | null {
  hydrateStore();
  return mandateStore.find((entry) => entry.opId === opId) || null;
}

export function setDoctrineSelection(
  opId: string,
  level: DoctrineLevel,
  doctrineId: string,
  patch: Partial<Pick<DoctrineSelection, 'enabled' | 'weight'>>,
  actorId?: string,
  nowMs = Date.now()
): OperationDoctrineProfile {
  hydrateStore();
  const profile = doctrineStore.find((entry) => entry.opId === opId);
  if (!profile) throw new Error(`Doctrine profile missing for ${opId}`);
  const selections = profile.doctrineByLevel[level] || [];
  const idx = selections.findIndex((entry) => entry.doctrineId === doctrineId);
  if (idx < 0) throw new Error(`Doctrine ${doctrineId} is not registered at level ${level}`);

  const target = selections[idx];
  const nextSelection: DoctrineSelection = {
    ...target,
    enabled: typeof patch.enabled === 'boolean' ? patch.enabled : target.enabled,
    weight: Number.isFinite(patch.weight)
      ? Math.max(0, Math.min(1, Number(patch.weight)))
      : target.weight,
  };

  const nextLevel = selections.map((entry, index) => (index === idx ? nextSelection : entry));
  const updated: OperationDoctrineProfile = {
    ...profile,
    doctrineByLevel: {
      ...profile.doctrineByLevel,
      [level]: nextLevel,
    },
    updatedAt: nowIso(nowMs),
    updatedBy: actorId || profile.updatedBy,
  };
  doctrineStore = doctrineStore.map((entry) => (entry.opId === opId ? updated : entry));
  notifyListeners();
  return updated;
}

function normalizeMandateEnforcement(value: unknown, fallback: MandateEnforcement): MandateEnforcement {
  const token = String(value || '').trim().toUpperCase();
  if (token === 'HARD' || token === 'SOFT' || token === 'ADVISORY') return token;
  return fallback;
}

export function upsertRoleMandate(
  opId: string,
  input: Partial<RoleMandate> & Pick<RoleMandate, 'role' | 'minCount'>,
  actorId?: string,
  nowMs = Date.now()
): OperationMandateProfile {
  hydrateStore();
  const profile = mandateStore.find((entry) => entry.opId === opId);
  if (!profile) throw new Error(`Mandate profile missing for ${opId}`);
  const id = normalizeToken(input.id || '', 80) || createId('role_mandate', nowMs);
  const role = normalizeToken(input.role, 64);
  if (!role) throw new Error('Role mandate requires role');
  const mandate: RoleMandate = {
    id,
    role,
    minCount: Math.max(0, Number(input.minCount || 0)),
    maxCount:
      typeof input.maxCount === 'number' && Number.isFinite(input.maxCount)
        ? Math.max(0, Number(input.maxCount))
        : undefined,
    enforcement: normalizeMandateEnforcement(input.enforcement, 'SOFT'),
    requiredLoadoutTags: normalizeTokenList(input.requiredLoadoutTags),
    blockedLoadoutTags: normalizeTokenList(input.blockedLoadoutTags),
    notes: normalizeToken(input.notes, 260) || undefined,
  };
  const exists = profile.roleMandates.some((entry) => entry.id === id);
  const roleMandates = exists
    ? profile.roleMandates.map((entry) => (entry.id === id ? mandate : entry))
    : [mandate, ...profile.roleMandates];
  const updated: OperationMandateProfile = {
    ...profile,
    roleMandates,
    updatedAt: nowIso(nowMs),
    updatedBy: actorId || profile.updatedBy,
  };
  mandateStore = mandateStore.map((entry) => (entry.opId === opId ? updated : entry));
  notifyListeners();
  return updated;
}

export function removeRoleMandate(
  opId: string,
  mandateId: string,
  actorId?: string,
  nowMs = Date.now()
): OperationMandateProfile {
  hydrateStore();
  const profile = mandateStore.find((entry) => entry.opId === opId);
  if (!profile) throw new Error(`Mandate profile missing for ${opId}`);
  const roleMandates = profile.roleMandates.filter((entry) => entry.id !== mandateId);
  const updated: OperationMandateProfile = {
    ...profile,
    roleMandates,
    updatedAt: nowIso(nowMs),
    updatedBy: actorId || profile.updatedBy,
  };
  mandateStore = mandateStore.map((entry) => (entry.opId === opId ? updated : entry));
  notifyListeners();
  return updated;
}

export function upsertLoadoutMandate(
  opId: string,
  input: Partial<LoadoutMandate> & Pick<LoadoutMandate, 'label'>,
  actorId?: string,
  nowMs = Date.now()
): OperationMandateProfile {
  hydrateStore();
  const profile = mandateStore.find((entry) => entry.opId === opId);
  if (!profile) throw new Error(`Mandate profile missing for ${opId}`);
  const id = normalizeToken(input.id || '', 80) || createId('loadout_mandate', nowMs);
  const label = normalizeToken(input.label, 72);
  if (!label) throw new Error('Loadout mandate requires label');
  const mandate: LoadoutMandate = {
    id,
    label,
    tagsAny: normalizeTokenList(input.tagsAny),
    tagsAll: normalizeTokenList(input.tagsAll),
    blockedTags: normalizeTokenList(input.blockedTags),
    appliesToRoles: normalizeTokenList(input.appliesToRoles),
    enforcement: normalizeMandateEnforcement(input.enforcement, 'SOFT'),
    notes: normalizeToken(input.notes, 260) || undefined,
  };
  const exists = profile.loadoutMandates.some((entry) => entry.id === id);
  const loadoutMandates = exists
    ? profile.loadoutMandates.map((entry) => (entry.id === id ? mandate : entry))
    : [mandate, ...profile.loadoutMandates];
  const updated: OperationMandateProfile = {
    ...profile,
    loadoutMandates,
    updatedAt: nowIso(nowMs),
    updatedBy: actorId || profile.updatedBy,
  };
  mandateStore = mandateStore.map((entry) => (entry.opId === opId ? updated : entry));
  notifyListeners();
  return updated;
}

export function removeLoadoutMandate(
  opId: string,
  mandateId: string,
  actorId?: string,
  nowMs = Date.now()
): OperationMandateProfile {
  hydrateStore();
  const profile = mandateStore.find((entry) => entry.opId === opId);
  if (!profile) throw new Error(`Mandate profile missing for ${opId}`);
  const loadoutMandates = profile.loadoutMandates.filter((entry) => entry.id !== mandateId);
  const updated: OperationMandateProfile = {
    ...profile,
    loadoutMandates,
    updatedAt: nowIso(nowMs),
    updatedBy: actorId || profile.updatedBy,
  };
  mandateStore = mandateStore.map((entry) => (entry.opId === opId ? updated : entry));
  notifyListeners();
  return updated;
}

export function upsertAssetMandate(
  opId: string,
  input: Partial<AssetMandate> & Pick<AssetMandate, 'assetTag' | 'minCount'>,
  actorId?: string,
  nowMs = Date.now()
): OperationMandateProfile {
  hydrateStore();
  const profile = mandateStore.find((entry) => entry.opId === opId);
  if (!profile) throw new Error(`Mandate profile missing for ${opId}`);
  const id = normalizeToken(input.id || '', 80) || createId('asset_mandate', nowMs);
  const assetTag = normalizeToken(input.assetTag, 64);
  if (!assetTag) throw new Error('Asset mandate requires assetTag');
  const mandate: AssetMandate = {
    id,
    assetTag,
    minCount: Math.max(0, Number(input.minCount || 0)),
    maxCount:
      typeof input.maxCount === 'number' && Number.isFinite(input.maxCount)
        ? Math.max(0, Number(input.maxCount))
        : undefined,
    enforcement: normalizeMandateEnforcement(input.enforcement, 'SOFT'),
    notes: normalizeToken(input.notes, 260) || undefined,
  };
  const exists = profile.assetMandates.some((entry) => entry.id === id);
  const assetMandates = exists
    ? profile.assetMandates.map((entry) => (entry.id === id ? mandate : entry))
    : [mandate, ...profile.assetMandates];
  const updated: OperationMandateProfile = {
    ...profile,
    assetMandates,
    updatedAt: nowIso(nowMs),
    updatedBy: actorId || profile.updatedBy,
  };
  mandateStore = mandateStore.map((entry) => (entry.opId === opId ? updated : entry));
  notifyListeners();
  return updated;
}

export function removeAssetMandate(
  opId: string,
  mandateId: string,
  actorId?: string,
  nowMs = Date.now()
): OperationMandateProfile {
  hydrateStore();
  const profile = mandateStore.find((entry) => entry.opId === opId);
  if (!profile) throw new Error(`Mandate profile missing for ${opId}`);
  const assetMandates = profile.assetMandates.filter((entry) => entry.id !== mandateId);
  const updated: OperationMandateProfile = {
    ...profile,
    assetMandates,
    updatedAt: nowIso(nowMs),
    updatedBy: actorId || profile.updatedBy,
  };
  mandateStore = mandateStore.map((entry) => (entry.opId === opId ? updated : entry));
  notifyListeners();
  return updated;
}

function normalizePreferenceRoles(value: unknown): string[] {
  return normalizeTokenList(value, 64).slice(0, 12);
}

function normalizePreferenceTags(value: unknown): string[] {
  return normalizeTokenList(value, 64).slice(0, 16);
}

export function upsertUserOperationPreference(
  input: Partial<UserOperationPreference> & Pick<UserOperationPreference, 'userId'>,
  nowMs = Date.now()
): UserOperationPreference {
  hydrateStore();
  const userId = normalizeToken(input.userId, 120);
  if (!userId) throw new Error('Preference requires userId');
  const existing = preferenceStore.find((entry) => entry.userId === userId);
  const postureToken = String(input.postureAffinity || existing?.postureAffinity || 'ANY').toUpperCase();
  const postureAffinity: UserOperationPreference['postureAffinity'] =
    postureToken === 'CASUAL' || postureToken === 'FOCUSED' ? postureToken : 'ANY';
  const availabilityToken = String(input.availability || existing?.availability || 'AUTO').toUpperCase();
  const availability: UserOperationPreference['availability'] =
    availabilityToken === 'MANUAL' || availabilityToken === 'AWAY' ? availabilityToken : 'AUTO';

  const next: UserOperationPreference = {
    userId,
    preferredRoles: normalizePreferenceRoles(input.preferredRoles || existing?.preferredRoles || []),
    activityTags: normalizePreferenceTags(input.activityTags || existing?.activityTags || []),
    postureAffinity,
    availability,
    notifyOptIn:
      typeof input.notifyOptIn === 'boolean'
        ? input.notifyOptIn
        : typeof existing?.notifyOptIn === 'boolean'
        ? existing.notifyOptIn
        : true,
    updatedAt: nowIso(nowMs),
  };

  preferenceStore = existing
    ? preferenceStore.map((entry) => (entry.userId === userId ? next : entry))
    : [next, ...preferenceStore];
  notifyListeners();
  return next;
}

export function getUserOperationPreference(userId: string): UserOperationPreference | null {
  hydrateStore();
  return preferenceStore.find((entry) => entry.userId === userId) || null;
}

export function listUserOperationPreferences(): UserOperationPreference[] {
  hydrateStore();
  return [...preferenceStore];
}

function normalizeRoleToken(role: string): string {
  return String(role || '').trim().toLowerCase();
}

function scoreCandidateForRole(
  candidate: CandidatePoolEntry,
  preference: UserOperationPreference | null,
  posture: OperationPosture,
  role: string,
  mandates: OperationMandateProfile | null
): CandidateMatch {
  const reasons: string[] = [];
  let score = 12;
  const targetRoleToken = normalizeRoleToken(role);
  const candidateRoleToken = normalizeRoleToken(candidate.role || '');
  const preferredRoles = (preference?.preferredRoles || []).map((entry) => normalizeRoleToken(entry));
  const preferredTags = (preference?.activityTags || []).map((entry) => normalizeRoleToken(entry));
  const loadoutTags = [...new Set([...(candidate.loadoutTags || []), ...(candidate.activityTags || [])])].map((entry) =>
    normalizeRoleToken(entry)
  );

  if (candidateRoleToken && candidateRoleToken === targetRoleToken) {
    score += 34;
    reasons.push('Current roster role matches demand.');
  }
  if (preferredRoles.includes(targetRoleToken)) {
    score += 36;
    reasons.push('User preference matches demanded role.');
  }
  if (preferredTags.some((entry) => targetRoleToken.includes(entry) || entry.includes(targetRoleToken))) {
    score += 12;
    reasons.push('Activity preferences align with demand.');
  }
  if (!preference) {
    reasons.push('No explicit preference profile; scored from roster role only.');
  } else {
    if (preference.postureAffinity === posture) {
      score += 8;
      reasons.push(`Posture affinity: ${preference.postureAffinity}.`);
    } else if (preference.postureAffinity === 'ANY') {
      score += 4;
    }
    if (preference.availability === 'MANUAL') score -= 4;
    if (preference.availability === 'AWAY') score -= 18;
  }

  if (candidate.availability === 'LIMITED') score -= 8;
  if (candidate.availability === 'OFFLINE') score -= 26;

  let blockedByHardMandate = false;
  if (mandates) {
    for (const roleMandate of mandates.roleMandates) {
      const mandateRoleToken = normalizeRoleToken(roleMandate.role);
      if (mandateRoleToken && mandateRoleToken !== targetRoleToken) continue;
      if (roleMandate.requiredLoadoutTags.length > 0) {
        const missingRequired = roleMandate.requiredLoadoutTags
          .map((entry) => normalizeRoleToken(entry))
          .filter((tag) => !loadoutTags.includes(tag));
        if (missingRequired.length > 0) {
          const msg = `Missing required tags: ${missingRequired.join(', ')}`;
          if (roleMandate.enforcement === 'HARD') {
            blockedByHardMandate = true;
            score -= 45;
          } else if (roleMandate.enforcement === 'SOFT') {
            score -= 12;
          } else {
            score -= 4;
          }
          reasons.push(msg);
        }
      }
      if (roleMandate.blockedLoadoutTags.length > 0) {
        const blocked = roleMandate.blockedLoadoutTags
          .map((entry) => normalizeRoleToken(entry))
          .filter((tag) => loadoutTags.includes(tag));
        if (blocked.length > 0) {
          const msg = `Contains blocked tags: ${blocked.join(', ')}`;
          if (roleMandate.enforcement === 'HARD') {
            blockedByHardMandate = true;
            score -= 45;
          } else if (roleMandate.enforcement === 'SOFT') {
            score -= 12;
          } else {
            score -= 4;
          }
          reasons.push(msg);
        }
      }
    }

    for (const loadoutMandate of mandates.loadoutMandates) {
      const applies =
        loadoutMandate.appliesToRoles.length === 0 ||
        loadoutMandate.appliesToRoles.map((entry) => normalizeRoleToken(entry)).includes(targetRoleToken);
      if (!applies) continue;
      const missingAny =
        loadoutMandate.tagsAny.length > 0 &&
        !loadoutMandate.tagsAny.map((entry) => normalizeRoleToken(entry)).some((tag) => loadoutTags.includes(tag));
      const missingAll = loadoutMandate.tagsAll
        .map((entry) => normalizeRoleToken(entry))
        .some((tag) => !loadoutTags.includes(tag));
      const hasBlocked = loadoutMandate.blockedTags
        .map((entry) => normalizeRoleToken(entry))
        .some((tag) => loadoutTags.includes(tag));
      if (!missingAny && !missingAll && !hasBlocked) continue;

      if (loadoutMandate.enforcement === 'HARD') {
        blockedByHardMandate = true;
        score -= 40;
      } else if (loadoutMandate.enforcement === 'SOFT') {
        score -= 10;
      } else {
        score -= 4;
      }
      reasons.push(`Loadout mandate "${loadoutMandate.label}" not satisfied.`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    userId: candidate.userId,
    callsign: candidate.callsign,
    matchedRole: role,
    score,
    reasons,
    blockedByHardMandate,
  };
}

function seatDemandsFromMandates(profile: OperationMandateProfile | null): SeatDemand[] {
  if (!profile) return [];
  return profile.roleMandates
    .filter((entry) => entry.minCount > 0)
    .map((entry) => ({
      role: entry.role,
      qty: entry.minCount,
      source: 'ROLE_MANDATE' as const,
    }));
}

export function buildSeatDemands(input: {
  openSeats?: Array<{ roleNeeded: string; openQty: number }>;
  mandates?: OperationMandateProfile | null;
}): SeatDemand[] {
  const merged = new Map<string, SeatDemand>();
  for (const seat of input.openSeats || []) {
    const role = normalizeToken(seat.roleNeeded, 64);
    if (!role) continue;
    const existing = merged.get(normalizeRoleToken(role));
    if (existing) {
      existing.qty += Math.max(0, Number(seat.openQty || 0));
    } else {
      merged.set(normalizeRoleToken(role), {
        role,
        qty: Math.max(0, Number(seat.openQty || 0)),
        source: 'OPEN_SEAT',
      });
    }
  }
  for (const seat of seatDemandsFromMandates(input.mandates || null)) {
    const key = normalizeRoleToken(seat.role);
    const existing = merged.get(key);
    if (existing) {
      existing.qty += Math.max(0, Number(seat.qty || 0));
      existing.source = existing.source === 'OPEN_SEAT' ? 'OPEN_SEAT' : seat.source;
    } else {
      merged.set(key, { ...seat });
    }
  }
  return Array.from(merged.values()).filter((entry) => entry.qty > 0);
}

export function computeOperationCandidateMatches(input: {
  opId: string;
  posture: OperationPosture;
  candidates: CandidatePoolEntry[];
  demands: SeatDemand[];
}): CandidateMatch[] {
  hydrateStore();
  const profile = getOperationMandateProfile(input.opId);
  const result: CandidateMatch[] = [];
  for (const demand of input.demands) {
    for (const candidate of input.candidates) {
      const preference = getUserOperationPreference(candidate.userId);
      const scored = scoreCandidateForRole(candidate, preference, input.posture, demand.role, profile);
      result.push(scored);
    }
  }
  return result.sort((a, b) => b.score - a.score);
}

function severityFromDemand(demandQty: number, highScoreMatches: number): LeadAlert['severity'] {
  if (demandQty >= 4 && highScoreMatches <= 1) return 'CRITICAL';
  if (demandQty >= 2 && highScoreMatches <= 2) return 'HIGH';
  if (demandQty >= 1) return 'MED';
  return 'LOW';
}

export function refreshOperationLeadAlerts(input: {
  opId: string;
  posture: OperationPosture;
  candidates: CandidatePoolEntry[];
  demands: SeatDemand[];
  nowMs?: number;
}): LeadAlert[] {
  hydrateStore();
  const nowMs = input.nowMs || Date.now();
  const matches = computeOperationCandidateMatches({
    opId: input.opId,
    posture: input.posture,
    candidates: input.candidates,
    demands: input.demands,
  });

  const existingByDemand = new Map<string, LeadAlert>();
  for (const existing of leadAlertStore.filter((entry) => entry.opId === input.opId)) {
    existingByDemand.set(normalizeRoleToken(existing.demandRole), existing);
  }

  const alerts: LeadAlert[] = [];
  for (const demand of input.demands) {
    const perRole = matches
      .filter((entry) => normalizeRoleToken(entry.matchedRole) === normalizeRoleToken(demand.role))
      .filter((entry) => !entry.blockedByHardMandate)
      .slice(0, Math.max(3, demand.qty + 1));
    if (perRole.length === 0) continue;
    const highScore = perRole.filter((entry) => entry.score >= 65).length;
    const notifyIds = perRole
      .filter((entry) => {
        const preference = getUserOperationPreference(entry.userId);
        return preference?.notifyOptIn !== false;
      })
      .map((entry) => entry.userId);
    const alertId = `lead_alert:${input.opId}:${normalizeRoleToken(demand.role)}`;
    const sortedNotify = [...new Set(notifyIds)].sort();
    const severity = severityFromDemand(demand.qty, highScore);
    const title = `${demand.role} demand: ${demand.qty}`;
    const summary =
      highScore > 0
        ? `${highScore} strong matches found for ${demand.role}.`
        : `No strong matches for ${demand.role}; broaden role or loadout mandates.`;
    const existing = existingByDemand.get(normalizeRoleToken(demand.role));
    const unchanged =
      Boolean(existing) &&
      existing?.severity === severity &&
      existing?.title === title &&
      existing?.summary === summary &&
      existing?.notifiedUserIds.join('|') === sortedNotify.join('|');
    alerts.push({
      id: alertId,
      opId: input.opId,
      severity,
      demandRole: demand.role,
      title,
      summary,
      notifiedUserIds: sortedNotify,
      createdAt: unchanged ? String(existing?.createdAt) : nowIso(nowMs),
    });
  }

  leadAlertStore = [
    ...leadAlertStore.filter((entry) => entry.opId !== input.opId),
    ...alerts,
  ];
  notifyListeners();
  return alerts;
}

export function listOperationLeadAlerts(opId: string): LeadAlert[] {
  hydrateStore();
  return leadAlertStore
    .filter((entry) => entry.opId === opId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listUserOperationLeadAlerts(userId: string, limit = 20): LeadAlert[] {
  hydrateStore();
  const token = normalizeToken(userId, 120);
  if (!token) return [];
  return leadAlertStore
    .filter((entry) => entry.notifiedUserIds.includes(token))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, Math.max(1, limit));
}

export function summarizeDoctrineImpact(opId: string): Array<{ level: DoctrineLevel; enabled: number; avgWeight: number }> {
  hydrateStore();
  const profile = doctrineStore.find((entry) => entry.opId === opId);
  if (!profile) return [];
  return LEVELS.map((level) => {
    const entries = profile.doctrineByLevel[level] || [];
    const enabled = entries.filter((entry) => entry.enabled).length;
    const avgWeight = enabled
      ? Number(
          (
            entries.filter((entry) => entry.enabled).reduce((sum, entry) => sum + entry.weight, 0) /
            enabled
          ).toFixed(2)
        )
      : 0;
    return { level, enabled, avgWeight };
  });
}

export function subscribeOperationEnhancements(listener: OperationEnhancementListener): () => void {
  hydrateStore();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetOperationEnhancementServiceState() {
  hydrateStore();
  doctrineStore = [];
  mandateStore = [];
  preferenceStore = [];
  leadAlertStore = [];
  if (storageAvailable()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // best effort
    }
  }
  storeHydrated = true;
  notifyListeners();
}
