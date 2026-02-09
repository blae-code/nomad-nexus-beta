import type { ReportKind } from '../../schemas/reportSchemas';
import type { ReportGenerator } from './types';
import { generateAAR } from './generateAAR';
import { generateForcePosture } from './generateForcePosture';
import { generateIndustrialRun } from './generateIndustrialRun';
import { generateIntelBrief } from './generateIntelBrief';
import { generateOpBrief } from './generateOpBrief';
import { generateSITREP } from './generateSITREP';

export const REPORT_GENERATORS: Readonly<Record<ReportKind, ReportGenerator>> = {
  OP_BRIEF: generateOpBrief,
  AAR: generateAAR,
  SITREP: generateSITREP,
  INTEL_BRIEF: generateIntelBrief,
  INDUSTRIAL_RUN: generateIndustrialRun,
  FORCE_POSTURE: generateForcePosture,
};

export * from './types';
export * from './generateOpBrief';
export * from './generateAAR';
export * from './generateSITREP';
export * from './generateIntelBrief';
export * from './generateIndustrialRun';
export * from './generateForcePosture';

