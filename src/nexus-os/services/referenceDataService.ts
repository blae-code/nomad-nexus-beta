/**
 * Reference Data Service
 *
 * Purpose:
 * - Provide patch-stamped baseline specs for fitting/commerce/ops planning.
 * - Never claim live performance truth.
 * - Surface version-fallback warnings when exact patch data is unavailable.
 * - Support adapter-driven ingestion while preserving provenance integrity.
 */

import type {
  ComponentSpec,
  QTDriveSpec,
  ReferenceProvenance,
  ReferenceQueryWarning,
  ShipSpec,
  VersionedReferenceResult,
  WeaponSpec,
} from '../schemas/referenceDataSchemas';

export interface ShipSpecListFilter {
  gameVersion?: string;
  roleTag?: string;
  capability?: string;
  manufacturer?: string;
}

export interface CapabilityQueryCriteria {
  gameVersion?: string;
  capabilitiesAny?: string[];
  roleTagsAny?: string[];
  shipClassIn?: string[];
  minCrewSeats?: number;
}

export interface ReferenceDataAdapterContext {
  nowMs: number;
  requestedGameVersion?: string;
  includeSeedFallback: boolean;
}

export type ShipSpecAdapterRecord = Omit<ShipSpec, keyof ReferenceProvenance> &
  Partial<ReferenceProvenance>;
export type ComponentSpecAdapterRecord = Omit<ComponentSpec, keyof ReferenceProvenance> &
  Partial<ReferenceProvenance>;

export interface ReferenceDataAdapterPayload {
  source?: string;
  gameVersion?: string;
  importedAt?: string;
  ships?: ShipSpecAdapterRecord[];
  components?: ComponentSpecAdapterRecord[];
}

export interface ReferenceDataAdapter {
  id: string;
  priority?: number;
  fetchBaseline:
    | ((
        context: ReferenceDataAdapterContext
      ) => ReferenceDataAdapterPayload | Promise<ReferenceDataAdapterPayload>);
}

export interface ReferenceDataAdapterIngestionStatus {
  adapterId: string;
  importedShips: number;
  importedComponents: number;
  warnings: string[];
  error?: string;
}

export interface ReferenceDataAdapterRefreshResult {
  refreshedAt: string;
  shipCount: number;
  componentCount: number;
  warnings: string[];
  adapters: ReferenceDataAdapterIngestionStatus[];
}

export interface ReferenceDataAdapterHealth {
  lastRefreshedAt: string | null;
  warnings: string[];
  adapters: ReferenceDataAdapterIngestionStatus[];
  shipCount: number;
  componentCount: number;
}

export interface ReferenceDataRefreshOptions {
  requestedGameVersion?: string;
  includeSeedFallback?: boolean;
  nowMs?: number;
}

