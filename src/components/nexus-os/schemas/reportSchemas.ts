/**
 * Reporting and Dispatch Schemas
 *
 * Doctrine:
 * - Reports never invent truth; uncertainty is explicit.
 * - Evidence blocks must carry citations and provenance metadata.
 * - Report artifacts are reproducible snapshots with generated timestamps.
 */

export type ReportKind =
  | 'OP_BRIEF'
  | 'SITREP'
  | 'AAR'
  | 'INTEL_BRIEF'
  | 'INDUSTRIAL_RUN'
  | 'FORCE_POSTURE';

export type ReportScopeKind = 'ORG' | 'OP' | 'PERSONAL';
export type ReportConfidenceBand = 'LOW' | 'MED' | 'HIGH';
export type ReportTTLState = 'FRESH' | 'STALE' | 'EXPIRED' | 'N_A';

export interface ReportScope {
  kind: ReportScopeKind;
  opId?: string;
}

export interface ReportRef {
  kind: string;
  id: string;
}

export interface ReportDataSource {
  source: string;
  importedAt?: string;
  note?: string;
}

export interface ReportSection {
  id: string;
  heading: string;
  body: string;
  orderIndex: number;
  linkedRefs?: ReportRef[];
}

export type CitationKind =
  | 'OP_EVENT'
  | 'INTEL'
  | 'RSVP'
  | 'PLANNING'
  | 'CONTROL_ZONE'
  | 'REFERENCE_SPEC'
  | 'MARKET_OBS'
  | 'FIT_PROFILE';

export interface Citation {
  kind: CitationKind;
  refId: string;
  occurredAt?: string;
  importedAt?: string;
  reportedAt?: string;
  source?: string;
  gameVersion?: string;
}

export interface EvidenceBlock {
  id: string;
  claim: string;
  citations: Citation[];
  confidenceBand: ReportConfidenceBand;
  ttlState?: ReportTTLState;
  notes?: string;
}

export interface ReportInputs {
  refs: ReportRef[];
  snapshotRefs?: ReportRef[];
  gameVersionContext?: string;
  dataSources: ReportDataSource[];
}

export interface ReportPermissions {
  viewScope: ReportScopeKind;
  editableBy?: string[];
}

export interface ReportArtifact {
  id: string;
  kind: ReportKind;
  scope: ReportScope;
  title: string;
  generatedAt: string;
  generatedBy: string;
  templateId: string;
  narrative: ReportSection[];
  evidence: EvidenceBlock[];
  inputs: ReportInputs;
  warnings: string[];
  permissions: ReportPermissions;
}

export interface ReportSectionBlueprint {
  id: string;
  heading: string;
  requiredInputs: string[];
}

export interface ReportTemplate {
  id: string;
  kind: ReportKind;
  version: string;
  compatibleGameVersions: string[];
  sectionBlueprint: ReportSectionBlueprint[];
}
