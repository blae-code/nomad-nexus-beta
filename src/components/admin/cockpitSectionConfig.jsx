import React from 'react';
import {
  Activity, MessageSquare, Database, Users, Server, AlertTriangle, Lock
} from 'lucide-react';

// Section components (lazy imports to avoid circular deps)
import SchemaCheckStep from '@/components/admin/steps/SchemaCheckStep';
import WipeDataStep from '@/components/admin/steps/WipeDataStep';
import SeedDataStep from '@/components/admin/steps/SeedDataStep';
import CommsTestStep from '@/components/admin/steps/CommsTestStep';
import CommsModeControl from '@/components/admin/CommsModeControl';

export const COCKPIT_SECTIONS = [
  {
    id: 'readiness',
    label: 'Readiness / Preflight',
    icon: Activity,
    minRank: 'founder',
    visible: true,
    description: 'Schema checks, system probes, demo readiness',
    component: SchemaCheckStep,
  },
  {
    id: 'comms',
    label: 'Communications',
    icon: MessageSquare,
    minRank: 'founder',
    visible: true,
    description: 'Voice nets, comms mode, smoke tests',
    component: CommsModeControl,
  },
  {
    id: 'data',
    label: 'Data (Wipe/Seed/Integrity)',
    icon: Database,
    minRank: 'founder',
    visible: true,
    description: 'Data management, sample scenarios, cleanup',
    component: WipeDataStep,
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: Users,
    minRank: 'founder',
    visible: true,
    description: 'User ranks, roles, access keys, policies',
    component: null,
  },
  {
    id: 'system',
    label: 'System Status',
    icon: Server,
    minRank: 'voyager',
    visible: true,
    description: 'Integrations, diagnostics, health metrics',
    component: null,
  },
  {
    id: 'pioneer-overrides',
    label: 'Pioneer Overrides',
    icon: Lock,
    minRank: 'pioneer',
    visible: true,
    description: 'Sovereign actions, danger zone (confirm required)',
    component: null,
    collapsed: true, // Collapsed by default
  },
];

export function hasRank(user, minRank) {
  if (!user) return false;
  const rankHierarchy = {
    'pioneer': 4,
    'founder': 3,
    'voyager': 2,
    'scout': 1
  };
  const userRank = rankHierarchy[user.rank?.toLowerCase()] || (user.role === 'admin' ? 3 : 0);
  const requiredRank = rankHierarchy[minRank?.toLowerCase()] || 0;
  return userRank >= requiredRank;
}