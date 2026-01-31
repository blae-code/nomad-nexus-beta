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
              // Mark initialized immediately to allow public pages to render
              setInitialized(true);
              setLoading(false);

              // Then check auth in background (don't block rendering)
              const isAuthPromise = base44.auth.isAuthenticated();
              const isAuth = await Promise.race([
                isAuthPromise,
                new Promise(resolve => setTimeout(() => resolve(false), 3000)) // 3s timeout
              ]);
              if (!isMounted) return;

              if (!isAuth) {
                setUser(null);
                return;
              }

              // Only fetch User/me if authenticated
              let currentUser = null;
              try {
                currentUser = await base44.auth.me();
                if (!isMounted) return;
              } catch (err) {
                console.warn('User fetch failed after auth check:', err?.message);
                setUser(null);
                return;
              }

              setUser(currentUser);

              // Skip profile checks for admins
              if (currentUser.role === 'admin') {
                setOnboardingCompleted(true);
                setDisclaimersCompleted(true);
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
            } catch (err) {
              if (!isMounted) return;
              console.error('Auth initialization error:', err?.message);
              setUser(null);
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