function normalizeToken(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function parseVersionStamp(version: string): number[] {
  const parts = String(version || '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((part) => Number(part));
  return parts.length ? parts : [0];
}

function compareVersions(a: string, b: string): number {
  const pa = parseVersionStamp(a);
  const pb = parseVersionStamp(b);
  const max = Math.max(pa.length, pb.length);
  for (let i = 0; i < max; i += 1) {
    const av = pa[i] || 0;
    const bv = pb[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function newestByImport<T extends { importedAt: string }>(records: T[]): T | null {
  if (!records.length) return null;
  return [...records].sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())[0];
}

function selectBestByVersion<T extends { gameVersion: string; importedAt: string }>(
  records: T[],
  requestedVersion?: string
): VersionedReferenceResult<T> {
  if (!records.length) {
    return {
      data: null,
      warnings: [{ code: 'MISSING_DATA', message: 'No records found for requested identifier.' }],
    };
  }

  if (!requestedVersion) {
    return { data: newestByImport(records), warnings: [] };
  }

  const exact = records.find((record) => record.gameVersion === requestedVersion);
  if (exact) return { data: exact, warnings: [] };

  const compatible = [...records].sort((a, b) => compareVersions(b.gameVersion, a.gameVersion));
  const lowerOrEqual = compatible.find((record) => compareVersions(record.gameVersion, requestedVersion) <= 0);
  if (lowerOrEqual) {
    const warnings: ReferenceQueryWarning[] = [
      {
        code: 'VERSION_FALLBACK',
        message: `No exact record for ${requestedVersion}; falling back to ${lowerOrEqual.gameVersion}.`,
      },
    ];
    return { data: lowerOrEqual, warnings };
  }

  const latest = newestByImport(records);
  return {
    data: latest,
    warnings: [
      {
        code: 'VERSION_FALLBACK',
        message: `No compatible record for ${requestedVersion}; using latest available baseline ${latest?.gameVersion || 'unknown'}.`,
      },
    ],
  };
}

function normalizeIsoTimestamp(value: string | undefined): string | null {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  const ms = new Date(normalized).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function normalizeProvenance(
  base: Partial<ReferenceProvenance>,
  defaults: Partial<ReferenceProvenance>,
  warnings: string[],
  label: string
): ReferenceProvenance | null {
  const gameVersion = String(base.gameVersion || defaults.gameVersion || '').trim();
  const source = String(base.source || defaults.source || '').trim();
  const importedAt = normalizeIsoTimestamp(base.importedAt || defaults.importedAt);
  if (!gameVersion || !source || !importedAt) {
    warnings.push(`${label} skipped: missing provenance fields (gameVersion/source/importedAt).`);
    return null;
  }
  return { gameVersion, source, importedAt };
}

function normalizeShipRecord(
  record: ShipSpecAdapterRecord,
  defaults: Partial<ReferenceProvenance>,
  warnings: string[],
  adapterId: string
): ShipSpec | null {
  const id = String(record.id || '').trim();
  const name = String(record.name || '').trim();
  const manufacturer = String(record.manufacturer || '').trim();
  const shipClass = String(record.shipClass || '').trim();
  if (!id || !name || !manufacturer || !shipClass) {
    warnings.push(`${adapterId}: ship skipped due to missing id/name/manufacturer/shipClass.`);
    return null;
  }

  const provenance = normalizeProvenance(record, defaults, warnings, `${adapterId}:${id}`);
  if (!provenance) return null;

  return {
    id,
    name,
    manufacturer,
    shipClass,
    roleTags: Array.isArray(record.roleTags)
      ? record.roleTags.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    hardpointsSummary:
      record.hardpointsSummary && typeof record.hardpointsSummary === 'object'
        ? record.hardpointsSummary
        : {},
    crewSeats: Number.isFinite(Number(record.crewSeats)) ? Math.max(0, Number(record.crewSeats)) : 0,
    cargoClass: record.cargoClass,
    capabilities: Array.isArray(record.capabilities)
      ? record.capabilities.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    ...provenance,
  };
}

function normalizeComponentRecord(
  record: ComponentSpecAdapterRecord,
  defaults: Partial<ReferenceProvenance>,
  warnings: string[],
  adapterId: string
): ComponentSpec | null {
  const id = String(record.id || '').trim();
  const name = String(record.name || '').trim();
  const sizeClass = String(record.sizeClass || '').trim();
  if (!id || !name || !sizeClass) {
    warnings.push(`${adapterId}: component skipped due to missing id/name/sizeClass.`);
    return null;
  }

  const provenance = normalizeProvenance(record, defaults, warnings, `${adapterId}:${id}`);
  if (!provenance) return null;

  const type = normalizeToken(String(record.type || 'other')) || 'other';
  return {
    id,
    name,
    type: type as ComponentSpec['type'],
    sizeClass,
    baselineStats:
      record.baselineStats && typeof record.baselineStats === 'object' ? record.baselineStats : {},
    compatibleShipClasses: Array.isArray(record.compatibleShipClasses)
      ? record.compatibleShipClasses.map((item) => String(item || '').trim()).filter(Boolean)
      : undefined,
    ...provenance,
  };
}

function dedupeByRecordIdentity<T extends { id: string; gameVersion: string; importedAt: string }>(
  records: T[]
): T[] {
  const deduped = new Map<string, T>();
  for (const record of records) {
    const key = `${normalizeToken(record.id)}::${normalizeToken(record.gameVersion)}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, record);
      continue;
    }
    const newer = new Date(record.importedAt).getTime() > new Date(existing.importedAt).getTime();
    if (newer) deduped.set(key, record);
  }
  return [...deduped.values()];
}

function sortAdapters(adapters: ReferenceDataAdapter[]): ReferenceDataAdapter[] {
  return [...adapters].sort((a, b) => {
    const priorityDelta = (b.priority || 0) - (a.priority || 0);
    if (priorityDelta !== 0) return priorityDelta;
    return a.id.localeCompare(b.id);
  });
}

const SEED_SHIP_SPECS: ShipSpec[] = [
  {
    id: 'ship-cutlass-black',
    name: 'Cutlass Black',
    manufacturer: 'Drake Interplanetary',
    shipClass: 'Medium Multi-Role',
    roleTags: ['combat', 'boarding', 'transport'],
    hardpointsSummary: { weaponMounts: 6, missileRacks: 2, turretMounts: 1, notes: 'Approximate summary only.' },
    crewSeats: 3,
    cargoClass: 'Medium',
    capabilities: ['boarding', 'transport'],
    gameVersion: '4.0.0',
    source: 'Redscar curated baseline pack',
    importedAt: '2026-02-09T00:00:00.000Z',
  },
  {
    id: 'ship-carrack',
    name: 'Carrack',
    manufacturer: 'Anvil Aerospace',
    shipClass: 'Large Expedition',
    roleTags: ['exploration', 'logistics', 'medical_support'],
    hardpointsSummary: { weaponMounts: 4, turretMounts: 3, utilityMounts: 2, notes: 'Baseline envelope only.' },
    crewSeats: 6,
    cargoClass: 'Large',
    capabilities: ['exploration', 'medical', 'long_range_ops'],
    gameVersion: '4.0.0',
    source: 'Redscar curated baseline pack',
    importedAt: '2026-02-09T00:00:00.000Z',
  },
  {
    id: 'ship-cutlass-black',
    name: 'Cutlass Black',
    manufacturer: 'Drake Interplanetary',
    shipClass: 'Medium Multi-Role',
    roleTags: ['combat', 'transport'],
    hardpointsSummary: { weaponMounts: 6, missileRacks: 2, turretMounts: 1 },
    crewSeats: 3,
    cargoClass: 'Medium',
    capabilities: ['boarding', 'transport'],
    gameVersion: '3.23.1',
    source: 'Legacy baseline archive',
    importedAt: '2025-12-15T00:00:00.000Z',
  },
];

const SEED_COMPONENT_SPECS: ComponentSpec[] = [
  {
    id: 'weapon-panther-repeater',
    name: 'Panther Repeater',
    type: 'weapon',
    sizeClass: 'S3',
    baselineStats: { fireRateTag: 'high', damageProfile: 'energy' },
    compatibleShipClasses: ['Light Fighter', 'Medium Multi-Role'],
    gameVersion: '4.0.0',
    source: 'Redscar curated baseline pack',
    importedAt: '2026-02-09T00:00:00.000Z',
  },
  {
    id: 'qt-vk00',
    name: 'VK-00',
    type: 'qt_drive',
    sizeClass: 'S1',
    baselineStats: { spoolSecondsBand: 'short', fuelUseBand: 'high' },
    compatibleShipClasses: ['Light Fighter', 'Medium Multi-Role'],
    gameVersion: '4.0.0',
    source: 'Redscar curated baseline pack',
    importedAt: '2026-02-09T00:00:00.000Z',
  },
  {
    id: 'shield-fr66',
    name: 'FR-66',
    type: 'shield',
    sizeClass: 'S2',
    baselineStats: { regenBand: 'high', durabilityBand: 'high' },
    compatibleShipClasses: ['Medium Multi-Role', 'Medium Fighter'],
    gameVersion: '4.0.0',
    source: 'Redscar curated baseline pack',
    importedAt: '2026-02-09T00:00:00.000Z',
  },
];

let shipSpecStore: ShipSpec[] = [...SEED_SHIP_SPECS];
let componentSpecStore: ComponentSpec[] = [...SEED_COMPONENT_SPECS];
const referenceDataAdapterStore = new Map<string, ReferenceDataAdapter>();
let referenceDataAdapterStatuses: ReferenceDataAdapterIngestionStatus[] = [];
let referenceDataLastRefreshAt: string | null = null;
let referenceDataRefreshWarnings: string[] = [];

export function registerReferenceDataAdapter(adapter: ReferenceDataAdapter): void {
  const id = String(adapter.id || '').trim();
  if (!id) throw new Error('ReferenceDataAdapter id is required.');
  if (typeof adapter.fetchBaseline !== 'function') {
    throw new Error(`ReferenceDataAdapter ${id} must provide fetchBaseline(context).`);
  }
  referenceDataAdapterStore.set(id, { ...adapter, id });
}

export function unregisterReferenceDataAdapter(adapterId: string): boolean {
  return referenceDataAdapterStore.delete(String(adapterId || '').trim());
}

export function listReferenceDataAdapters(): ReferenceDataAdapter[] {
  return sortAdapters([...referenceDataAdapterStore.values()]);
}

export function getReferenceDataAdapterHealth(): ReferenceDataAdapterHealth {
  return {
    lastRefreshedAt: referenceDataLastRefreshAt,
    warnings: [...referenceDataRefreshWarnings],
    adapters: referenceDataAdapterStatuses.map((status) => ({
      ...status,
      warnings: [...status.warnings],
    })),
    shipCount: shipSpecStore.length,
    componentCount: componentSpecStore.length,
  };
}

export async function refreshReferenceDataFromAdapters(
  options: ReferenceDataRefreshOptions = {}
): Promise<ReferenceDataAdapterRefreshResult> {
  const nowMs = Number(options.nowMs) || Date.now();
  const refreshedAt = new Date(nowMs).toISOString();
  const includeSeedFallback = options.includeSeedFallback !== false;
  const adapters = listReferenceDataAdapters();
  const statuses: ReferenceDataAdapterIngestionStatus[] = [];
  const warnings: string[] = [];
  const nextShipRecords: ShipSpec[] = includeSeedFallback ? [...SEED_SHIP_SPECS] : [];
  const nextComponentRecords: ComponentSpec[] = includeSeedFallback ? [...SEED_COMPONENT_SPECS] : [];

  for (const adapter of adapters) {
    const adapterWarnings: string[] = [];
    let importedShips = 0;
    let importedComponents = 0;
    try {
      const payload = await adapter.fetchBaseline({
        nowMs,
        requestedGameVersion: options.requestedGameVersion,
        includeSeedFallback,
      });
      const defaults: Partial<ReferenceProvenance> = {
        source: payload.source,
        gameVersion: payload.gameVersion,
        importedAt: payload.importedAt || refreshedAt,
      };

      for (const ship of payload.ships || []) {
        const normalized = normalizeShipRecord(ship, defaults, adapterWarnings, adapter.id);
        if (!normalized) continue;
        nextShipRecords.push(normalized);
        importedShips += 1;
      }
      for (const component of payload.components || []) {
        const normalized = normalizeComponentRecord(component, defaults, adapterWarnings, adapter.id);
        if (!normalized) continue;
        nextComponentRecords.push(normalized);
        importedComponents += 1;
      }
      statuses.push({
        adapterId: adapter.id,
        importedShips,
        importedComponents,
        warnings: adapterWarnings,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      statuses.push({
        adapterId: adapter.id,
        importedShips,
        importedComponents,
        warnings: adapterWarnings,
        error: message,
      });
      warnings.push(`${adapter.id} ingestion failed: ${message}`);
    }
  }

  const dedupedShips = dedupeByRecordIdentity(nextShipRecords);
  const dedupedComponents = dedupeByRecordIdentity(nextComponentRecords);
  if (dedupedShips.length > 0) {
    shipSpecStore = dedupedShips;
  } else {
    warnings.push('Reference refresh produced zero ship specs; retaining previous dataset.');
  }
  if (dedupedComponents.length > 0) {
    componentSpecStore = dedupedComponents;
  } else {
    warnings.push('Reference refresh produced zero component specs; retaining previous dataset.');
  }

  referenceDataAdapterStatuses = statuses;
  referenceDataLastRefreshAt = refreshedAt;
  referenceDataRefreshWarnings = [...warnings];

  return {
    refreshedAt,
    shipCount: shipSpecStore.length,
    componentCount: componentSpecStore.length,
    warnings,
    adapters: statuses,
  };
}

export function getReferenceDatasetGameVersions(): string[] {
  const versions = new Set<string>();
  for (const entry of shipSpecStore) versions.add(entry.gameVersion);
  for (const entry of componentSpecStore) versions.add(entry.gameVersion);
  return [...versions].sort(compareVersions).reverse();
}

export function getDefaultReferenceGameVersion(): string {
  return getReferenceDatasetGameVersions()[0] || 'unknown';
}

export function getShipSpec(id: string, gameVersion?: string): VersionedReferenceResult<ShipSpec> {
  const records = shipSpecStore.filter((entry) => normalizeToken(entry.id) === normalizeToken(id));
  return selectBestByVersion(records, gameVersion);
}

export function listShipSpecs(filter: ShipSpecListFilter = {}): ShipSpec[] {
  const normalizedRoleTag = normalizeToken(filter.roleTag);
  const normalizedCapability = normalizeToken(filter.capability);
  const normalizedManufacturer = normalizeToken(filter.manufacturer);

  const latestById = new Map<string, ShipSpec>();
  for (const record of shipSpecStore) {
    const existing = latestById.get(record.id);
    if (!existing) {
      latestById.set(record.id, record);
      continue;
    }
    const better = selectBestByVersion([existing, record], filter.gameVersion).data;
    if (better) latestById.set(record.id, better);
  }

  return [...latestById.values()].filter((entry) => {
    if (normalizedRoleTag && !entry.roleTags.map(normalizeToken).includes(normalizedRoleTag)) return false;
    if (normalizedCapability && !entry.capabilities.map(normalizeToken).includes(normalizedCapability)) return false;
    if (normalizedManufacturer && normalizeToken(entry.manufacturer) !== normalizedManufacturer) return false;
    return true;
  });
}

export function getComponentSpec(id: string, gameVersion?: string): VersionedReferenceResult<ComponentSpec> {
  const records = componentSpecStore.filter((entry) => normalizeToken(entry.id) === normalizeToken(id));
  return selectBestByVersion(records, gameVersion);
}

export function queryCapabilities(criteria: CapabilityQueryCriteria = {}): ShipSpec[] {
  const capabilitySet = new Set((criteria.capabilitiesAny || []).map(normalizeToken));
  const roleSet = new Set((criteria.roleTagsAny || []).map(normalizeToken));
  const classSet = new Set((criteria.shipClassIn || []).map(normalizeToken));

  return listShipSpecs({ gameVersion: criteria.gameVersion }).filter((entry) => {
    if (capabilitySet.size > 0) {
      const entryCaps = entry.capabilities.map(normalizeToken);
      if (!entryCaps.some((cap) => capabilitySet.has(cap))) return false;
    }
    if (roleSet.size > 0) {
      const entryRoles = entry.roleTags.map(normalizeToken);
      if (!entryRoles.some((role) => roleSet.has(role))) return false;
    }
    if (classSet.size > 0 && !classSet.has(normalizeToken(entry.shipClass))) return false;
    if (typeof criteria.minCrewSeats === 'number' && entry.crewSeats < criteria.minCrewSeats) return false;
    return true;
  });
}

export function listWeaponSpecs(gameVersion?: string): WeaponSpec[] {
  const records = componentSpecStore.filter((entry) => entry.type === 'weapon') as WeaponSpec[];
  if (!gameVersion) return records.map((entry) => ({ ...entry }));
  return records.filter((entry) => entry.gameVersion === gameVersion).map((entry) => ({ ...entry }));
}

export function listQTDriveSpecs(gameVersion?: string): QTDriveSpec[] {
  const records = componentSpecStore.filter((entry) => entry.type === 'qt_drive') as QTDriveSpec[];
  if (!gameVersion) return records.map((entry) => ({ ...entry }));
  return records.filter((entry) => entry.gameVersion === gameVersion).map((entry) => ({ ...entry }));
}

export function listAllComponentSpecs(gameVersion?: string): ComponentSpec[] {
  if (!gameVersion) return componentSpecStore.map((entry) => ({ ...entry }));
  return componentSpecStore
    .filter((entry) => entry.gameVersion === gameVersion)
    .map((entry) => ({ ...entry }));
}

export function resetReferenceDataServiceState(): void {
  shipSpecStore = [...SEED_SHIP_SPECS];
  componentSpecStore = [...SEED_COMPONENT_SPECS];
  referenceDataAdapterStore.clear();
  referenceDataAdapterStatuses = [];
  referenceDataLastRefreshAt = null;
  referenceDataRefreshWarnings = [];
}
