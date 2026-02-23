import { describe, expect, it } from 'vitest';
import { listReleaseFilteredArchetypeVariantOptions } from '../../src/components/nexus-os/registries/operationArchetypeRegistry';
import { getVariantDisplayBadge } from '../../src/components/nexus-os/registries/starCitizenReleaseRegistry';

describe('operation release UI policy', () => {
  it('provides lock reasons for wizard variant controls', () => {
    const options = listReleaseFilteredArchetypeVariantOptions('INDUSTRIAL_SALVAGE', 'LIVE_4_6', {
      includeLocked: true,
      sc47PreviewEnabled: true,
      experimentalEnabled: false,
    });
    const locked = options.find((entry) => entry.id === 'SALVAGE_SURFACE_WRECK_RECOVERY');
    expect(locked).toBeTruthy();
    expect(locked?.available).toBe(false);
    expect(locked?.reason).toBeTruthy();
  });

  it('derives focus badges for tentative and legacy variants', () => {
    const tentative = getVariantDisplayBadge('PVP_CQB_RAID');
    const legacy = getVariantDisplayBadge('LEGACY_VARIANT_09');
    expect(tentative.id).toBe('TENTATIVE_4_7');
    expect(tentative.label).toBe('4.7 TENTATIVE');
    expect(legacy.id).toBe('LEGACY_UNMAPPED');
  });
});
