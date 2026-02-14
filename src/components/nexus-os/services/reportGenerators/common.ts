import type {
  EvidenceBlock,
  ReportDataSource,
  ReportRef,
  ReportSection,
} from '../../schemas/reportSchemas';
import { nowIso } from '../reportFormatting';

export function createSection(
  id: string,
  heading: string,
  body: string,
  orderIndex: number,
  linkedRefs: ReportRef[] = []
): ReportSection {
  return {
    id,
    heading,
    body,
    orderIndex,
    linkedRefs,
  };
}

export function createEvidence(
  id: string,
  input: Omit<EvidenceBlock, 'id'>
): EvidenceBlock {
  return {
    id,
    ...input,
  };
}

export function dedupeWarnings(warnings: string[]): string[] {
  return [...new Set((warnings || []).map((entry) => String(entry || '').trim()).filter(Boolean))];
}

export function dedupeRefs(refs: ReportRef[]): ReportRef[] {
  const seen = new Set<string>();
  const output: ReportRef[] = [];
  for (const ref of refs || []) {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(ref);
  }
  return output;
}

export function dedupeDataSources(sources: ReportDataSource[]): ReportDataSource[] {
  const seen = new Set<string>();
  const output: ReportDataSource[] = [];
  for (const source of sources || []) {
    const key = `${source.source}:${source.importedAt || ''}:${source.note || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(source);
  }
  return output;
}

export function formatIso(value?: string): string {
  if (!value) return 'unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'unknown';
  return nowIso(parsed.getTime());
}

