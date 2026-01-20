// Comprehensive permissions list for the system
export const PERMISSIONS = {
  // User Management
  'users.view': 'View user profiles',
  'users.edit': 'Edit user profiles',
  'users.delete': 'Delete users',
  'users.invite': 'Invite new users',
  'users.assign_roles': 'Assign roles to users',
  
  // Role Management
  'roles.view': 'View roles',
  'roles.create': 'Create new roles',
  'roles.edit': 'Edit existing roles',
  'roles.delete': 'Delete roles',
  
  // Channel Management
  'channels.view': 'View channels',
  'channels.create': 'Create channels',
  'channels.edit': 'Edit channel settings',
  'channels.delete': 'Delete channels',
  'channels.moderate': 'Moderate channel content',
  
  // Message Management
  'messages.view': 'View messages',
  'messages.post': 'Post messages',
  'messages.delete': 'Delete any message',
  'messages.pin': 'Pin messages',
  
  // Voice Net Management
  'voicenets.view': 'View voice nets',
  'voicenets.create': 'Create voice nets',
  'voicenets.edit': 'Edit voice net settings',
  'voicenets.delete': 'Delete voice nets',
  'voicenets.join': 'Join voice nets',
  'voicenets.moderate': 'Moderate voice nets (mute users)',
  
  // Event Management
  'events.view': 'View events',
  'events.create': 'Create events',
  'events.edit': 'Edit events',
  'events.delete': 'Delete events',
  'events.approve': 'Approve pending events',
  
  // Squad Management
  'squads.view': 'View squads',
  'squads.create': 'Create squads',
  'squads.edit': 'Edit squad settings',
  'squads.delete': 'Delete squads',
  'squads.manage_members': 'Manage squad members',
  
  // Mission Management
  'missions.view': 'View missions',
  'missions.create': 'Create missions',
  'missions.edit': 'Edit missions',
  'missions.delete': 'Delete missions',
  
  // Treasury & Economy
  'treasury.view': 'View treasury',
  'treasury.manage': 'Manage transactions',
  'armory.view': 'View armory',
  'armory.manage': 'Manage armory inventory',
  
  // System Administration
  'system.admin': 'Full system administration',
  'system.audit_logs': 'View audit logs',
  'system.health_monitor': 'View system health',
  'system.settings': 'Modify system settings'
};

export const PERMISSION_CATEGORIES = {
  'User Management': ['users.view', 'users.edit', 'users.delete', 'users.invite', 'users.assign_roles'],
  'Role Management': ['roles.view', 'roles.create', 'roles.edit', 'roles.delete'],
  'Channels': ['channels.view', 'channels.create', 'channels.edit', 'channels.delete', 'channels.moderate'],
  'Messages': ['messages.view', 'messages.post', 'messages.delete', 'messages.pin'],
  'Voice Nets': ['voicenets.view', 'voicenets.create', 'voicenets.edit', 'voicenets.delete', 'voicenets.join', 'voicenets.moderate'],
  'Events': ['events.view', 'events.create', 'events.edit', 'events.delete', 'events.approve'],
  'Squads': ['squads.view', 'squads.create', 'squads.edit', 'squads.delete', 'squads.manage_members'],
  'Missions': ['missions.view', 'missions.create', 'missions.edit', 'missions.delete'],
  'Treasury & Economy': ['treasury.view', 'treasury.manage', 'armory.view', 'armory.manage'],
  'System': ['system.admin', 'system.audit_logs', 'system.health_monitor', 'system.settings']
};

// Helper function to check if user has permission
export function hasPermission(user, permission) {
  if (!user) return false;
  
  // System admin has all permissions
  if (user.role === 'admin') return true;
  
  // Check if user's assigned roles have the permission
  if (!user.assigned_roles || user.assigned_roles.length === 0) return false;
  
  return user.assigned_roles.some(role => 
    role.permissions && role.permissions.includes(permission)
  );
}

// Helper to get all user permissions
export function getUserPermissions(user) {
  if (!user) return [];
  if (user.role === 'admin') return Object.keys(PERMISSIONS);
  
  if (!user.assigned_roles || user.assigned_roles.length === 0) return [];
  
  const permissions = new Set();
  user.assigned_roles.forEach(role => {
    if (role.permissions) {
      role.permissions.forEach(perm => permissions.add(perm));
    }
  });
  
  return Array.from(permissions);
}