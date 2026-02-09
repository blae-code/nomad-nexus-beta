/**
 * Report Template Registry
 *
 * Compact, versioned templates for report generation. Templates are pack-friendly
 * and additive; keep IDs stable for audit reproducibility.
 */

import type { ReportKind, ReportTemplate } from '../schemas/reportSchemas';

export type ReportTemplateId =
  | 'REPORT_OP_BRIEF_V1'
  | 'REPORT_AAR_V1'
  | 'REPORT_SITREP_V1'
  | 'REPORT_INTEL_BRIEF_V1'
  | 'REPORT_INDUSTRIAL_RUN_V1'
  | 'REPORT_FORCE_POSTURE_V1';

export const ReportTemplateRegistry: Readonly<Record<ReportTemplateId, ReportTemplate>> = {
  REPORT_OP_BRIEF_V1: {
    id: 'REPORT_OP_BRIEF_V1',
    kind: 'OP_BRIEF',
    version: '1.0.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    sectionBlueprint: [
      { id: 'mission-context', heading: 'Mission Context', requiredInputs: ['operation'] },
      { id: 'plan-shape', heading: 'Plan Shape', requiredInputs: ['objectives', 'phases', 'tasks'] },
      { id: 'force-readiness', heading: 'Force Readiness', requiredInputs: ['roster', 'rsvp'] },
      { id: 'risk-assumptions', heading: 'Risk and Assumptions', requiredInputs: ['assumptions'] },
      { id: 'rescue-priorities', heading: 'Rescue Priorities', requiredInputs: ['events'] },
    ],
  },
  REPORT_AAR_V1: {
    id: 'REPORT_AAR_V1',
    kind: 'AAR',
    version: '1.0.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    sectionBlueprint: [
      { id: 'outcome-summary', heading: 'Outcome Summary', requiredInputs: ['operation', 'events'] },
      { id: 'decision-trace', heading: 'Decision Trace', requiredInputs: ['decisions', 'thread'] },
      { id: 'intel-delta', heading: 'Intel Delta', requiredInputs: ['intel'] },
      { id: 'deviations-lessons', heading: 'Deviations and Lessons', requiredInputs: ['assumptions', 'tasks'] },
      { id: 'rescue-preservation', heading: 'Rescue and Preservation of Life', requiredInputs: ['events'] },
      { id: 'force-posture', heading: 'Force Posture Snapshot', requiredInputs: ['roster', 'force_analysis'] },
    ],
  },
  REPORT_SITREP_V1: {
    id: 'REPORT_SITREP_V1',
    kind: 'SITREP',
    version: '0.1.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    sectionBlueprint: [{ id: 'status-snapshot', heading: 'Status Snapshot', requiredInputs: ['operation'] }],
  },
  REPORT_INTEL_BRIEF_V1: {
    id: 'REPORT_INTEL_BRIEF_V1',
    kind: 'INTEL_BRIEF',
    version: '0.1.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    sectionBlueprint: [{ id: 'intel-scope', heading: 'Intel Scope', requiredInputs: ['intel'] }],
  },
  REPORT_INDUSTRIAL_RUN_V1: {
    id: 'REPORT_INDUSTRIAL_RUN_V1',
    kind: 'INDUSTRIAL_RUN',
    version: '0.1.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    sectionBlueprint: [{ id: 'industrial-lanes', heading: 'Industrial Lanes', requiredInputs: ['market'] }],
  },
  REPORT_FORCE_POSTURE_V1: {
    id: 'REPORT_FORCE_POSTURE_V1',
    kind: 'FORCE_POSTURE',
    version: '0.1.0',
    compatibleGameVersions: ['4.0.x', '4.1.x'],
    sectionBlueprint: [{ id: 'coverage-posture', heading: 'Coverage Posture', requiredInputs: ['force_analysis'] }],
  },
};

const TEMPLATE_ID_BY_KIND: Readonly<Record<ReportKind, ReportTemplateId>> = {
  OP_BRIEF: 'REPORT_OP_BRIEF_V1',
  AAR: 'REPORT_AAR_V1',
  SITREP: 'REPORT_SITREP_V1',
  INTEL_BRIEF: 'REPORT_INTEL_BRIEF_V1',
  INDUSTRIAL_RUN: 'REPORT_INDUSTRIAL_RUN_V1',
  FORCE_POSTURE: 'REPORT_FORCE_POSTURE_V1',
};

export function getReportTemplate(templateId: string): ReportTemplate | null {
  return ReportTemplateRegistry[templateId as ReportTemplateId] || null;
}

export function getDefaultReportTemplateIdForKind(kind: ReportKind): ReportTemplateId {
  return TEMPLATE_ID_BY_KIND[kind];
}

export function listReportTemplatesByKind(kind?: ReportKind): ReportTemplate[] {
  const all = Object.values(ReportTemplateRegistry);
  if (!kind) return all;
  return all.filter((template) => template.kind === kind);
}
