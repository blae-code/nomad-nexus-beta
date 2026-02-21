import { base44 } from '@/components/base44/nexusBase44Client';

/**
 * Permission Service — Granular RBAC for panels and features
 */

const PERMISSION_CACHE = new Map();
const CACHE_TTL = 60000; // 1 minute

export const ACCESS_LEVELS = {
  NONE: 'none',
  READ: 'read',
  EDIT: 'edit',
  ADMIN: 'admin',
};

/**
 * Get user's roles from member profile
 */
export function getUserRoles(user) {
  if (!user?.member_profile_data) return ['user'];
  
  const profile = user.member_profile_data;
  const roles = Array.isArray(profile.roles) ? profile.roles : [];
  
  // Add rank as a role
  if (profile.rank) {
    roles.push(`rank:${profile.rank.toLowerCase()}`);
  }
  
  // Add admin role for admin users
  if (user.is_admin) {
    roles.push('admin');
  }
  
  return roles.length > 0 ? roles : ['user'];
}

/**
 * Check if access level is sufficient
 */
export function hasAccessLevel(currentLevel, requiredLevel) {
  const hierarchy = [ACCESS_LEVELS.NONE, ACCESS_LEVELS.READ, ACCESS_LEVELS.EDIT, ACCESS_LEVELS.ADMIN];
  const currentIndex = hierarchy.indexOf(currentLevel);
  const requiredIndex = hierarchy.indexOf(requiredLevel);
  return currentIndex >= requiredIndex;
}

/**
 * Get panel permissions for a user
 */
export async function getPanelPermissions(user, panelId) {
  if (!user || !panelId) return { access_level: ACCESS_LEVELS.NONE, feature_permissions: {} };
  
  // Admins always have full access
  if (user.is_admin) {
    return {
      access_level: ACCESS_LEVELS.ADMIN,
      feature_permissions: {
        can_export: true,
        can_share: true,
        can_delete: true,
        can_configure: true,
        can_view_sensitive_data: true,
      },
      data_filters: {},
    };
  }
  
  const cacheKey = `${user.id}:${panelId}`;
  const cached = PERMISSION_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  const userRoles = getUserRoles(user);
  
  try {
    const permissions = await base44.entities.PanelPermission.filter({
      panel_id: panelId,
      is_active: true,
    });
    
    // Find best matching permission (highest access level)
    let bestPermission = {
      access_level: ACCESS_LEVELS.NONE,
      feature_permissions: {},
      data_filters: {},
    };
    
    for (const perm of permissions) {
      if (userRoles.includes(perm.role_name)) {
        if (hasAccessLevel(perm.access_level, bestPermission.access_level)) {
          bestPermission = {
            access_level: perm.access_level,
            feature_permissions: perm.feature_permissions || {},
            data_filters: perm.data_filters || {},
          };
        }
      }
    }
    
    // Cache result
    PERMISSION_CACHE.set(cacheKey, {
      permissions: bestPermission,
      timestamp: Date.now(),
    });
    
    return bestPermission;
  } catch (error) {
    console.error('[Permissions] Failed to load permissions:', error);
    return { access_level: ACCESS_LEVELS.READ, feature_permissions: {} };
  }
}

/**
 * Get all accessible panels for a user
 */
export async function getAccessiblePanels(user, allPanelIds) {
  if (!user || !Array.isArray(allPanelIds)) return [];
  
  // Admins see everything
  if (user.is_admin) return allPanelIds;
  
  const accessible = [];
  
  for (const panelId of allPanelIds) {
    const perm = await getPanelPermissions(user, panelId);
    if (perm.access_level !== ACCESS_LEVELS.NONE) {
      accessible.push(panelId);
    }
  }
  
  return accessible;
}

/**
 * Check if user has specific feature permission
 */
export async function hasFeaturePermission(user, panelId, featureName) {
  const perm = await getPanelPermissions(user, panelId);
  return perm.feature_permissions?.[featureName] === true;
}

/**
 * Clear permission cache (call when permissions are updated)
 */
export function clearPermissionCache() {
  PERMISSION_CACHE.clear();
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissionsForRole(roleName) {
  const defaults = {
    admin: {
      access_level: ACCESS_LEVELS.ADMIN,
      feature_permissions: {
        can_export: true,
        can_share: true,
        can_delete: true,
        can_configure: true,
        can_view_sensitive_data: true,
      },
    },
    moderator: {
      access_level: ACCESS_LEVELS.EDIT,
      feature_permissions: {
        can_export: true,
        can_share: true,
        can_delete: false,
        can_configure: true,
        can_view_sensitive_data: false,
      },
    },
    user: {
      access_level: ACCESS_LEVELS.READ,
      feature_permissions: {
        can_export: false,
        can_share: false,
        can_delete: false,
        can_configure: false,
        can_view_sensitive_data: false,
      },
    },
  };
  
  return defaults[roleName] || defaults.user;
}
