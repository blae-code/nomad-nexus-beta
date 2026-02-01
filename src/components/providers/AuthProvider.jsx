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
              // Member-first authentication: Check localStorage for stored session token FIRST
              const savedToken = localStorage.getItem('nexus.login.token');
              if (!savedToken) {
                console.log('[AUTH] No saved login token found');
                if (isMounted) {
                  setUser(null);
                  setInitialized(true);
                  setLoading(false);
                }
                return;
              }

              // Mark initialized immediately to allow public pages to render
              setInitialized(true);
              setLoading(false);

              // Decode saved token to get code + callsign
              let loginData;
              try {
                loginData = JSON.parse(atob(savedToken));
              } catch (decodeErr) {
                console.warn('[AUTH] Invalid token format:', decodeErr.message);
                localStorage.removeItem('nexus.login.token');
                setUser(null);
                return;
              }

              const { code, callsign } = loginData;
              if (!code || !callsign) {
                console.warn('[AUTH] Token missing code or callsign');
                localStorage.removeItem('nexus.login.token');
                setUser(null);
                return;
              }

              // Call verifyMemberSession to validate the session
              let response;
              try {
                response = await base44.functions.invoke('verifyMemberSession', { code, callsign });
              } catch (invokeErr) {
                console.error('[AUTH] verifyMemberSession failed:', invokeErr?.message);
                // Don't remove token on first failure - might be network issue
                if (isMounted) {
                  setUser(null);
                }
                return;
              }

              if (!isMounted) return;

              // Check if verification succeeded
              if (!response?.data?.success || !response?.data?.member) {
                console.warn('[AUTH] Session verification failed:', response?.data?.message);
                localStorage.removeItem('nexus.login.token');
                setUser(null);
                return;
              }

              const memberProfile = response.data.member;
              console.log('[AUTH] Session verified. Member:', memberProfile.id, 'callsign:', memberProfile.callsign, 'rank:', memberProfile.rank);

              // Set authenticated user with member profile as source of truth
              const isAdmin = memberProfile.rank === 'Pioneer';
              setUser({
                member_profile_id: memberProfile.id,
                member_profile_data: memberProfile,
                is_admin: isAdmin,
                // Legacy fields for compatibility
                email: null,
                full_name: memberProfile.callsign,
                id: memberProfile.id
              });

              // Set onboarding/disclaimers based on profile
              setDisclaimersCompleted(!!memberProfile.accepted_pwa_disclaimer_at);
              setOnboardingCompleted(!!memberProfile.onboarding_completed);
            } catch (err) {
              if (!isMounted) return;
              console.error('[AUTH] Auth initialization error:', err?.message);
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