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
        const isAuth = await base44.auth.isAuthenticated();
        
        if (!isAuth) {
          // Not authenticated
          setUser(null);
          setInitialized(true);
          setLoading(false);
          return;
        }

        // Fetch current user
        const currentUser = await base44.auth.me();
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
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err);
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