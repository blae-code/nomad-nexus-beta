import React from 'react';
import { createPageUrl } from '@/utils';
import { useCurrentUser } from './useCurrentUser';
import { isRankSufficient, RANKS } from './constants/ranks';
import { hasRequiredRole, hasAllRequiredRoles } from './constants/roles';
import { Lock } from 'lucide-react';

/**
 * PermissionGuard — Role & Rank based access control wrapper
 * 
 * Props:
 *   - minRank: User rank must be >= this rank (e.g., 'SCOUT')
 *   - allowedRanks: Array of allowed rank keys (e.g., ['VOYAGER', 'PIONEER'])
 *   - requiredRoles: Array of required role tags (any match = allow)
 *   - requireAllRoles: If true, user must have ALL roles (default: any match)
 *   - fallback: Custom fallback UI; defaults to compact "Access restricted" message
 *   - children: Content to render if authorized
 */
export default function PermissionGuard({ 
  children,
  minRank = null,
  allowedRanks = null,
  requiredRoles = null,
  requireAllRoles = false,
  fallback = null,
}) {
  const { user, loading } = useCurrentUser();

  // Still loading auth
  if (loading) {
    return (
      <div className="p-4 text-center text-zinc-500">
        Loading...
      </div>
    );
  }

  // No user - redirect to login
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = createPageUrl('AccessGate');
    }
    return fallback || (
      <div className="p-4 text-center text-orange-500">
        Redirecting to authentication...
      </div>
    );
  }

  let hasPermission = true;

  // Check minRank
  if (minRank && !isRankSufficient(user.rank, minRank)) {
    hasPermission = false;
  }

  // Check allowedRanks (whitelist)
  if (allowedRanks && !allowedRanks.includes(user.rank)) {
    hasPermission = false;
  }

  // Check requiredRoles
  if (requiredRoles && requiredRoles.length > 0) {
    const roleCheck = requireAllRoles
      ? hasAllRequiredRoles(user.roles, requiredRoles)
      : hasRequiredRole(user.roles, requiredRoles);
    
    if (!roleCheck) {
      hasPermission = false;
    }
  }

  if (!hasPermission) {
    return fallback || (
      <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 flex items-center gap-3 text-zinc-400 text-sm">
        <Lock className="w-4 h-4" />
        <span>Access restricted</span>
      </div>
    );
  }

  return <>{children}</>;
}