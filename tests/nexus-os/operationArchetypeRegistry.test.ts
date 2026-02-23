import { describe, expect, it } from 'vitest';
import {
  getOperationArchetype,
  getMiningVariantProfile,
  getPvpVariantProfile,
  getSalvageVariantProfile,
  listMiningVariantProfiles,
  listReleaseFilteredArchetypeVariantOptions,
  listPvpVariantProfiles,
  listSalvageVariantProfiles,
  listOperationArchetypes,
  OperationArchetypeRegistry,
  buildRedactedOpponentProjection,
} from '../../src/components/nexus-os/registries/operationArchetypeRegistry';

describe('operationArchetypeRegistry', () => {
  it('exposes concrete mining and pvp archetypes with seed bundles', () => {
    const archetypes = listOperationArchetypes();
    expect(archetypes.some((entry) => entry.id === 'INDUSTRIAL_MINING')).toBe(true);
    expect(archetypes.some((entry) => entry.id === 'INDUSTRIAL_SALVAGE')).toBe(true);
    expect(archetypes.some((entry) => entry.id === 'PVP_ORG_V_ORG')).toBe(true);

    const mining = getOperationArchetype('INDUSTRIAL_MINING');
    const salvage = getOperationArchetype('INDUSTRIAL_SALVAGE');
    const pvp = getOperationArchetype('PVP_ORG_V_ORG');

    expect(mining.seedBundle.phases.length).toBeGreaterThanOrEqual(5);
    expect(mining.seedBundle.requirementRules.length).toBeGreaterThan(0);
    expect(mining.variantOptions).toEqual(expect.arrayContaining(['MINING_GEO', 'MINING_ROC_SURFACE', 'MINING_HAND_CAVE', 'MINING_PLANETARY_RING']));
    expect(salvage.seedBundle.phases.length).toBeGreaterThanOrEqual(6);
    expect(salvage.variantOptions).toEqual(expect.arrayContaining(['SALVAGE_HULL_STRIP', 'SALVAGE_COMPONENT_RECOVERY']));
    expect(pvp.seedBundle.phases.length).toBeGreaterThanOrEqual(6);
    expect(pvp.seedBundle.roleMandates.length).toBeGreaterThan(0);
    expect(pvp.seedBundle.readinessGates.some((gate) => gate.label.includes('Counter-Intel'))).toBe(true);
  });

  it('returns custom fallback for unknown ids', () => {
    const fallback = getOperationArchetype('UNKNOWN');
    expect(fallback.id).toBe('CUSTOM');
  });

  it('creates redacted pvp projection from opponent hints', () => {
    const projection = buildRedactedOpponentProjection({
      orgName: 'Rival Org',
      estimatedStrength: 'high strike wing',
    });
    expect(projection.redactedOpponentLabel).toContain('redacted');
    expect(projection.redactedStrengthBand).toBe('HIGH');
  });

  it('keeps registry keys stable for known archetypes', () => {
    expect(Object.keys(OperationArchetypeRegistry)).toEqual(
      expect.arrayContaining(['INDUSTRIAL_MINING', 'INDUSTRIAL_SALVAGE', 'PVP_ORG_V_ORG', 'CUSTOM'])
    );
  });

  it('provides mining variant profiles with tier/environment defaults', () => {
    const profiles = listMiningVariantProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(5);
    const roc = getMiningVariantProfile('MINING_ROC_SURFACE');
    const hand = getMiningVariantProfile('MINING_HAND_CAVE');
    const ground = getMiningVariantProfile('MINING_GEO');
    expect(roc.tier).toBe('ROC_GEO');
    expect(hand.environment).toBe('CAVE_INTERIOR');
    expect(hand.extractionMethod).toBe('HAND_TOOL');
    expect(ground.label).toMatch(/Ground/i);
  });

  it('provides pvp variant profiles with engagement defaults', () => {
    const profiles = listPvpVariantProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(3);
    const boarding = getPvpVariantProfile('PVP_CQB_BOARDING');
    const convoy = getPvpVariantProfile('CONVOY_ESCORT');
    expect(boarding.engagementProfile).toBe('BOARDING');
    expect(boarding.environment).toBe('INTERIOR');
    expect(convoy.engagementProfile).toBe('CONVOY_ESCORT');
    expect(convoy.environment).toBe('SPACE');
  });

  it('provides salvage variant profiles with mode/environment defaults', () => {
    const profiles = listSalvageVariantProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(4);
    const hull = getSalvageVariantProfile('SALVAGE_HULL_STRIP');
    const hotZone = getSalvageVariantProfile('SALVAGE_RECOVERY_HOT_ZONE');
    expect(hull.mode).toBe('HULL_STRIP');
    expect(hull.environment).toBe('SPACE_DERELICT');
    expect(hotZone.mode).toBe('CONTESTED_RECOVERY');
    expect(hotZone.environment).toBe('CONTESTED_ZONE');
  });

  it('provides release-filtered variant options with lock reasons', () => {
    const live = listReleaseFilteredArchetypeVariantOptions('INDUSTRIAL_SALVAGE', 'LIVE_4_6', {
      includeLocked: true,
      sc47PreviewEnabled: true,
      experimentalEnabled: false,
    });
    const previewExperimental = listReleaseFilteredArchetypeVariantOptions('INDUSTRIAL_SALVAGE', 'PREVIEW_4_7', {
      includeLocked: true,
      sc47PreviewEnabled: true,
      experimentalEnabled: true,
    });
    const surfaceLive = live.find((entry) => entry.id === 'SALVAGE_SURFACE_WRECK_RECOVERY');
    const surfacePreview = previewExperimental.find((entry) => entry.id === 'SALVAGE_SURFACE_WRECK_RECOVERY');
    expect(surfaceLive?.available).toBe(false);
    expect(surfaceLive?.reason).toBeTruthy();
    expect(surfacePreview?.available).toBe(true);
  });
});
