/**
 * Module Development Status Tracker
 * Tracks progress for each Nexus module towards feature completion
 */

export const MODULE_STATUS = {
  MissionControl: {
    name: 'Mission Control',
    completed: 35,
    features: [
      { name: 'Event Planning UI', status: 'complete' },
      { name: 'Participant Management', status: 'in-progress' },
      { name: 'Real-time War Room', status: 'planned' },
      { name: 'Briefing Templates', status: 'planned' },
      { name: 'Debrief Analytics', status: 'planned' },
    ],
  },
  IntelNexus: {
    name: 'Intel Nexus',
    completed: 20,
    features: [
      { name: 'Database Schema', status: 'complete' },
      { name: 'Threat Assessment', status: 'planned' },
      { name: 'Intelligence Reports', status: 'planned' },
      { name: 'Analysis Dashboard', status: 'planned' },
      { name: 'Predictive Models', status: 'planned' },
    ],
  },
  WarAcademy: {
    name: 'War Academy',
    completed: 30,
    features: [
      { name: 'Training Modules UI', status: 'complete' },
      { name: 'Skill Progression', status: 'in-progress' },
      { name: 'Certification System', status: 'planned' },
      { name: 'Simulation Engine', status: 'planned' },
      { name: 'Instructor Tools', status: 'planned' },
    ],
  },
  FleetCommand: {
    name: 'Fleet Command',
    completed: 40,
    features: [
      { name: 'Asset Database', status: 'complete' },
      { name: 'Tactical Map', status: 'in-progress' },
      { name: 'Maintenance Tracking', status: 'complete' },
      { name: 'Engineering Queue', status: 'planned' },
      { name: 'Fleet Analytics', status: 'planned' },
    ],
  },
  NomadRegistry: {
    name: 'Nomad Registry',
    completed: 45,
    features: [
      { name: 'Member Profiles', status: 'complete' },
      { name: 'Availability Tracking', status: 'complete' },
      { name: 'Achievements System', status: 'in-progress' },
      { name: 'Reputation Scores', status: 'planned' },
      { name: 'Member Analytics', status: 'planned' },
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
    name: 'Comms Central',
    completed: 55,
    features: [
      { name: 'Channel Management', status: 'complete' },
      { name: 'Message System', status: 'complete' },
      { name: 'Voice Integration', status: 'in-progress' },
      { name: 'Broadcast System', status: 'planned' },
      { name: 'Comms Analytics', status: 'planned' },
    ],
  },
  HighCommand: {
    name: 'High Command',
    completed: 15,
    features: [
      { name: 'Governance Framework', status: 'planned' },
      { name: 'Voting System', status: 'planned' },
      { name: 'Diplomatic Registry', status: 'planned' },
      { name: 'Alliance Management', status: 'planned' },
      { name: 'Policy Documents', status: 'planned' },
    ],
  },
  FrontierOps: {
    name: 'Frontier Ops',
    completed: 20,
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
    completed: 35,
    features: [
      { name: 'Document Storage', status: 'complete' },
      { name: 'Knowledge Base', status: 'complete' },
      { name: 'Search System', status: 'in-progress' },
      { name: 'Analytics Dashboard', status: 'planned' },
      { name: 'Auto-Archival', status: 'planned' },
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
    completed: 80,
    features: [
      { name: 'Access Code System', status: 'complete' },
      { name: 'Onboarding Flow', status: 'complete' },
      { name: 'Code Redemption', status: 'complete' },
      { name: 'Member Verification', status: 'complete' },
      { name: 'Admin Provisioning', status: 'in-progress' },
    ],
  },
  Settings: {
    name: 'System Admin',
    completed: 100,
    features: [
      { name: 'User Management', status: 'complete' },
      { name: 'Access Key Manager', status: 'complete' },
      { name: 'Data Validation', status: 'complete' },
      { name: 'Diagnostics Bundle', status: 'complete' },
      { name: 'Immersive Seed & Factory Reset', status: 'complete' },
    ],
  },
  QAConsole: {
    name: 'QA Console',
    completed: 5,
    features: [
      { name: 'QA Tools Framework', status: 'planned' },
      { name: 'Test Triggers', status: 'planned' },
      { name: 'Data Generators', status: 'planned' },
      { name: 'System Monitoring', status: 'planned' },
      { name: 'Debug Dashboard', status: 'planned' },
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