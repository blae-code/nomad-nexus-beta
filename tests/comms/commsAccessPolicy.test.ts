import { describe, expect, it } from 'vitest';
import {
  canAccessCommsChannel,
  canAccessFocusedComms,
} from '../../src/components/utils/commsAccessPolicy.jsx';

describe('commsAccessPolicy', () => {
  it('allows focused temporary channels but blocks restricted focused channels for non-members', () => {
    const guest = { id: 'guest-1', membership: 'GUEST', rank: 'VAGRANT', roles: [] };

    expect(canAccessFocusedComms(guest, { type: 'FOCUSED', isTemporary: true })).toBe(true);
    expect(canAccessFocusedComms(guest, { type: 'FOCUSED', isTemporary: false })).toBe(false);
  });

  it('enforces DM participant scope unless admin bypass is present', () => {
    const outsider = { id: 'outsider-1', membership: 'MEMBER', rank: 'SCOUT', roles: [] };
    const admin = { id: 'admin-1', membership: 'GUEST', rank: 'VAGRANT', roles: ['admin'] };
    const dmChannel = {
      id: 'dm-1',
      is_dm: true,
      dm_participants: ['member-a', 'member-b'],
      category: 'direct',
      type: 'text',
    };

    expect(canAccessCommsChannel(outsider, dmChannel)).toBe(false);
    expect(canAccessCommsChannel(admin, dmChannel)).toBe(true);
  });
});
