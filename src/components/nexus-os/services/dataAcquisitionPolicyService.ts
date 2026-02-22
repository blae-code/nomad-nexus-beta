export type AcquisitionMode = 'MANUAL_ONLY' | 'PTT_CONFIRMED';
export type EvidenceSource = 'OPERATOR_FORM' | 'RADIAL_ACTION' | 'MANUAL_TRANSCRIPT' | 'VOICE_PTT_CONFIRMED';

export interface CaptureMetadata {
  captureMode: AcquisitionMode;
  evidenceSource: EvidenceSource;
  commandSource: string;
  confirmed: boolean;
  confirmedAt: string | null;
  policyVersion: string;
}

export interface PolicyContext {
  confirmed?: boolean;
  actorId?: string;
  commandSource?: string;
}

export type DataAcquisitionPolicyErrorCode = 'ACQ_SOURCE_BLOCKED' | 'ACQ_CONFIRMATION_REQUIRED';

export interface DataAcquisitionPolicyError extends Error {
  code: DataAcquisitionPolicyErrorCode;
  mode: AcquisitionMode;
  source: EvidenceSource;
}

export const ACQUISITION_POLICY_VERSION = 'nexus-acquisition-v1';
export const DEFAULT_ACQUISITION_MODE: AcquisitionMode = 'MANUAL_ONLY';

export function isSourceAllowed(mode: AcquisitionMode, source: EvidenceSource): boolean {
  if (mode === 'MANUAL_ONLY') {
    return source === 'OPERATOR_FORM' || source === 'RADIAL_ACTION' || source === 'MANUAL_TRANSCRIPT';
  }
  if (mode === 'PTT_CONFIRMED') {
    return (
      source === 'OPERATOR_FORM' ||
      source === 'RADIAL_ACTION' ||
      source === 'MANUAL_TRANSCRIPT' ||
      source === 'VOICE_PTT_CONFIRMED'
    );
  }
  return false;
}

export function requiresConfirmation(mode: AcquisitionMode, source: EvidenceSource): boolean {
  return mode === 'PTT_CONFIRMED' && source === 'VOICE_PTT_CONFIRMED';
}

function createPolicyError(
  code: DataAcquisitionPolicyErrorCode,
  mode: AcquisitionMode,
  source: EvidenceSource,
  message: string
): DataAcquisitionPolicyError {
  const error = new Error(message) as DataAcquisitionPolicyError;
  error.code = code;
  error.mode = mode;
  error.source = source;
  return error;
}

export function assertPolicyCompliance(mode: AcquisitionMode, source: EvidenceSource, context: PolicyContext = {}): void {
  if (!isSourceAllowed(mode, source)) {
    throw createPolicyError(
      'ACQ_SOURCE_BLOCKED',
      mode,
      source,
      `Evidence source ${source} is blocked under acquisition mode ${mode}.`
    );
  }
  if (requiresConfirmation(mode, source) && !context.confirmed) {
    throw createPolicyError(
      'ACQ_CONFIRMATION_REQUIRED',
      mode,
      source,
      `Evidence source ${source} requires explicit confirmation under acquisition mode ${mode}.`
    );
  }
}

export function buildCaptureMetadata(input: {
  mode?: AcquisitionMode;
  source: EvidenceSource;
  commandSource?: string;
  confirmed?: boolean;
  confirmedAt?: string | null;
  nowIso?: string;
}): CaptureMetadata {
  const mode = input.mode || DEFAULT_ACQUISITION_MODE;
  const commandSource = String(input.commandSource || '').trim() || 'operator';
  const confirmed = Boolean(input.confirmed);
  const nowIso = String(input.nowIso || new Date().toISOString());

  assertPolicyCompliance(mode, input.source, { confirmed, commandSource });

  return {
    captureMode: mode,
    evidenceSource: input.source,
    commandSource,
    confirmed,
    confirmedAt: confirmed ? String(input.confirmedAt || nowIso) : null,
    policyVersion: ACQUISITION_POLICY_VERSION,
  };
}

export function toCaptureMetadataRecord(metadata: CaptureMetadata): Record<string, unknown> {
  return {
    capture_mode: metadata.captureMode,
    evidence_source: metadata.evidenceSource,
    command_source: metadata.commandSource,
    confirmed: metadata.confirmed,
    confirmed_at: metadata.confirmedAt,
    policy_version: metadata.policyVersion,
  };
}
