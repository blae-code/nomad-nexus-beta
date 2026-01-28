import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook to fetch and memoize current authenticated user.
 * Returns mocked data if not authenticated (for stub phase).
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        // During stub phase, return mocked user
        setUser({
          id: 'mock-user-001',
          email: 'pilot@nomad.nexus',
          full_name: 'Vagrant Pilot',
          role: 'user'
        });
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading, error };
};