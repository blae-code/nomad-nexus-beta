import { useState, useEffect, useCallback } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export function useUserPermissions() {
  const [user, setUser] = useState(null);
  
  // Fetch User
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Fetch User's Roles
  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user || !user.assigned_role_ids || user.assigned_role_ids.length === 0) return [];
      
      // Fetch all roles and filter
      const allRoles = await base44.entities.Role.list();
      return allRoles.filter(r => user.assigned_role_ids.includes(r.id));
    },
    enabled: !!user
  });

  // Flatten permissions
  const permissions = new Set();
  userRoles.forEach(role => {
    if (role.permissions) {
      role.permissions.forEach(p => permissions.add(p));
    }
  });

  const hasPermission = useCallback((permission) => {
    // Super admin override based on Rank (Legacy compatibility)
    if (user?.rank === 'Pioneer' || user?.rank === 'Founder') return true; 
    return permissions.has(permission);
  }, [permissions, user]);

  const isAdmin = user?.rank === 'Pioneer' || user?.rank === 'Founder' || permissions.has('VIEW_ADMIN_PANEL');

  return {
    user,
    roles: userRoles,
    permissions: Array.from(permissions),
    hasPermission,
    isAdmin,
    isLoading: !user && user !== null || rolesLoading
  };
}