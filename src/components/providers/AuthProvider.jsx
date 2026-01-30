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

        // Wrap in timeout (10 seconds)
        const authPromise = (async () => {
          try {
            currentUser = await base44.auth.me();
          } catch (err) {
            // 401 or any error means user is not authenticated
            if (err?.response?.status === 401 || err?.status === 401) {
              setUser(null);
              setInitialized(true);
              setLoading(false);
              return 'unauthenticated';
            }
            throw err;
          }

          setUser(currentUser);

          // Skip checks for admins
          if (currentUser.role === 'admin') {
            setOnboardingCompleted(true);
            setDisclaimersCompleted(true);
            setInitialized(true);
            setLoading(false);
            return 'success';
          }

          // Check member profile for onboarding/disclaimers status
          const profiles = await base44.entities.MemberProfile.filter({ 
            user_id: currentUser.id 
          });

          if (profiles.length > 0) {
            const profile = profiles[0];
            setDisclaimersCompleted(!!profile.accepted_pwa_disclaimer_at);
            setOnboardingCompleted(!!profile.onboarding_completed);
          }

          setInitialized(true);
          setLoading(false);
          return 'success';
        })();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Authentication initialization timeout (10s exceeded)')), 10000)
        );

        await Promise.race([authPromise, timeoutPromise]);
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err);
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