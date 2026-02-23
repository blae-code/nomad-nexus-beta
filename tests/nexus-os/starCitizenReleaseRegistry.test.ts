import { describe, expect, it } from 'vitest';
import {
  getMethodAvailability,
  getMethodDisplayBadge,
  getVariantAvailability,
  getVariantDisplayBadge,
  getVariantReleaseMeta,
  isVariantAvailableForTrack,
} from '../../src/components/nexus-os/registries/starCitizenReleaseRegistry';

describe('starCitizenReleaseRegistry', () => {
  it('exposes variant metadata with source attribution', () => {
    const meta = getVariantReleaseMeta('MINING_GEO');
    expect(meta.legacyUnmapped).toBe(false);
    expect(meta.minTrack).toBe('LIVE_4_6');
    expect(meta.sourceRefs.length).toBeGreaterThan(0);
    expect(meta.lastReviewedAt).toBe('2026-02-23');
  });

  it('marks speculative salvage drone support as experimental by default', () => {
    const badge = getMethodDisplayBadge('SALVAGE', 'SALVAGE_DRONE');
    const availability = getMethodAvailability('SALVAGE', 'SALVAGE_DRONE', {
      releaseTrack: 'PREVIEW_4_7',
      sc47PreviewEnabled: true,
      experimentalEnabled: false,
    });
    expect(badge.id).toBe('EXPERIMENTAL');
    expect(availability.available).toBe(false);
    expect(availability.reason).toMatch(/experimental/i);
  });

  it('returns legacy-unmapped badges for unknown variants while keeping records usable', () => {
    const availability = getVariantAvailability('LEGACY_VARIANT_01', {
      releaseTrack: 'LIVE_4_6',
      sc47PreviewEnabled: true,
      experimentalEnabled: false,
    });
    const badge = getVariantDisplayBadge('LEGACY_VARIANT_01');
    expect(availability.available).toBe(true);
    expect(availability.legacyUnmapped).toBe(true);
    expect(badge.id).toBe('LEGACY_UNMAPPED');
  });

  it('gates 4.7 preview variants by track and preview flag', () => {
    expect(
      isVariantAvailableForTrack('PVP_CQB_RAID', 'LIVE_4_6', {
        sc47PreviewEnabled: true,
        experimentalEnabled: false,
      })
    ).toBe(false);
    expect(
      isVariantAvailableForTrack('PVP_CQB_RAID', 'PREVIEW_4_7', {
        sc47PreviewEnabled: false,
        experimentalEnabled: false,
      })
    ).toBe(false);
    expect(
      isVariantAvailableForTrack('PVP_CQB_RAID', 'PREVIEW_4_7', {
        sc47PreviewEnabled: true,
        experimentalEnabled: false,
      })
    ).toBe(true);
  });
});
