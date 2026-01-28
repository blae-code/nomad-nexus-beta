import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Mock user variants for dev/testing
 * Change MOCK_USER_VARIANT to quickly test different ranks/roles
 */
export const MOCK_USER_VARIANTS = {
  VAGRANT: {
    id: 'mock-user-001',
    email: 'vagrant@nomad.nexus',
    full_name: 'Vagrant Pilot',
    callsign: 'Vagrant',
    rank: 'VAGRANT',
    roles: [],
  },
  SCOUT: {
    id: 'mock-user-002',
    email: 'scout@nomad.nexus',
    full_name: 'Scout Lead',
    callsign: 'Scout',
    rank: 'SCOUT',
    roles: ['Rangers'],
  },
  VOYAGER: {
    id: 'mock-user-003',
    email: 'voyager@nomad.nexus',
    full_name: 'Voyager Commander',
    callsign: 'Voyager',
    rank: 'VOYAGER',
    roles: ['Shamans', 'Rangers'],
  },
};

// DEV: Toggle this to simulate different ranks (e.g., 'VAGRANT', 'SCOUT', 'VOYAGER')
const MOCK_USER_VARIANT = 'SCOUT';

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