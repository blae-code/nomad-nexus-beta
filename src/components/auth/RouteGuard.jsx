import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/providers/AuthProvider';
import { base44 } from '@/api/base44Client';
import LoadingScreen from '@/components/common/LoadingScreen';
import { createPageUrl } from '@/utils';

/**
 * RouteGuard - Handles route protection and redirects based on auth state
 * Uses Navigate for safe client-side routing (no direct window.location.href during render)
 * @param {string} requiredAuth - 'none' | 'authenticated' | 'onboarded'
 * @param {string} currentPageName - Current page name to detect onboarding/hub redirects
 * @param {ReactNode} children - Page content to render
 */
export default function RouteGuard({ requiredAuth = 'authenticated', currentPageName, children }) {
  const { user, loading, initialized, onboardingCompleted, disclaimersCompleted } = useAuth();
  const [memberProfile, setMemberProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch MemberProfile when user is authenticated
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      if (!user || !initialized) {
        setProfileLoading(false);
        return;
      }

      try {
        const profiles = await base44.entities.MemberProfile.filter({ user_id: user.id });
        if (isMounted) {
          setMemberProfile(profiles.length > 0 ? profiles[0] : null);
          setProfileLoading(false);
        }
      } catch (err) {
        console.warn('Profile fetch failed:', err?.message);
        if (isMounted) {
          setMemberProfile(null);
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user, initialized]);

  // Route: public (no auth required) - allow immediately, don't wait for loading
  if (requiredAuth === 'none') {
    return children;
  }

  // Still initializing auth state (only for protected routes)
  if (loading || !initialized) {
    return <LoadingScreen />;
  }

  // No user, redirect to AccessGate
  if (!user) {
    return (
      <>
        <LoadingScreen />
        <Navigate to={createPageUrl('AccessGate')} replace />
      </>
    );
  }

  // User is authenticated but incomplete onboarding flow
  if (requiredAuth === 'onboarded' && user.role !== 'admin') {
    if (!disclaimersCompleted) {
      return (
        <>
          <LoadingScreen />
          <Navigate to={createPageUrl('Disclaimers')} replace />
        </>
      );
    }

    if (!onboardingCompleted) {
      return (
        <>
          <LoadingScreen />
          <Navigate to={createPageUrl('Onboarding')} replace />
        </>
      );
    }
  }

  // All checks passed, render children
  return children;
}