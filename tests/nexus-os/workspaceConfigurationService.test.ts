import { describe, expect, it } from 'vitest';
import {
  deriveWorkspacePreferenceFromOnboarding,
  recommendWorkspaceActivityPacks,
} from '../../src/nexus-os/services/workspaceConfigurationService';

describe('workspaceConfigurationService', () => {
  it('derives normalized activity tags and role hints from onboarding selections', () => {
    const preference = deriveWorkspacePreferenceFromOnboarding(['salvaging', 'mining']);
    expect(preference.activityTags).toContain('salvage');
    expect(preference.activityTags).toContain('mining');
    expect(preference.preferredRoles).toContain('salvager');
    expect(preference.preferredRoles).toContain('miner');
  });

  it('recommends themed packs for matching activity tags', () => {
    const recommended = recommendWorkspaceActivityPacks({
      activityTags: ['salvage', 'recovery'],
      availablePanelIds: [
        'panel-tactical-map',
        'panel-loop-feed',
        'panel-mobile-companion',
        'panel-comms-peek',
        'panel-command-focus',
      ],
    });
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended[0].id).toBe('pack-salvage-loop');
    expect(recommended[0].panelIds).toContain('panel-loop-feed');
  });

  it('falls back to general or generated starter deck when tags do not match', () => {
    const recommended = recommendWorkspaceActivityPacks({
      activityTags: ['unknown-loop'],
      availablePanelIds: ['panel-command-focus', 'panel-tactical-map', 'panel-comms-peek'],
    });
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended[0].panelIds.length).toBeGreaterThan(0);
  });
});

