import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Mock user variants for dev/testing
 * Change MOCK_USER_VARIANT to quickly test different membership/rank combos
 */
export const MOCK_USER_VARIANTS = {
  GUEST: {
    id: 'mock-user-001',
    email: 'guest@nomad.nexus',
    full_name: 'New Arrival',
    callsign: 'Guest',
    rank: 'VAGRANT',
    membership: 'GUEST',
    roles: [],
  },
  VAGRANT: {
    id: 'mock-user-002',
    email: 'vagrant@nomad.nexus',
    full_name: 'Trial Pilot',
    callsign: 'Vagrant',
    rank: 'VAGRANT',
    membership: 'VAGRANT',
    roles: [],
  },
  MEMBER: {
    id: 'mock-user-003',
    email: 'member@nomad.nexus',
    full_name: 'Scout Lead',
    callsign: 'Scout',
    rank: 'SCOUT',
    membership: 'MEMBER',
    roles: ['Rangers'],
  },
  AFFILIATE: {
    id: 'mock-user-004',
    email: 'affiliate@nomad.nexus',
    full_name: 'Affiliate Operator',
    callsign: 'Affiliate',
    rank: 'VOYAGER',
    membership: 'AFFILIATE',
    roles: ['Rangers'],
  },
  PARTNER: {
    id: 'mock-user-005',
    email: 'partner@nomad.nexus',
    full_name: 'Partner Commander',
    callsign: 'Partner',
    rank: 'VOYAGER',
    membership: 'PARTNER',
    roles: ['Shamans', 'Rangers'],
  },
};

// DEV: Toggle this to simulate different user types
// Options: 'GUEST', 'VAGRANT', 'MEMBER', 'AFFILIATE', 'PARTNER'
const MOCK_USER_VARIANT = 'MEMBER';

/**
 * Hook to fetch and memoize current authenticated user.
 * Returns structured user with rank, roles, callsign.
 * Falls back to mock data during stub phase.
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        // Map real user to canon structure if needed
        setUser({
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.full_name,
          callsign: currentUser.callsign || currentUser.full_name,
          rank: currentUser.rank || 'VAGRANT',
          membership: currentUser.membership || 'GUEST',
          roles: currentUser.roles || [],
          role: currentUser.role, // Keep legacy role field
        });
      } catch (err) {
        // Stub phase: return mock user variant
        setUser(MOCK_USER_VARIANTS[MOCK_USER_VARIANT] || MOCK_USER_VARIANTS.VAGRANT);
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, error };
};