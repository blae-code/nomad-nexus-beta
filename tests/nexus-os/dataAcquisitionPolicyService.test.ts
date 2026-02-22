import { describe, expect, it } from 'vitest';
import {
  assertPolicyCompliance,
  buildCaptureMetadata,
  isSourceAllowed,
  requiresConfirmation,
  toCaptureMetadataRecord,
} from '../../src/components/nexus-os/services/dataAcquisitionPolicyService';

describe('dataAcquisitionPolicyService', () => {
  it('allows only manual/radial/operator sources in MANUAL_ONLY mode', () => {
    expect(isSourceAllowed('MANUAL_ONLY', 'OPERATOR_FORM')).toBe(true);
    expect(isSourceAllowed('MANUAL_ONLY', 'RADIAL_ACTION')).toBe(true);
    expect(isSourceAllowed('MANUAL_ONLY', 'MANUAL_TRANSCRIPT')).toBe(true);
    expect(isSourceAllowed('MANUAL_ONLY', 'VOICE_PTT_CONFIRMED')).toBe(false);
  });

  it('requires confirmation for VOICE_PTT_CONFIRMED in PTT_CONFIRMED mode', () => {
    expect(isSourceAllowed('PTT_CONFIRMED', 'VOICE_PTT_CONFIRMED')).toBe(true);
    expect(requiresConfirmation('PTT_CONFIRMED', 'VOICE_PTT_CONFIRMED')).toBe(true);
    expect(() =>
      assertPolicyCompliance('PTT_CONFIRMED', 'VOICE_PTT_CONFIRMED', { confirmed: false, commandSource: 'voice' })
    ).toThrowError(/requires explicit confirmation/i);
    expect(() =>
      assertPolicyCompliance('PTT_CONFIRMED', 'VOICE_PTT_CONFIRMED', { confirmed: true, commandSource: 'voice' })
    ).not.toThrow();
  });

  it('builds deterministic metadata and snake_case record form', () => {
    const metadata = buildCaptureMetadata({
      mode: 'MANUAL_ONLY',
      source: 'RADIAL_ACTION',
      commandSource: 'radial',
      confirmed: true,
      nowIso: '2026-02-22T10:00:00.000Z',
    });
    expect(metadata).toMatchObject({
      captureMode: 'MANUAL_ONLY',
      evidenceSource: 'RADIAL_ACTION',
      commandSource: 'radial',
      confirmed: true,
      confirmedAt: '2026-02-22T10:00:00.000Z',
    });
    expect(toCaptureMetadataRecord(metadata)).toMatchObject({
      capture_mode: 'MANUAL_ONLY',
      evidence_source: 'RADIAL_ACTION',
      command_source: 'radial',
      confirmed: true,
      confirmed_at: '2026-02-22T10:00:00.000Z',
    });
  });
});
