/**
 * Reference Data Schemas
 *
 * Doctrine:
 * - These are patch-stamped baseline specs, not live guarantees.
 * - Every record carries provenance (source, gameVersion, importedAt).
 * - Consumers must treat missing values as unknown, not zero.
 */

export interface ReferenceProvenance {
  gameVersion: string;
  source: string;
  importedAt: string;
}

export interface ShipHardpointsSummary {
  weaponMounts?: number;
  missileRacks?: number;
  turretMounts?: number;
  utilityMounts?: number;
  notes?: string;
}

export interface ShipSpec extends ReferenceProvenance {
  id: string;
  name: string;
  manufacturer: string;
  shipClass: string;
  roleTags: string[];
  hardpointsSummary: ShipHardpointsSummary;
  crewSeats: number;
  cargoClass?: string;
  capabilities: string[];
}

export type ComponentType =
  | 'weapon'
  | 'qt_drive'
  | 'shield'
  | 'power_plant'
  | 'cooler'
  | 'missile'
  | 'utility'
  | 'other';

export interface ComponentSpec extends ReferenceProvenance {
  id: string;
  name: string;
  type: ComponentType;
  sizeClass: string;
  baselineStats: Record<string, unknown>;
  compatibleShipClasses?: string[];
}

/**
 * Weapon baseline data.
 * Baselines are comparative only and may drift by patch and context.
 */
export interface WeaponSpec extends ComponentSpec {
  type: 'weapon';
  baselineDPS?: number;
  effectiveRange?: number;
  notes?: string;
}

export interface QTDriveSpec extends ComponentSpec {
  type: 'qt_drive';
  size: string;
  rangeClass: 'SHORT' | 'MEDIUM' | 'LONG' | 'EXTENDED';
  spoolProfileTag?: string;
  efficiencyTag?: string;
}

export interface ReferenceQueryWarning {
  code: 'VERSION_FALLBACK' | 'MISSING_DATA';
  message: string;
}

export interface VersionedReferenceResult<T> {
  data: T | null;
  warnings: ReferenceQueryWarning[];
}

