import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authType, setAuthType] = useState(null); // 'native' | 'member' | null
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [disclaimersCompleted, setDisclaimersCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        // HYBRID AUTH SYSTEM
        // Step 1: Try native Base44 admin auth first
        try {
          const nativeUser = await base44.auth.me();
          if (nativeUser && isMounted) {
            console.log('[AUTH] Native admin authenticated:', nativeUser.email);
            setUser({
              id: nativeUser.id,
              email: nativeUser.email,
              full_name: nativeUser.full_name,
              role: nativeUser.role,
              is_admin: nativeUser.role === 'admin',
              authType: 'native'
            });
            setAuthType('native');
            setInitialized(true);
            setLoading(false);
            setOnboardingCompleted(true);
            setDisclaimersCompleted(true);
            return;
          }
        } catch (nativeErr) {
          // Native auth failed, try member auth
          console.log('[AUTH] Native auth failed, checking member auth...');
        }

        // Step 2: Check for member token auth
        const savedToken = localStorage.getItem('nexus.login.token');
        if (!savedToken) {
          console.log('[AUTH] No saved login token found');
          if (isMounted) {
            setUser(null);
            setAuthType(null);
            setInitialized(true);
            setLoading(false);
          }
          return;
        }

        // Mark initialized to allow public pages to render
        setInitialized(true);
        setLoading(false);

        // Step 3: Decode and verify member token
        let loginData;
        try {
          loginData = JSON.parse(atob(savedToken));
        } catch (decodeErr) {
          console.warn('[AUTH] Invalid token format:', decodeErr.message);
          localStorage.removeItem('nexus.login.token');
          if (isMounted) {
            setUser(null);
            setAuthType(null);
          }
          return;
        }

        const { code, callsign } = loginData;
        if (!code || !callsign) {
          console.warn('[AUTH] Token missing code or callsign');
          localStorage.removeItem('nexus.login.token');
          if (isMounted) {
            setUser(null);
            setAuthType(null);
          }
          return;
        }

        // Step 4: Verify member session
        let response;
        try {
          response = await base44.functions.invoke('verifyMemberSession', { code, callsign });
        } catch (invokeErr) {
          console.error('[AUTH] verifyMemberSession failed:', invokeErr?.message);
          if (isMounted) {
            setUser(null);
            setAuthType(null);
          }
          return;
        }

        if (!isMounted) return;

        if (!response?.data?.success || !response?.data?.member) {
          console.warn('[AUTH] Session verification failed:', response?.data?.message);
          localStorage.removeItem('nexus.login.token');
          setUser(null);
          setAuthType(null);
          return;
        }

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
        setAuthType('member');
        setDisclaimersCompleted(!!memberProfile.accepted_pwa_disclaimer_at);
        setOnboardingCompleted(!!memberProfile.onboarding_completed);
      } catch (err) {
        if (!isMounted) return;
        console.error('[AUTH] Auth initialization error:', err?.message);
        setUser(null);
        setAuthType(null);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    try {
      if (authType === 'native') {
        await base44.auth.logout();
      }
      localStorage.removeItem('nexus.login.token');
      setUser(null);
      setAuthType(null);
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
    authType,
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