import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/providers/AuthProvider';
import LoadingScreen from '@/components/common/LoadingScreen';
import AuthSecurityFailure from '@/components/auth/AuthSecurityFailure';
import { createPageUrl } from '@/utils';

/**
 * RouteGuard - Handles route protection and redirects based on auth state
 * Uses Navigate for safe client-side routing (no direct window.location.href during render)
 * @param {string} requiredAuth - 'none' | 'authenticated' | 'onboarded'
 * @param {ReactNode} children - Page content to render
 */
export default function RouteGuard({ requiredAuth = 'authenticated', children }) {
  const { user, loading, initialized, onboardingCompleted, disclaimersCompleted } = useAuth();
  const [failureReason, setFailureReason] = React.useState(null);

  // Route: public (no auth required) - allow immediately, don't wait for loading
  if (requiredAuth === 'none') {
    return children;
  }

  // Still initializing auth state (only for protected routes)
  if (loading || !initialized) {
    return <LoadingScreen />;
  }

  // No user - attempt smart redirect or show failure
  if (!user) {
    if (requiredAuth === 'onboarded') {
      // Try to determine what content they're missing
      const savedToken = localStorage.getItem('nexus.login.token');
      let missingContent = null;

      if (savedToken) {
        try {
          const loginData = JSON.parse(atob(savedToken));
          // Token exists but auth failed - likely session expired or revoked
          // Default to showing disclaimers (most common path)
          missingContent = 'Disclaimers';
        } catch (e) {
          // Invalid token
        }
      }

      // Route to missing content or show security failure
      if (missingContent === 'Disclaimers') {
        return (
          <>
            <LoadingScreen />
            <Navigate to={createPageUrl('Disclaimers')} replace />
          </>
        );
      }

      if (missingContent === 'Onboarding') {
        return (
          <>
            <LoadingScreen />
            <Navigate to={createPageUrl('Onboarding')} replace />
          </>
        );
      }

      // Can't determine - show security failure
      return <AuthSecurityFailure reason="session_expired" />;
    }

    // For 'authenticated' routes, go back to AccessGate
    return (
      <>
        <LoadingScreen />
        <Navigate to={createPageUrl('AccessGate')} replace />
      </>
    );
  }

  // User is authenticated but incomplete onboarding flow (non-admins only)
  if (requiredAuth === 'onboarded') {
    // Check admin status via MemberProfile rank (source of truth)
    const isAdmin = user.is_admin || user.member_profile_data?.rank === 'Pioneer';

    if (!isAdmin) {
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
    // Admins automatically pass 'onboarded' checks
  }

  // All checks passed, render children
  return children;
}