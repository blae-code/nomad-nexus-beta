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
        const savedToken = localStorage.getItem('nexus.login.token');

        if (savedToken) {
          let loginData;
          try {
            loginData = JSON.parse(atob(savedToken));
          } catch (decodeErr) {
            console.warn('[AUTH] Invalid token format:', decodeErr.message);
            localStorage.removeItem('nexus.login.token');
          }

          if (loginData?.code && loginData?.callsign) {
            let response;
            try {
              response = await base44.functions.invoke('verifyMemberSession', { code: loginData.code, callsign: loginData.callsign });
            } catch (invokeErr) {
              console.error('[AUTH] verifyMemberSession failed:', invokeErr?.message);
            }

            if (response?.data?.success && response?.data?.member && isMounted) {
              const memberProfile = response.data.member;
              console.log('[AUTH] Member authenticated:', memberProfile.callsign, 'rank:', memberProfile.rank);

              const isAdmin = memberProfile.rank === 'Pioneer';
              setUser({
                id: memberProfile.id,
                member_profile_id: memberProfile.id,
                member_profile_data: memberProfile,
                is_admin: isAdmin,
                email: null,
                full_name: memberProfile.callsign,
                authType: 'member'
              });
              setDisclaimersCompleted(!!memberProfile.accepted_pwa_disclaimer_at);
              setOnboardingCompleted(!!memberProfile.onboarding_completed);
              setInitialized(true);
              setLoading(false);
              return; 
            } else {
              console.warn('[AUTH] Session verification failed:', response?.data?.message);
              localStorage.removeItem('nexus.login.token');
            }
          }
        }

        if (isMounted) {
          setUser(null);
          setInitialized(true);
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('[AUTH] Auth initialization error:', err?.message);
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

  const logout = async () => {
    try {
      localStorage.removeItem('nexus.login.token');
      setUser(null);
      window.location.href = createPageUrl('AccessGate');
    } catch (err) {
      console.error('[AUTH] Logout error:', err);
    }
  };

  const value = {
    user,
    loading,
    error,
    initialized,
    isAuthenticated: !!user,
    onboardingCompleted,
    disclaimersCompleted,
    logout
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