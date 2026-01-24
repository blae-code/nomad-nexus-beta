import React from 'react';
import {
  Activity, MessageSquare, Database, Users, Server, Lock, Key
} from 'lucide-react';

// Section components
import DemoPreflight from '@/components/admin/steps/DemoPreflight';
import CommsTestStep from '@/components/admin/steps/CommsTestStep';
import WipeDataStep from '@/components/admin/steps/WipeDataStep';
import SeedDataStep from '@/components/admin/steps/SeedDataStep';
import GovernanceSection from '@/components/admin/sections/GovernanceSection';
import SystemStatusSection from '@/components/admin/sections/SystemStatusSection';
import PioneerOverridesSection from '@/components/admin/sections/PioneerOverridesSection';
import AccessKeyManager from '@/components/admin/AccessKeyManager';

export const COCKPIT_SECTIONS = [
  {
    id: 'readiness',
    label: 'Readiness / Preflight',
    icon: Activity,
    minRank: 'founder',
    visible: true,
    description: 'System readiness probe, demo checks',
    component: DemoPreflight,
  },
  {
    id: 'comms',
    label: 'Communications',
    icon: MessageSquare,
    minRank: 'founder',
    visible: true,
    description: 'Comms mode, smoke tests, voice config',
    component: CommsTestStep,
  },
  {
    id: 'data',
    label: 'Data (Wipe/Seed)',
    icon: Database,
    minRank: 'founder',
    visible: true,
    description: 'Sample data, data management, cleanup',
    component: WipeDataStep,
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: Users,
    minRank: 'founder',
    visible: true,
    description: 'User ranks, roles, access keys',
    component: GovernanceSection,
  },
  {
    id: 'access-keys',
    label: 'Invite Keys',
    icon: Key,
    minRank: 'founder',
    visible: true,
    description: 'Generate and manage access keys for registration',
    component: AccessKeyManager,
  },
  {
    id: 'system',
    label: 'System Status',
    icon: Server,
    minRank: 'voyager',
    visible: true,
    description: 'Integrations, health, diagnostics',
    component: SystemStatusSection,
  },
  {
    id: 'pioneer-overrides',
    label: 'Pioneer Overrides',
    icon: Lock,
    minRank: 'pioneer',
    visible: true,
    description: 'Sovereign actions (CONFIRM required)',
    component: PioneerOverridesSection,
    collapsed: true,
  },
];

export function hasRank(user, minRank) {
  if (!user) return false;
  const rankHierarchy = ['vagrant', 'scout', 'voyager', 'founder', 'pioneer'];
  const userRank = (user.rank || 'vagrant').toLowerCase();
  const userIndex = rankHierarchy.indexOf(userRank);
  const minIndex = rankHierarchy.indexOf((minRank || 'vagrant').toLowerCase());
  return userIndex >= minIndex;
}