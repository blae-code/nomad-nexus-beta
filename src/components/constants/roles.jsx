/**
 * Role Set — canonical permission tags
 * Users can have multiple roles; roles are independent of rank
 */
export const ROLES = {
  SHAMANS: 'Shamans',       // Leadership/command
  RANGERS: 'Rangers',       // Recon/scouts
  INDUSTRY: 'Industry',     // Industrial/economic
  RACING: 'Racing',         // Racing/speed
  RESCUE: 'Rescue',         // Search & rescue
};

/**
 * Role list for dropdowns/selections
 */
export const ROLE_LIST = Object.values(ROLES);

/**
 * Check if user has at least one required role
 */
export const hasRequiredRole = (userRoles = [], requiredRoles = []) => {
  if (!requiredRoles.length) return true;
  return requiredRoles.some(role => userRoles.includes(role));
};

/**
 * Check if user has all required roles
 */
export const hasAllRequiredRoles = (userRoles = [], requiredRoles = []) => {
  if (!requiredRoles.length) return true;
  return requiredRoles.every(role => userRoles.includes(role));
};