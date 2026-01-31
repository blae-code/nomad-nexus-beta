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

              // Load MemberProfile (source of truth for auth state, not User.role)
              try {
                // Fetch all profiles and find one created by the service for this user
                // (service creates profiles when access keys are redeemed)
                const allProfiles = await base44.entities.MemberProfile.filter({});
                if (!isMounted) return;

                // MemberProfile.created_by will be service email, so look by other fields
                // For now, get the most recently created one (created after user registration)
                // In production, store user_email in MemberProfile for reliable lookup
                let profile = null;

                // Try to find by exact email match in created_by (for manually created profiles)
                profile = allProfiles.find(p => p.created_by === currentUser.email);

                // If not found, assume most recent profile is the user's (service-created)
                if (!profile && allProfiles.length > 0) {
                  profile = allProfiles.sort((a, b) => 
                    new Date(b.created_date) - new Date(a.created_date)
                  )[0];
                }

                if (!profile) {
                  console.warn('No MemberProfile found for user:', currentUser.email);
                  setUser(null);
                  return;
                }

                // Store profile and check admin status via rank
                const isAdmin = profile.rank === 'Pioneer';
                setUser({
                  ...currentUser,
                  member_profile_id: profile.id,
                  member_profile_data: profile,
                  is_admin: isAdmin
                });

                // Set onboarding/disclaimers based on profile
                setDisclaimersCompleted(!!profile.accepted_pwa_disclaimer_at);
                setOnboardingCompleted(!!profile.onboarding_completed);
              } catch (profileErr) {
                if (!isMounted) return;
                console.error('MemberProfile fetch failed:', profileErr?.message);
                setUser(null);
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