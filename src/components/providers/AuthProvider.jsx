import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [disclaimersCompleted, setDisclaimersCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        // Guard: only check isAuthenticated first, never call User/me unless authenticated
        const isAuth = await base44.auth.isAuthenticated();
        if (!isMounted) return;

        if (!isAuth) {
          setUser(null);
          setInitialized(true);
          setLoading(false);
          return;
        }

        // Only fetch User/me if authenticated
        let currentUser = null;
        try {
          currentUser = await base44.auth.me();
          if (!isMounted) return;
        } catch (err) {
          // If User/me fails when isAuthenticated=true, something is wrong
          console.warn('User fetch failed after auth check:', err?.message);
          setUser(null);
          setInitialized(true);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        // Skip profile checks for admins
        if (currentUser.role === 'admin') {
          setOnboardingCompleted(true);
          setDisclaimersCompleted(true);
          setInitialized(true);
          setLoading(false);
          return;
        }

        // Check member profile for onboarding/disclaimers status
        try {
          const profiles = await base44.entities.MemberProfile.filter({ 
            user_id: currentUser.id 
          });
          if (!isMounted) return;

          if (profiles.length > 0) {
            const profile = profiles[0];
            setDisclaimersCompleted(!!profile.accepted_pwa_disclaimer_at);
            setOnboardingCompleted(!!profile.onboarding_completed);
          }
        } catch (profileErr) {
          if (!isMounted) return;
          console.warn('Profile fetch warning:', profileErr?.message);
        }

        setInitialized(true);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        console.error('Auth initialization error:', err?.message);
        setUser(null);
        setInitialized(true);
        setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = {
    user,
    loading,
    error,
    initialized,
    onboardingCompleted,
    disclaimersCompleted,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}