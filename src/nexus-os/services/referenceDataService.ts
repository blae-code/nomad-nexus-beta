/**
 * Reference Data Service (MVP repository stub)
 *
 * Purpose:
 * - Provide patch-stamped baseline specs for fitting/commerce/ops planning.
 * - Never claim live performance truth.
 * - Surface version-fallback warnings when exact patch data is unavailable.
 *
 * TODO(adapter):
 * - Replace in-memory seed data with external adapters (e.g. Fleetyards/UEX exports).
 * - Keep adapter output patch-stamped and provenance-complete.
 */

import type {
  ComponentSpec,
  QTDriveSpec,
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

const SHIP_SPECS: ShipSpec[] = [
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

const WEAPON_SPECS: WeaponSpec[] = [
  {
    id: 'weapon-panther-repeater',
    name: 'Panther Repeater',
    type: 'weapon',
    sizeClass: 'S3',
    baselineStats: { fireRateTag: 'high', damageProfile: 'energy' },
    compatibleShipClasses: ['Light Fighter', 'Medium Multi-Role'],
    baselineDPS: 720,
    effectiveRange: 1500,
    notes: 'Baseline value; in-combat result depends on loadout and pilot behavior.',
    gameVersion: '4.0.0',
    source: 'Redscar curated baseline pack',
    importedAt: '2026-02-09T00:00:00.000Z',
  },
];

const QT_DRIVE_SPECS: QTDriveSpec[] = [
  {
    id: 'qt-vk00',
    name: 'VK-00',
    type: 'qt_drive',
    sizeClass: 'S1',
    size: 'S1',
    rangeClass: 'MEDIUM',
    spoolProfileTag: 'fast_spool',
    efficiencyTag: 'low_efficiency',
    baselineStats: { spoolSecondsBand: 'short', fuelUseBand: 'high' },
    compatibleShipClasses: ['Light Fighter', 'Medium Multi-Role'],
    gameVersion: '4.0.0',
    source: 'Redscar curated baseline pack',
    importedAt: '2026-02-09T00:00:00.000Z',
  },
];

const COMPONENT_SPECS: ComponentSpec[] = [
  ...WEAPON_SPECS,
  ...QT_DRIVE_SPECS,
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

export function getReferenceDatasetGameVersions(): string[] {
  const versions = new Set<string>();
  for (const entry of SHIP_SPECS) versions.add(entry.gameVersion);
  for (const entry of COMPONENT_SPECS) versions.add(entry.gameVersion);
  return [...versions].sort(compareVersions).reverse();
}

export function getDefaultReferenceGameVersion(): string {
  return getReferenceDatasetGameVersions()[0] || 'unknown';
}

export function getShipSpec(id: string, gameVersion?: string): VersionedReferenceResult<ShipSpec> {
  const records = SHIP_SPECS.filter((entry) => normalizeToken(entry.id) === normalizeToken(id));
  return selectBestByVersion(records, gameVersion);
}

export function listShipSpecs(filter: ShipSpecListFilter = {}): ShipSpec[] {
  const normalizedRoleTag = normalizeToken(filter.roleTag);
  const normalizedCapability = normalizeToken(filter.capability);
  const normalizedManufacturer = normalizeToken(filter.manufacturer);

  const latestById = new Map<string, ShipSpec>();
  for (const record of SHIP_SPECS) {
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
  const records = COMPONENT_SPECS.filter((entry) => normalizeToken(entry.id) === normalizeToken(id));
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
  if (!gameVersion) return [...WEAPON_SPECS];
  return WEAPON_SPECS.filter((entry) => entry.gameVersion === gameVersion);
}

export function listQTDriveSpecs(gameVersion?: string): QTDriveSpec[] {
  if (!gameVersion) return [...QT_DRIVE_SPECS];
  return QT_DRIVE_SPECS.filter((entry) => entry.gameVersion === gameVersion);
}

export function listAllComponentSpecs(gameVersion?: string): ComponentSpec[] {
  if (!gameVersion) return [...COMPONENT_SPECS];
  return COMPONENT_SPECS.filter((entry) => entry.gameVersion === gameVersion);
}
