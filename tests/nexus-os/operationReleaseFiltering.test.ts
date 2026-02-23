import { describe, expect, it } from 'vitest';
import { listReleaseFilteredArchetypeVariantOptions } from '../../src/components/nexus-os/registries/operationArchetypeRegistry';

describe('operation release filtering', () => {
  it('keeps speculative salvage variant locked in live 4.6 track', () => {
    const options = listReleaseFilteredArchetypeVariantOptions('INDUSTRIAL_SALVAGE', 'LIVE_4_6', {
      includeLocked: true,
      sc47PreviewEnabled: true,
      experimentalEnabled: false,
    });
    const speculative = options.find((entry) => entry.id === 'SALVAGE_SURFACE_WRECK_RECOVERY');
    expect(speculative).toBeTruthy();
    expect(speculative?.available).toBe(false);
    expect(speculative?.reason).toMatch(/release track|experimental/i);
  });

  it('allows speculative salvage variant only when preview+experimental are both enabled', () => {
    const previewNoExperimental = listReleaseFilteredArchetypeVariantOptions('INDUSTRIAL_SALVAGE', 'PREVIEW_4_7', {
      includeLocked: true,
      sc47PreviewEnabled: true,
      experimentalEnabled: false,
    });
    const previewExperimental = listReleaseFilteredArchetypeVariantOptions('INDUSTRIAL_SALVAGE', 'PREVIEW_4_7', {
      includeLocked: true,
      sc47PreviewEnabled: true,
      experimentalEnabled: true,
    });
    expect(previewNoExperimental.find((entry) => entry.id === 'SALVAGE_SURFACE_WRECK_RECOVERY')?.available).toBe(false);
    expect(previewExperimental.find((entry) => entry.id === 'SALVAGE_SURFACE_WRECK_RECOVERY')?.available).toBe(true);
  });

  it('hides preview variants when sc47 preview flag is disabled', () => {
    const options = listReleaseFilteredArchetypeVariantOptions('PVP_ORG_V_ORG', 'PREVIEW_4_7', {
      includeLocked: true,
      sc47PreviewEnabled: false,
      experimentalEnabled: false,
    });
    const raid = options.find((entry) => entry.id === 'PVP_CQB_RAID');
    expect(raid?.available).toBe(false);
    expect(raid?.reason).toMatch(/preview content is disabled/i);
  });
});
