import { afterEach, describe, expect, it } from 'vitest';
import {
  isCqbEventActive,
  partitionCqbEventsByTTL,
} from '../../src/nexus-os/services/cqbTTLService';
import {
  createCommandIntent,
  registerCommandAuthorityPolicyValidator,
  resetCommandAuthorityPolicyValidators,
  validateCommandIntent,
} from '../../src/nexus-os/services/commandIntentService';
import {
  determineChannelContext,
  setChannelAccessResolver,
} from '../../src/nexus-os/services/channelContextService';

afterEach(() => {
  resetCommandAuthorityPolicyValidators();
  setChannelAccessResolver(null);
});

describe('cqbTTLService policy hooks', () => {
  it('applies per-event TTL override policies', () => {
    const nowMs = Date.parse('2026-02-11T16:00:00.000Z');
    const recentEvent = {
      id: 'evt-a',
      createdAt: '2026-02-11T15:59:50.000Z',
      ttlSeconds: 120,
    };
    const oldEvent = {
      id: 'evt-b',
      createdAt: '2026-02-11T15:50:00.000Z',
      ttlSeconds: 120,
    };

    const partition = partitionCqbEventsByTTL([recentEvent, oldEvent], nowMs, ({ event }) =>
      event.id === 'evt-a' ? { forceStale: true } : null
    );

    expect(partition.active).toHaveLength(0);
    expect(partition.stale).toHaveLength(2);
    expect(isCqbEventActive(recentEvent, nowMs)).toBe(true);
    expect(isCqbEventActive(recentEvent, nowMs, { forceStale: true })).toBe(false);
  });
});

describe('commandIntentService policy hooks', () => {
  it('runs registered authority validators during validation and creation', () => {
    registerCommandAuthorityPolicyValidator('op-role-gate', (context) => {
      if (context.scope !== 'op') return null;
      if (context.roleTags.includes('command_lead')) return null;
      return 'op-scope command intents require command_lead role';
    });

    const invalid = validateCommandIntent(
      {
        issuerId: 'user-alpha',
        scope: 'op',
        intentType: 'REQUEST_EXTRACT',
        authorityLevel: 'COMMAND',
        parameters: {},
        ttlSeconds: 120,
      },
      { roleTags: ['squad_lead'] }
    );
    expect(invalid.some((message) => message.includes('command_lead'))).toBe(true);

    const intent = createCommandIntent(
      {
        issuerId: 'user-alpha',
        scope: 'op',
        intentType: 'REQUEST_EXTRACT',
        authorityLevel: 'COMMAND',
        parameters: {},
        ttlSeconds: 120,
      },
      Date.parse('2026-02-11T16:10:00.000Z'),
      { roleTags: ['command_lead'] }
    );
    expect(intent.scope).toBe('op');
  });
});

describe('channelContextService policy hooks', () => {
  it('applies resolver-filtered channel access', () => {
    const baseline = determineChannelContext({ commsTemplateId: 'FIRETEAM_PRIMARY' });
    expect(baseline.channelIds.length).toBeGreaterThan(0);

    const allowedChannel = baseline.channelIds[0];
    setChannelAccessResolver(() => ({
      allowedChannelIds: [allowedChannel],
      defaultMembership: ['command'],
      authorityExpectations: ['SQUAD', 'COMMAND'],
    }));

    const scoped = determineChannelContext({
      commsTemplateId: 'FIRETEAM_PRIMARY',
      preferredChannelId: baseline.channelIds[baseline.channelIds.length - 1],
    });

    expect(scoped.channelIds).toEqual([allowedChannel]);
    expect(scoped.primaryChannelId).toBe(allowedChannel);
    expect(scoped.defaultMembership).toEqual(['command']);
    expect(scoped.authorityExpectations).toEqual(['SQUAD', 'COMMAND']);
  });
});
