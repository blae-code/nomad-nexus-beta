/**
 * Module Development Status Tracker
 * Tracks progress for each Nexus module towards feature completion
 */

export const MODULE_STATUS = {
  MissionControl: {
    name: 'Mission Control',
    completed: 75,
    features: [
      { name: 'Event Management', status: 'complete' },
      { name: 'Tactical Operations Console', status: 'complete' },
      { name: 'Squad Formation & Assignment', status: 'complete' },
      { name: 'Objective Tracking', status: 'complete' },
      { name: 'Operation Reports & AAR', status: 'complete' },
      { name: 'Mission Replay/Timeline Viewer', status: 'planned' },
      { name: 'Heat Maps of Active Periods', status: 'planned' },
      { name: '"On This Day" Historical Ops', status: 'planned' },
      { name: 'Operation Participation Badges', status: 'planned' },
      { name: 'Commendations & Recognition', status: 'planned' },
      { name: 'Mission Ribbons/Medals', status: 'planned' },
    ],
  },
  IntelNexus: {
    name: 'Intel Nexus',
    completed: 15,
    features: [
      { name: 'Database Schema', status: 'complete' },
      { name: 'Basic UI Scaffolding', status: 'complete' },
      { name: 'Threat Assessment', status: 'planned' },
      { name: 'Intelligence Reports', status: 'planned' },
      { name: 'Analysis Dashboard', status: 'planned' },
      { name: 'Predictive Models', status: 'planned' },
      { name: 'AI-Suggested Channel Routing', status: 'planned' },
      { name: 'Similar Past Operations Comparison', status: 'planned' },
      { name: 'Resource Allocation Recommendations', status: 'planned' },
    ],
  },
  WarAcademy: {
    name: 'War Academy',
    completed: 20,
    features: [
      { name: 'Training Modules UI', status: 'complete' },
      { name: 'Skill Progression', status: 'planned' },
      { name: 'Certification System', status: 'planned' },
      { name: 'Simulation Engine', status: 'planned' },
      { name: 'Instructor Tools', status: 'planned' },
    ],
  },
  FleetCommand: {
    name: 'Fleet Command',
    completed: 30,
    features: [
      { name: 'Asset Database', status: 'complete' },
      { name: 'Maintenance Tracking', status: 'complete' },
      { name: 'Tactical Map', status: 'in-progress' },
      { name: 'Engineering Queue', status: 'planned' },
      { name: 'Fleet Analytics', status: 'planned' },
      { name: 'Environmental Awareness (Weather)', status: 'planned' },
      { name: 'Dynamic Backgrounds by Op Phase', status: 'planned' },
      { name: 'Ambient Soundscapes', status: 'planned' },
    ],
  },
  NomadRegistry: {
    name: 'Nomad Registry',
    completed: 35,
    features: [
      { name: 'Member Profiles', status: 'complete' },
      { name: 'Availability Tracking', status: 'complete' },
      { name: 'Achievements System', status: 'planned' },
      { name: 'Reputation/Reliability Scores', status: 'planned' },
      { name: 'Member Analytics', status: 'planned' },
      { name: 'Mentor/Mentee Relationships', status: 'planned' },
      { name: 'Personal Notes on Operators', status: 'planned' },
      { name: 'Squad Traditions & Rituals', status: 'planned' },
      { name: 'Time in Service Counter', status: 'planned' },
    ],
  },
  TradeNexus: {
    name: 'Trade Nexus',
    completed: 25,
    features: [
      { name: 'Treasury System', status: 'complete' },
      { name: 'Marketplace UI', status: 'in-progress' },
      { name: 'Commerce Rules Engine', status: 'planned' },
      { name: 'Auction System', status: 'planned' },
      { name: 'Financial Reports', status: 'planned' },
    ],
  },
  CommsConsole: {
    name: 'Comms Array',
    completed: 80,
    features: [
      { name: 'Channel Management', status: 'complete' },
      { name: 'Message System', status: 'complete' },
      { name: 'Voice Integration', status: 'complete' },
      { name: 'Unread Tracking', status: 'complete' },
      { name: 'Poll System', status: 'complete' },
      { name: 'AI Assistant (Riggsy)', status: 'complete' },
      { name: 'Typing Indicators', status: 'complete' },
      { name: 'Last Seen Timestamps', status: 'complete' },
      { name: 'Keyboard Shortcuts Overlay', status: 'planned' },
      { name: 'Custom Macro Commands', status: 'planned' },
      { name: 'Pin Favorite Channels', status: 'planned' },
      { name: 'Quick-Switch Last 2 Channels', status: 'planned' },
      { name: 'Sound Effects (Radio Static/Beeps)', status: 'planned' },
      { name: 'Voice Quality Signal Strength', status: 'planned' },
      { name: 'PTT Cooldown Timers', status: 'planned' },
      { name: 'Transmission Logs/Playback', status: 'planned' },
      { name: 'Recent Channels History', status: 'planned' },
      { name: 'Bookmark Messages', status: 'planned' },
    ],
  },
  HighCommand: {
    name: 'High Command',
    completed: 10,
    features: [
      { name: 'Basic UI Scaffolding', status: 'complete' },
      { name: 'Governance Framework', status: 'planned' },
      { name: 'Voting System', status: 'planned' },
      { name: 'Diplomatic Registry', status: 'planned' },
      { name: 'Alliance Management', status: 'planned' },
    ],
  },
  FrontierOps: {
    name: 'Frontier Ops',
    completed: 25,
    features: [
      { name: 'Bounty Board UI', status: 'complete' },
      { name: 'Mission Contracts', status: 'in-progress' },
      { name: 'Exploration Mapping', status: 'planned' },
      { name: 'Territory Claims', status: 'planned' },
      { name: 'Discovery Registry', status: 'planned' },
    ],
  },
  DataVault: {
    name: 'Data Vault',
    completed: 25,
    features: [
      { name: 'Document Storage', status: 'complete' },
      { name: 'Knowledge Base', status: 'complete' },
      { name: 'Search System', status: 'planned' },
      { name: 'Analytics Dashboard', status: 'planned' },
      { name: 'Auto-Archival', status: 'planned' },
      { name: 'Personal Statistics Dashboard', status: 'planned' },
      { name: 'Archive Search with Filters', status: 'planned' },
      { name: 'Export Reports as PDFs', status: 'planned' },
    ],
  },
  NexusTraining: {
    name: 'Nexus Training',
    completed: 10,
    features: [
      { name: 'Tutorial Framework', status: 'planned' },
      { name: 'Interactive Guides', status: 'planned' },
      { name: 'Video Library', status: 'planned' },
      { name: 'Certification Tracking', status: 'planned' },
      { name: 'Feedback System', status: 'planned' },
    ],
  },
  AccessGate: {
    name: 'Access Gate',
    completed: 100,
    features: [
      { name: 'Access Code System', status: 'complete' },
      { name: 'Onboarding Flow', status: 'complete' },
      { name: 'Code Redemption', status: 'complete' },
      { name: 'Member Verification', status: 'complete' },
      { name: 'Admin Provisioning', status: 'complete' },
    ],
  },
  Settings: {
    name: 'System Admin',
    completed: 85,
    features: [
      { name: 'User Management', status: 'complete' },
      { name: 'Access Key Manager', status: 'complete' },
      { name: 'Data Validation', status: 'complete' },
      { name: 'Diagnostics Bundle', status: 'complete' },
      { name: 'Immersive Seed & Factory Reset', status: 'complete' },
      { name: 'Red Alert Mode', status: 'planned' },
      { name: 'Emergency Broadcast System', status: 'planned' },
      { name: 'Encryption Indicators', status: 'planned' },
    ],
  },
  QAConsole: {
    name: 'QA Console',
    completed: 100,
    features: [
      { name: 'Entity Inspector', status: 'complete' },
      { name: 'System Health Checks', status: 'complete' },
      { name: 'Performance Monitor', status: 'complete' },
      { name: 'Logs Viewer', status: 'complete' },
      { name: 'Testing Tools Suite', status: 'complete' },
    ],
  },
  Hub: {
    name: 'Command Hub',
    completed: 75,
    features: [
      { name: 'Module Navigation', status: 'complete' },
      { name: 'Development Roadmap', status: 'complete' },
      { name: 'Boot Sequence', status: 'complete' },
      { name: 'Loading States with Progress Bars', status: 'planned' },
      { name: 'Micro-interactions & Animations', status: 'planned' },
      { name: 'Context-Sensitive Tooltips', status: 'planned' },
      { name: 'Persistent Status Bar Footer', status: 'planned' },
      { name: 'Breadcrumb Navigation', status: 'planned' },
      { name: 'Recent Activity Feed', status: 'planned' },
      { name: 'Engaging Empty State Illustrations', status: 'planned' },
    ],
  },
};

export function getModuleStatus(moduleKey) {
  return MODULE_STATUS[moduleKey] || null;
}

export function getStatusColor(status) {
  switch (status) {
    case 'complete':
      return 'text-green-400';
    case 'in-progress':
      return 'text-orange-400';
    case 'planned':
      return 'text-zinc-500';
    default:
      return 'text-zinc-600';
  }
}

export function getStatusBgColor(status) {
  switch (status) {
    case 'complete':
      return 'bg-green-500/10';
    case 'in-progress':
      return 'bg-orange-500/10';
    case 'planned':
      return 'bg-zinc-800/30';
    default:
      return 'bg-zinc-900';
  }
}