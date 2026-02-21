import React from 'react';
import { isAdminUser, navigateToPage } from '@/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { isRankSufficient, RANKS } from './constants/ranks';
import { hasRequiredRole, hasAllRequiredRoles } from './constants/roles';
import { Lock, EyeOff } from 'lucide-react';

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
  const { user: authUser, loading } = useAuth();
  const user = authUser?.member_profile_data || authUser;

  React.useEffect(() => {
    if (loading) return;
    if (user) return;
    if (typeof window !== 'undefined') {
      navigateToPage('AccessGate');
    }
  }, [loading, user]);

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
    // Admins should always have access - this shouldn't happen
    if (isAdminUser(authUser)) {
      console.warn('Admin permission check failed:', { user, minRank, allowedRanks, requiredRoles });
      return <>{children}</>;
    }
    
    if (fallback) {
      return fallback;
    }

    return (
      <div className="p-4">
        <div className="relative overflow-hidden rounded-lg border border-red-500/30 bg-gradient-to-br from-red-950/30 via-zinc-950 to-black px-4 py-5">
          <div className="absolute inset-0 opacity-40">
            <div className="h-full w-full bg-[linear-gradient(0deg,rgba(248,113,113,0.08)_1px,transparent_1px)] bg-[length:100%_6px]" />
          </div>
          <div className="absolute inset-0 opacity-30">
            <div className="h-full w-full bg-[linear-gradient(90deg,rgba(248,113,113,0.06)_1px,transparent_1px)] bg-[length:12px_100%]" />
          </div>

          <div className="relative flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded bg-red-500/20 text-red-300">
              <Lock className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-red-300">
                <span className="font-black">ACCESS RESTRICTED</span>
                <span className="text-[10px] text-red-400/70">REDACTED</span>
              </div>
              <div className="text-sm font-semibold text-zinc-200">Classified Module</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Content is available, but your current clearance level does not permit viewing.
                Continue operations to unlock access.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest">
                <span className="inline-flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 text-red-300/80">
                  <EyeOff className="h-3 w-3" /> Masked
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-zinc-700/60 px-2 py-1">
                  Permission Gate
                </span>
                {minRank && (
                  <span className="inline-flex items-center gap-1 rounded border border-zinc-700/60 px-2 py-1">
                    Min Rank: {minRank}
                  </span>
                )}
                {requiredRoles && requiredRoles.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded border border-zinc-700/60 px-2 py-1">
                    Role: {requiredRoles.join(', ')}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-red-200/60">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={`redact-${idx}`}
                    className="h-2 rounded bg-red-500/10 border border-red-500/20"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
