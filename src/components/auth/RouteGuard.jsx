import React from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import LoadingScreen from '@/components/common/LoadingScreen';
import { createPageUrl } from '@/utils';

/**
 * RouteGuard - Handles route protection and redirects based on auth state
 * @param {string} requiredAuth - 'none' | 'authenticated' | 'onboarded'
 * @param {ReactNode} children - Page content to render
 */
export default function RouteGuard({ requiredAuth = 'authenticated', children }) {
  const { user, loading, initialized, onboardingCompleted, disclaimersCompleted } = useAuth();

  // Still initializing auth state
  if (loading || !initialized) {
    return <LoadingScreen />;
  }

  // Route: public (no auth required)
  if (requiredAuth === 'none') {
    return children;
  }

  // No user, redirect to AccessGate
  if (!user) {
    React.useEffect(() => {
      window.location.href = createPageUrl('AccessGate');
    }, []);
    return <LoadingScreen />;
  }

  // User is authenticated but not disclaimers/onboarded - redirect to Disclaimers
  if (requiredAuth === 'onboarded' && !user.role === 'admin') {
    if (!disclaimersCompleted) {
      React.useEffect(() => {
        window.location.href = createPageUrl('Disclaimers');
      }, []);
      return <LoadingScreen />;
    }

    if (!onboardingCompleted) {
      React.useEffect(() => {
        window.location.href = createPageUrl('Onboarding');
      }, []);
      return <LoadingScreen />;
    }
  }

  // All checks passed, render children
  return children;
}