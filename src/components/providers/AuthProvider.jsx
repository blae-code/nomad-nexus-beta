import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { navigateToPage, isAdminUser } from '@/utils';

const AuthContext = createContext(null);

function resolveAiConsent(memberProfile) {
  const raw = memberProfile?.ai_consent;
  if (raw === null || raw === undefined || raw === '') return true;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  const normalized = String(raw).trim().toLowerCase();
  if (['false', '0', 'off', 'disabled', 'no'].includes(normalized)) return false;
  return true;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [disclaimersCompleted, setDisclaimersCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [aiFeaturesEnabled, setAiFeaturesEnabledState] = useState(true);
  const [aiFeaturesUpdating, setAiFeaturesUpdating] = useState(false);
  const [aiFeaturesError, setAiFeaturesError] = useState(null);

  const applyMemberSession = useCallback((memberProfile) => {
    const perUserDisplayKey = `nexus.display_callsign.${memberProfile.id}`;
    let storedDisplay = localStorage.getItem(perUserDisplayKey);
    if (!storedDisplay) {
      const legacyDisplay = localStorage.getItem('nexus.display_callsign');
      if (legacyDisplay) {
        storedDisplay = legacyDisplay;
        localStorage.setItem(perUserDisplayKey, legacyDisplay);
        localStorage.removeItem('nexus.display_callsign');
      }
    }
    const displayCallsign = memberProfile.display_callsign || storedDisplay || null;
    const memberProfileForUI = {
      ...memberProfile,
      login_callsign: memberProfile.callsign,
      display_callsign: displayCallsign,
      callsign: displayCallsign || memberProfile.callsign,
    };

    const rank = (memberProfile.rank || '').toString().toUpperCase();
    const roles = (memberProfile.roles || []).map((r) => r.toString().toLowerCase());
    const seedAdmin = rank === 'PIONEER' || rank === 'FOUNDER' || roles.includes('admin');
    const nextUser = {
      id: memberProfile.id,
      member_profile_id: memberProfile.id,
      member_profile_data: memberProfileForUI,
      is_admin: seedAdmin,
      email: null,
      full_name: memberProfileForUI.callsign,
      callsign: memberProfileForUI.callsign,
      authType: 'member',
    };

    const normalizedUser = {
      ...nextUser,
      is_admin: isAdminUser(nextUser),
    };
    setUser(normalizedUser);
    setDisclaimersCompleted(!!memberProfile.accepted_pwa_disclaimer_at);
    setOnboardingCompleted(!!memberProfile.onboarding_completed);
    setAiFeaturesEnabledState(resolveAiConsent(memberProfile));
    setAiFeaturesError(null);
    setInitialized(true);
    setLoading(false);
    return normalizedUser;
  }, []);

  const applyAdminSession = useCallback((adminUser) => {
    const adminCallsign = adminUser.callsign || adminUser.full_name || adminUser.email || 'System Admin';
    const adminRoles = Array.isArray(adminUser.roles)
      ? adminUser.roles
      : adminUser.roles
        ? [adminUser.roles]
        : ['admin'];
    const adminProfile = {
      id: adminUser.id,
      callsign: adminCallsign,
      display_callsign: adminCallsign,
      login_callsign: adminCallsign,
      rank: adminUser.rank || 'PIONEER',
      roles: adminRoles,
      membership: adminUser.membership || 'MEMBER',
    };

    const nextUser = {
      ...adminUser,
      is_admin: true,
      callsign: adminCallsign,
      member_profile_id: adminUser.id,
      member_profile_data: adminProfile,
      rank: adminProfile.rank,
      roles: adminRoles,
      authType: 'admin',
    };
    const normalizedUser = {
      ...nextUser,
      is_admin: isAdminUser(nextUser),
    };
    setUser(normalizedUser);
    setDisclaimersCompleted(true);
    setOnboardingCompleted(true);
    setAiFeaturesEnabledState(true);
    setAiFeaturesError(null);
    setInitialized(true);
    setLoading(false);
    return normalizedUser;
  }, []);

  const clearSessionState = useCallback(() => {
    setUser(null);
    setAiFeaturesEnabledState(true);
    setAiFeaturesError(null);
    setInitialized(true);
    setLoading(false);
  }, []);

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    try {
      const savedToken = localStorage.getItem('nexus.login.token');

      if (savedToken) {
        let loginData;
        try {
          loginData = JSON.parse(atob(savedToken));
        } catch (decodeErr) {
          console.warn('[AUTH] Invalid token format:', decodeErr.message);
          localStorage.removeItem('nexus.login.token');
          localStorage.removeItem('nexus.display_callsign');
        }

        if (loginData?.code && loginData?.callsign) {
          let response;
          try {
            response = await base44.functions.invoke('verifyMemberSession', { code: loginData.code, callsign: loginData.callsign });
          } catch (invokeErr) {
            console.error('[AUTH] verifyMemberSession failed:', invokeErr?.message);
          }

          if (response?.data?.success && response?.data?.member) {
            const memberUser = applyMemberSession(response.data.member);
            return { authenticated: true, user: memberUser, source: 'member' };
          }

          console.warn('[AUTH] Session verification failed:', response?.data?.message);
          localStorage.removeItem('nexus.login.token');
          localStorage.removeItem('nexus.display_callsign');
          if (loginData?.memberProfileId) {
            localStorage.removeItem(`nexus.display_callsign.${loginData.memberProfileId}`);
          }
        }
      }

      try {
        const adminUser = await base44.auth.me();
        if (adminUser && isAdminUser(adminUser)) {
          const nextUser = applyAdminSession(adminUser);
          return { authenticated: true, user: nextUser, source: 'admin' };
        }
      } catch (adminErr) {
        console.warn('[AUTH] Admin auth check failed:', adminErr?.message);
      }

      clearSessionState();
      return { authenticated: false, user: null };
    } catch (err) {
      console.error('[AUTH] Auth refresh error:', err?.message);
      clearSessionState();
      return { authenticated: false, user: null, error: err };
    }
  }, [applyAdminSession, applyMemberSession, clearSessionState]);

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
            localStorage.removeItem('nexus.display_callsign');
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
              applyMemberSession(memberProfile);
              return; 
            } else {
              console.warn('[AUTH] Session verification failed:', response?.data?.message);
              localStorage.removeItem('nexus.login.token');
              localStorage.removeItem('nexus.display_callsign');
              if (loginData?.memberProfileId) {
                localStorage.removeItem(`nexus.display_callsign.${loginData.memberProfileId}`);
              }
            }
          }
        }

        if (isMounted) {
          try {
            const adminUser = await base44.auth.me();
            if (adminUser && isAdminUser(adminUser)) {
              applyAdminSession(adminUser);
              return;
            }
          } catch (adminErr) {
            console.warn('[AUTH] Admin auth check failed:', adminErr?.message);
          }

          clearSessionState();
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('[AUTH] Auth initialization error:', err?.message);
        clearSessionState();
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [applyAdminSession, applyMemberSession, clearSessionState]);

  const logout = async () => {
    try {
      localStorage.removeItem('nexus.login.token');
      localStorage.removeItem('nexus.display_callsign');
      if (user?.member_profile_id) {
        localStorage.removeItem(`nexus.display_callsign.${user.member_profile_id}`);
      }
      setUser(null);
      setAiFeaturesEnabledState(true);
      setAiFeaturesError(null);
      navigateToPage('AccessGate');
    } catch (err) {
      console.error('[AUTH] Logout error:', err);
    }
  };

  const setAiFeaturesEnabled = async (nextEnabled) => {
    const normalized = Boolean(nextEnabled);

    if (!user?.member_profile_id) {
      setAiFeaturesEnabledState(normalized);
      setAiFeaturesError(null);
      return { success: true, value: normalized, persisted: false };
    }

    if (user?.authType === 'admin') {
      setAiFeaturesEnabledState(true);
      setAiFeaturesError(null);
      return { success: true, value: true, persisted: false };
    }

    const previous = aiFeaturesEnabled;
    setAiFeaturesUpdating(true);
    setAiFeaturesError(null);
    setAiFeaturesEnabledState(normalized);

    try {
      await base44.entities.MemberProfile.update(user.member_profile_id, {
        ai_consent: normalized,
      });

      setUser((prev) => {
        if (!prev) return prev;
        const profile = prev.member_profile_data || {};
        return {
          ...prev,
          member_profile_data: {
            ...profile,
            ai_consent: normalized,
          },
        };
      });

      return { success: true, value: normalized, persisted: true };
    } catch (err) {
      const message = err?.message || 'Failed to update AI feature preference.';
      setAiFeaturesEnabledState(previous);
      setAiFeaturesError(message);
      return { success: false, value: previous, error: message, persisted: false };
    } finally {
      setAiFeaturesUpdating(false);
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
    aiFeaturesEnabled,
    aiFeaturesUpdating,
    aiFeaturesError,
    setAiFeaturesEnabled,
    refreshAuth,
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
