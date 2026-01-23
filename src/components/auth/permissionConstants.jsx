export const PERMISSIONS = {
  // Administrative
  MANAGE_ROLES: "MANAGE_ROLES",
  MANAGE_USERS: "MANAGE_USERS",
  VIEW_ADMIN_PANEL: "VIEW_ADMIN_PANEL",
  SYSTEM_ADMINISTRATOR: "SYSTEM_ADMINISTRATOR",
  
  // Rank Management
  CHANGE_USER_RANK: "CHANGE_USER_RANK",
  PROMOTE_TO_VOYAGER: "PROMOTE_TO_VOYAGER",
  PROMOTE_TO_FOUNDER: "PROMOTE_TO_FOUNDER",
  PROMOTE_TO_PIONEER: "PROMOTE_TO_PIONEER",
  GRANT_SYSTEM_ADMIN: "GRANT_SYSTEM_ADMIN",

  // Comms / Nets
  MANAGE_NETS: "MANAGE_NETS",
  TRANSMIT_AUDIO: "TRANSMIT_AUDIO",
  LISTEN_AUDIO: "LISTEN_AUDIO",
  VIEW_COMMS_LOGS: "VIEW_COMMS_LOGS",

  // Operations
  CREATE_EVENT: "CREATE_EVENT",
  MANAGE_EVENT: "MANAGE_EVENT",
  VIEW_TACTICAL_MAP: "VIEW_TACTICAL_MAP",

  // Assets
  MANAGE_ARMORY: "MANAGE_ARMORY",
  MANAGE_TREASURY: "MANAGE_TREASURY",
};

export const PERMISSION_LABELS = {
  [PERMISSIONS.MANAGE_ROLES]: "Manage Roles & Permissions",
  [PERMISSIONS.MANAGE_USERS]: "Manage Users",
  [PERMISSIONS.VIEW_ADMIN_PANEL]: "Access Admin Panel",
  [PERMISSIONS.SYSTEM_ADMINISTRATOR]: "System Administrator",
  [PERMISSIONS.CHANGE_USER_RANK]: "Change User Ranks",
  [PERMISSIONS.PROMOTE_TO_VOYAGER]: "Promote to Voyager",
  [PERMISSIONS.PROMOTE_TO_FOUNDER]: "Promote to Founder",
  [PERMISSIONS.PROMOTE_TO_PIONEER]: "Designate Pioneer",
  [PERMISSIONS.GRANT_SYSTEM_ADMIN]: "Grant System Admin Access",
  [PERMISSIONS.MANAGE_NETS]: "Create/Edit Voice Nets",
  [PERMISSIONS.TRANSMIT_AUDIO]: "Transmit on Nets",
  [PERMISSIONS.LISTEN_AUDIO]: "Listen to Nets",
  [PERMISSIONS.VIEW_COMMS_LOGS]: "View Comms Logs",
  [PERMISSIONS.CREATE_EVENT]: "Create Operations/Events",
  [PERMISSIONS.MANAGE_EVENT]: "Manage Active Operations",
  [PERMISSIONS.VIEW_TACTICAL_MAP]: "View Tactical Map",
  [PERMISSIONS.MANAGE_ARMORY]: "Manage Armory/Inventory",
  [PERMISSIONS.MANAGE_TREASURY]: "Manage Treasury/Coffers",
};

export const PERMISSION_CATEGORIES = {
  administrative: {
    label: "Administrative",
    permissions: ["MANAGE_ROLES", "MANAGE_USERS", "VIEW_ADMIN_PANEL", "SYSTEM_ADMINISTRATOR"]
  },
  rankManagement: {
    label: "Rank Management",
    permissions: ["CHANGE_USER_RANK", "PROMOTE_TO_VOYAGER", "PROMOTE_TO_FOUNDER", "PROMOTE_TO_PIONEER", "GRANT_SYSTEM_ADMIN"]
  },
  communications: {
    label: "Communications",
    permissions: ["MANAGE_NETS", "TRANSMIT_AUDIO", "LISTEN_AUDIO", "VIEW_COMMS_LOGS"]
  },
  operations: {
    label: "Operations",
    permissions: ["CREATE_EVENT", "MANAGE_EVENT", "VIEW_TACTICAL_MAP"]
  },
  assets: {
    label: "Assets & Resources",
    permissions: ["MANAGE_ARMORY", "MANAGE_TREASURY"]
  }
};