import { describe, expect, it } from 'vitest';
import { isAdminUser, isSystemAdminUser } from '../../src/utils/index';

describe('admin identity checks', () => {
  it('treats explicit system admin email as admin', () => {
    const user = {
      role: 'user',
      email: 'blae@katrasoluta.com',
      member_profile_data: {
        rank: 'SCOUT',
        roles: [],
      },
    };
    expect(isSystemAdminUser(user)).toBe(true);
    expect(isAdminUser(user)).toBe(true);
  });

  it('keeps regular members non-admin without elevated role/rank', () => {
    const user = {
      role: 'user',
      email: 'member@example.com',
      member_profile_data: {
        rank: 'SCOUT',
        roles: ['pilot'],
      },
    };
    expect(isSystemAdminUser(user)).toBe(false);
    expect(isAdminUser(user)).toBe(false);
  });

  it('treats pioneer rank as admin capability', () => {
    const user = {
      role: 'user',
      email: 'pioneer@example.com',
      member_profile_data: {
        rank: 'PIONEER',
        roles: ['pilot'],
      },
    };
    expect(isSystemAdminUser(user)).toBe(false);
    expect(isAdminUser(user)).toBe(true);
  });
});
