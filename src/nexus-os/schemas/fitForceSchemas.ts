/**
 * Fitting and Force Design Schemas
 *
 * Doctrine:
 * - Capability-first modeling under uncertainty.
 * - Patch/version stamped context is required for all fit assumptions.
 * - Unknown values are valid and must be preserved as unknown.
 */

export type FitScope = 'INDIVIDUAL' | 'SQUAD' | 'WING' | 'FLEET';
export type SourceRefKind = 'REFERENCE' | 'USER' | 'EXTERNAL_LINK';
export type ConstraintSeverity = 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
export type LikelihoodBand = 'LOW' | 'MED' | 'HIGH';
export type ImpactBand = 'LOW' | 'MED' | 'HIGH';

export interface FitSourceRef {
  kind: SourceRefKind;
  ref: string;
}

export interface FitAssumption {
  id: string;
  statement: string;
  confidence: number;
  ttlProfileId: string;
  createdAt: string;
}

export interface FitConstraint {
  id: string;
  statement: string;
  severity: ConstraintSeverity;
}

export interface FitDependency {
  id: string;
  dependsOn: string;
  reason: string;
}

export interface FitRisk {
  id: string;
  statement: string;
  likelihoodBand: LikelihoodBand;
  impactBand: ImpactBand;
}

export interface FitValidationState {
  patchMismatchWarnings: string[];
  unknowns: string[];
}

export interface FitChangeHistoryEntry {
  at: string;
  by: string;
  summary: string;
}

export interface FitComponentSelection {
  componentSpecId?: string;
  componentNameSnapshot?: string;
  slotTag: string;
  notes?: string;
}

/**
 * Individual platform selections (scope=INDIVIDUAL primary lane).
 */
export interface FitPlatform {
  id: string;
  shipSpecId?: string;
  shipNameSnapshot?: string;
  components?: FitComponentSelection[];
}

/**
 * Group-level force composition element.
 */
export interface FitElement {
  id: string;
  label: string;
  countPlanned: number;
  shipSpecId?: string;
  shipClassTag?: string;
  roleTags: string[];
  capabilityTags: string[];
  notes?: string;
}

export interface FitProfile {
  id: string;
  scope: FitScope;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  gameVersion: string;
  sourceRefs: FitSourceRef[];
  platforms: FitPlatform[];
  elements: FitElement[];
  roleTags: string[];
  capabilityTags: string[];
  assumptions: FitAssumption[];
  constraints: FitConstraint[];
  dependencies: FitDependency[];
  risks: FitRisk[];
  validation: FitValidationState;
  changeHistory: FitChangeHistoryEntry[];
}

export type CoverageCellStatus = 'covered' | 'thin' | 'absent' | 'redundant';

export interface CoverageColumn {
  id: string;
  label: string;
}

export interface CoverageCell {
  columnId: string;
  status: CoverageCellStatus;
}

export interface CoverageRow {
  id: string;
  label: string;
  kind: 'ROLE' | 'CAPABILITY';
  requiredCount: number;
  matchedCount: number;
  overallStatus: CoverageCellStatus;
  cells: CoverageCell[];
}

export interface CoverageMatrix {
  columns: CoverageColumn[];
  rows: CoverageRow[];
}

export interface DependencyGraphNode {
  id: string;
  label: string;
  kind: 'ELEMENT' | 'CAPABILITY';
}

export interface DependencyGraphEdge {
  id: string;
  from: string;
  to: string;
  reason: string;
}

export interface ForceGap {
  kind: 'ROLE' | 'CAPABILITY' | 'DEPENDENCY' | 'SUSTAINMENT';
  severity: 'LOW' | 'MED' | 'HIGH';
  message: string;
  suggestedActions?: string[];
}

export interface SustainmentHint {
  label: string;
  band: 'LOW' | 'MED' | 'HIGH';
  note: string;
}

export interface ForceAnalysis {
  opId?: string;
  fitProfileId?: string;
  generatedAt: string;
  coverageMatrix: CoverageMatrix;
  dependencyGraph: {
    nodes: DependencyGraphNode[];
    edges: DependencyGraphEdge[];
  };
  sustainmentHints: SustainmentHint[];
  gaps: ForceGap[];
  confidenceSummary: {
    band: 'LOW' | 'MED' | 'HIGH';
    note: string;
  };
}

