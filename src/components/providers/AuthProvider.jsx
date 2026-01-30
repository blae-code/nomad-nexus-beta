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
    const checkAuth = async () => {
      try {
        let currentUser = null;

        try {
          currentUser = await base44.auth.me();
        } catch (err) {
          // 401 or any auth error = user not authenticated (expected for public app)
          if (err?.response?.status === 401 || err?.status === 401 || err?.message?.includes('Unauthorized')) {
            setUser(null);
            setInitialized(true);
            setLoading(false);
            return;
          }
          // Network errors or other issues - still initialize as unauthenticated
          console.warn('Auth check warning (non-fatal):', err?.message);
          setUser(null);
          setInitialized(true);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        // Skip checks for admins
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

          if (profiles.length > 0) {
            const profile = profiles[0];
            setDisclaimersCompleted(!!profile.accepted_pwa_disclaimer_at);
            setOnboardingCompleted(!!profile.onboarding_completed);
          }
        } catch (profileErr) {
          console.warn('Profile fetch warning:', profileErr?.message);
        }

        setInitialized(true);
        setLoading(false);
      } catch (err) {
        // Catch-all for any unexpected errors - treat as unauthenticated
        console.error('Auth initialization error:', err?.message);
        setUser(null);
        setInitialized(true);
        setLoading(false);
      }
    };

    checkAuth();
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