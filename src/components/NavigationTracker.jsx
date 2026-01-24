import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Navigation tracking without importing unreachable pages.config exports.
 * Tracks navigation events for analytics/observability.
 */
export default function NavigationTracker() {
  useEffect(() => {
    const handleNavigation = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          base44.analytics.track({
            eventName: 'navigation',
            properties: {
              pathname: window.location.pathname,
              user_id: user.id
            }
          });
        }
      } catch (error) {
        console.warn('[NavigationTracker] Failed to track navigation:', error);
      }
    };

    handleNavigation();
    
    // Track popstate events (browser back/forward)
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  return null; // This component doesn't render anything
}