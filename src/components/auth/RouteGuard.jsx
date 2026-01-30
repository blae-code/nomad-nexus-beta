import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/providers/AuthProvider';
import LoadingScreen from '@/components/common/LoadingScreen';
import { createPageUrl } from '@/utils';

/**
 * RouteGuard - Handles route protection and redirects based on auth state
 * Uses Navigate for safe client-side routing (no direct window.location.href during render)
 * @param {string} requiredAuth - 'none' | 'authenticated' | 'onboarded'
 * @param {ReactNode} children - Page content to render
 */
export default function RouteGuard({ requiredAuth = 'authenticated', children }) {
  const { user, loading, initialized, onboardingCompleted, disclaimersCompleted } = useAuth();

  // Still initializing auth state
  if (loading || !initialized) {
    return <LoadingScreen />;
  }

  // Route: public (no auth required) - allow once initialized
  if (requiredAuth === 'none') {
    return children;
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