/**
 * Module Development Status Tracker
 * Tracks progress for each Nexus module towards feature completion
 */

export const MODULE_STATUS = {
  MissionControl: {
    name: 'Mission Control',
    completed: 100,
    features: [
      { name: 'Event Management', status: 'complete' },
      { name: 'Tactical Operations Console', status: 'complete' },
      { name: 'Squad Formation & Assignment', status: 'complete' },
      { name: 'Objective Tracking', status: 'complete' },
      { name: 'Operation Reports & AAR', status: 'complete' },
      { name: 'AI Risk Assessment', status: 'complete' },
      { name: 'Resource Management', status: 'complete' },
      { name: 'Automated Post-Event Analysis', status: 'complete' },
      { name: 'Live Position Tracker', status: 'planned' },
      { name: 'Emergency Beacon System', status: 'planned' },
      { name: 'Quick Intel Upload', status: 'planned' },
      { name: 'Hot Role Swap', status: 'planned' },
      { name: 'Pre-Flight Manifest Checklist', status: 'planned' },
      { name: 'Mission Blueprints/Templates', status: 'planned' },
      { name: 'Smart Scheduling (AI)', status: 'planned' },
      { name: 'Performance Analytics Dashboard', status: 'planned' },
      { name: 'Mission Replay/Timeline Viewer', status: 'planned' },
      { name: 'Heat Maps of Active Periods', status: 'planned' },
      { name: '"On This Day" Historical Ops', status: 'planned' },
      { name: 'Operation Participation Badges', status: 'planned' },
      { name: 'Commendations & Recognition', status: 'planned' },
      { name: 'Mission Ribbons/Medals', status: 'planned' },
    ],
  },
  FleetTracking: {
    name: 'Fleet Tracking',
    completed: 100,
    features: [
      { name: 'Live Asset Map', status: 'complete' },
      { name: 'Real-time Location Updates', status: 'complete' },
      { name: 'Asset Status Indicators', status: 'complete' },
      { name: 'Active Operations Integration', status: 'complete' },
      { name: 'Fleet List View', status: 'complete' },
      { name: 'Asset Detail Dashboard', status: 'complete' },
      { name: 'Deployment History', status: 'planned' },
      { name: 'Asset Condition Alerts', status: 'planned' },
    ],
  },
  MemberProgression: {
    name: 'Member Progression',
    completed: 100,
    features: [
      { name: 'Skill Tree Visualization', status: 'complete' },
      { name: 'AI-Powered Skill Assessment', status: 'complete' },
      { name: 'Promotion Recommendations', status: 'complete' },
      { name: 'Automated Promotion Execution', status: 'complete' },
      { name: 'Mentorship Matching', status: 'complete' },
      { name: 'Compatibility Scoring', status: 'complete' },
      { name: 'Progression Analytics', status: 'planned' },
      { name: 'Certification Tracking', status: 'planned' },
    ],
  },
  ReportBuilder: {
    name: 'Report Builder',
    completed: 100,
    features: [
      { name: 'Custom Report Filters', status: 'complete' },
      { name: 'Report Generation Engine', status: 'complete' },
      { name: 'Live Report Preview', status: 'complete' },
      { name: 'PDF Export', status: 'complete' },
      { name: 'CSV Export', status: 'complete' },
      { name: 'Operations Analytics', status: 'complete' },
      { name: 'Member Analytics', status: 'complete' },
      { name: 'Fleet Analytics', status: 'complete' },
      { name: 'Scheduled Report Generation', status: 'planned' },
      { name: 'Email Distribution', status: 'planned' },
      { name: 'Report Templates Library', status: 'planned' },
    ],
  },
  IntelNexus: {
    name: 'Intel Nexus',
    completed: 12,
    features: [
      { name: 'Database Schema', status: 'complete' },
      { name: 'Basic UI Scaffolding', status: 'complete' },
      { name: 'Threat Database & Tracking', status: 'planned' },
      { name: 'Threat Assessment', status: 'planned' },
      { name: 'Intelligence Reports', status: 'planned' },
      { name: 'Analysis Dashboard', status: 'planned' },
      { name: 'Predictive Logistics (AI)', status: 'planned' },
      { name: 'Predictive Models', status: 'planned' },
      { name: 'AI-Suggested Channel Routing', status: 'planned' },
      { name: 'Similar Past Operations Comparison', status: 'planned' },
      { name: 'Resource Allocation Recommendations', status: 'planned' },
      { name: 'Historical Performance Data', status: 'planned' },
    ],
  },
  WarAcademy: {
    name: 'War Academy',
    completed: 18,
    features: [
      { name: 'Training Modules UI', status: 'complete' },
      { name: 'Training Scenario Library', status: 'planned' },
      { name: 'Skill Progression', status: 'planned' },
      { name: 'Certification System', status: 'planned' },
      { name: 'Simulation Engine', status: 'planned' },
      { name: 'Instructor Tools', status: 'planned' },
    ],
  },
  FleetCommand: {
    name: 'Fleet Command',
    completed: 25,
    features: [
      { name: 'Asset Database', status: 'complete' },
      { name: 'Maintenance Tracking', status: 'complete' },
      { name: 'Tactical Map', status: 'in-progress' },
      { name: 'Fleet Scheduler & Reservations', status: 'planned' },
      { name: 'Loadout Library', status: 'planned' },
      { name: 'Engineering Queue', status: 'planned' },
      { name: 'Fleet Analytics', status: 'planned' },
      { name: 'Environmental Awareness (Weather)', status: 'planned' },
      { name: 'Dynamic Backgrounds by Op Phase', status: 'planned' },
      { name: 'Ambient Soundscapes', status: 'planned' },
    ],
  },
  NomadRegistry: {
    name: 'Nomad Registry',
    completed: 30,
    features: [
      { name: 'Member Profiles', status: 'complete' },
      { name: 'Availability Tracking', status: 'complete' },
      { name: 'Reputation System', status: 'planned' },
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
    completed: 20,
    features: [
      { name: 'Treasury System', status: 'complete' },
      { name: 'Marketplace UI', status: 'in-progress' },
      { name: 'Gear Loan Tracker', status: 'planned' },
      { name: 'Supply Chain Dashboard', status: 'planned' },
      { name: 'Emergency Cache System', status: 'planned' },
      { name: 'Commerce Rules Engine', status: 'planned' },
      { name: 'Auction System', status: 'planned' },
      { name: 'Financial Reports', status: 'planned' },
    ],
  },
  CommsConsole: {
    name: 'Comms Array',
    completed: 100,
    features: [
      { name: 'Channel Management', status: 'complete' },
      { name: 'Message System', status: 'complete' },
      { name: 'Voice Integration', status: 'complete' },
      { name: 'Unread Tracking', status: 'complete' },
      { name: 'Poll System', status: 'complete' },
      { name: 'AI Assistant (Riggsy)', status: 'complete' },
      { name: 'Typing Indicators', status: 'complete' },
      { name: 'Last Seen Timestamps', status: 'complete' },
      { name: 'Message Editing & Deletion', status: 'complete' },
      { name: 'Message Reactions', status: 'complete' },
      { name: 'Rich Text & Attachments', status: 'complete' },
      { name: 'Message Threading', status: 'complete' },
      { name: 'Pinned Messages', status: 'complete' },
      { name: 'Direct Messages (1-on-1)', status: 'complete' },
      { name: 'Group Chats', status: 'complete' },
      { name: 'Global Message Search', status: 'complete' },
      { name: 'Mentions Tracking', status: 'complete' },
      { name: 'Notification Settings', status: 'complete' },
      { name: 'Moderation Tools', status: 'complete' },
      { name: 'AI Content Moderation', status: 'complete' },
      { name: 'Real-time Translation', status: 'complete' },
      { name: 'Desktop Notifications', status: 'complete' },
      { name: 'Message Drafts', status: 'complete' },
      { name: 'Emoji Picker', status: 'complete' },
      { name: 'Link Previews', status: 'complete' },
      { name: 'Read Receipts', status: 'complete' },
      { name: 'Discord Bridge Integration', status: 'planned' },
      { name: 'Voice Commands', status: 'planned' },
      { name: 'Keyboard Shortcuts Overlay', status: 'planned' },
      { name: 'Message Scheduling', status: 'planned' },
      { name: 'Sentiment Analysis Dashboard', status: 'planned' },
      { name: 'Video/Audio Messages', status: 'planned' },
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
     { name: 'Login Page Design & Styling', status: 'complete' },
     { name: 'Onboarding Page Design & Styling', status: 'complete' },
     { name: 'Visual Consistency & Animations', status: 'complete' },
   ],
  },
  Settings: {
    name: 'System Admin',
    completed: 100,
    features: [
      { name: 'User Management', status: 'complete' },
      { name: 'Access Key Manager', status: 'complete' },
      { name: 'Access Key Audit Logging', status: 'complete' },
      { name: 'Bulk Key Revocation', status: 'complete' },
      { name: 'Advanced Key Filtering', status: 'complete' },
      { name: 'Data Validation', status: 'complete' },
      { name: 'Diagnostics Bundle', status: 'complete' },
      { name: 'Immersive Seed', status: 'complete' },
      { name: 'Factory Reset', status: 'complete' },
      { name: 'Role-Based Access Control', status: 'complete' },
      { name: 'Admin Authorization Gating', status: 'complete' },
      { name: 'Module Overview Dashboard', status: 'complete' },
      { name: 'Tab Navigation System', status: 'complete' },
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
     { name: 'Module Status Cards', status: 'complete' },
     { name: 'Real-time Status Display', status: 'complete' },
     { name: 'Tactical Overlay Mode', status: 'planned' },
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

export function calculateCompletion(moduleKey) {
  const module = MODULE_STATUS[moduleKey];
  if (!module || !module.features) return 0;

  const completeCount = module.features.filter(f => f.status === 'complete').length;
  const inProgressCount = module.features.filter(f => f.status === 'in-progress').length;

  // Complete features = 100%, In-progress = 50%
  const totalWeight = completeCount + (inProgressCount * 0.5);
  return Math.round((totalWeight / module.features.length) * 100);
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