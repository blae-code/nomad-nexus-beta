import type {
  Citation,
  ReportConfidenceBand,
  ReportTTLState,
} from '../schemas/reportSchemas';

export function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

export function confidenceBandFromScore(score: number): ReportConfidenceBand {
  if (score >= 0.72) return 'HIGH';
  if (score >= 0.45) return 'MED';
  return 'LOW';
}

export function ttlStateFromRemainingSeconds(remainingSeconds?: number | null): ReportTTLState {
  if (typeof remainingSeconds !== 'number' || Number.isNaN(remainingSeconds)) return 'N_A';
  if (remainingSeconds <= 0) return 'EXPIRED';
  if (remainingSeconds <= 90) return 'STALE';
  return 'FRESH';
}

export function formatTtlStateLabel(ttlState: ReportTTLState): string {
  if (ttlState === 'FRESH') return 'Fresh';
  if (ttlState === 'STALE') return 'Stale';
  if (ttlState === 'EXPIRED') return 'Expired';
  return 'N/A';
}

export function formatConfidenceLabel(band: ReportConfidenceBand): string {
  if (band === 'HIGH') return 'High confidence';
  if (band === 'MED') return 'Moderate confidence';
  return 'Low confidence';
}

export function citationTimestamp(citation: Citation): string | undefined {
  return citation.occurredAt || citation.reportedAt || citation.importedAt;
}

export function formatCitationProvenance(citation: Citation): string {
  const pieces: string[] = [];
  if (citation.source) pieces.push(citation.source);
  if (citation.gameVersion) pieces.push(`v${citation.gameVersion}`);
  const timestamp = citationTimestamp(citation);
  if (timestamp) pieces.push(new Date(timestamp).toISOString());
  return pieces.join(' | ') || 'No provenance metadata';
}

