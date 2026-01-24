import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { pagesConfig } from '@/pages.config';

// Minimal, stable tracker: post URL changes + optional activity logging
export { default } from '@/components/lib/NavigationTracker';
export default function NavigationTracker() {
  const location = useLocation();

  // Notify Base44 parent frame when URL changes
  useEffect(() => {
    window.parent?.postMessage(
      { type: 'app_changed_url', url: window.location.href },
      '*'
    );
  }, [location]);

  // Best-effort activity logging (never blocks app)
  useEffect(() => {
    try {
      const resolvedPages =
        pagesConfig?.Pages ?? (Array.isArray(pagesConfig) ? {} : pagesConfig ?? {});
      const mainPageKey = pagesConfig?.mainPage ?? Object.keys(resolvedPages)[0];

      const pathname = location.pathname || '/';
      const pageName =
        pathname === '/' ? mainPageKey : pathname.replace(/^\//, '').split('/')[0];

      if (pageName) {
        base44?.appLogs?.logUserInApp?.(pageName).catch?.(() => {});
      }
    } catch {
      // no-op
    }
  }, [location]);

  return null;
}
