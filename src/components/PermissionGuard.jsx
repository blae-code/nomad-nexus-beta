import React from 'react';

/**
 * PermissionGuard — Role-based access control wrapper.
 * Stub: Currently allows all access. Will enforce roles/permissions later.
 */
export default function PermissionGuard({ 
  children, 
  requiredRole = null, 
  fallback = null 
}) {
  // Stub phase: allow all
  const hasPermission = true;

  if (!hasPermission) {
    return fallback || (
      <div className="p-8 text-center text-orange-500">
        Access Denied
      </div>
    );
  }

  return <>{children}</>;
}