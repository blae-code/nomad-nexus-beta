import type { ReportArtifact, ReportScope } from '../../schemas/reportSchemas';

export interface ReportGenerationParams {
  scope: ReportScope;
  generatedBy: string;
  opId?: string;
  fitProfileId?: string;
  gameVersionContext?: string;
}

export type GeneratedReportPayload = Omit<ReportArtifact, 'id'>;

export type ReportGenerator = (
  params: ReportGenerationParams,
  nowMs?: number
) => GeneratedReportPayload;

