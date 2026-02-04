/**
 * SystemAdmin — Admin console for operations & maintenance
 * GATED: Admin users only (rank: Founder/Pioneer OR dev flag)
 */

import React, { useState } from 'react';
import { createPageUrl, isAdminUser } from '@/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  Shield,
  AlertTriangle,
  Users,
  Database,
  Zap,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FactoryReset from '@/components/admin/FactoryReset';
import ImmersiveSeed from '@/components/admin/ImmersiveSeed';
import DataValidation from '@/components/admin/DataValidation';
import DiagnosticsBundle from '@/components/admin/DiagnosticsBundle';
import UserManagement from '@/components/admin/UserManagement';
import AccessKeyManager from '@/components/admin/AccessKeyManager';
import CommsRoutingRules from '@/components/admin/CommsRoutingRules';
import ChannelPackManager from '@/components/admin/ChannelPackManager';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user: authUser, loading, initialized } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const authorized = initialized && !!authUser && isAdminUser(authUser);

  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">LOADING...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-zinc-400 mb-4">
            System Admin console requires elevated privileges.
          </p>
          <Button onClick={() => (window.location.href = createPageUrl('Hub'))}>
            Return to Hub
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'keys', label: 'Keys', icon: Shield },
    { id: 'routing', label: 'Routing', icon: Target },
    { id: 'packs', label: 'Comms Packs', icon: Radio },
    { id: 'validation', label: 'Data', icon: Database },
    { id: 'diagnostics', label: 'Diagnostics', icon: Zap },
    { id: 'seed', label: 'Seed', icon: Sparkles },
    { id: 'reset', label: 'Reset', icon: RotateCcw },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header - Hub style */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-widest">
                System Admin
              </h1>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold">
                Operations & Maintenance Console
              </p>
            </div>
          </div>
          <p className="text-zinc-400 text-xs ml-13">
            Authorized: <span className="font-mono text-orange-400">{user?.callsign}</span>
          </p>
        </div>

        {activeTab === 'overview' ? (
          <OverviewTab user={user} setActiveTab={setActiveTab} />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-zinc-800/60 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className="flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 text-zinc-500 border-transparent hover:text-zinc-300 transition-all whitespace-nowrap"
              >
                ← Overview
              </button>
              {tabs.slice(1).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'text-orange-400 border-orange-500'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-6 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-full">
                <div className="overflow-x-auto">
                  {activeTab === 'users' && <UserManagement />}
                  {activeTab === 'keys' && <AccessKeyManager />}
                  {activeTab === 'routing' && <CommsRoutingRules />}
                  {activeTab === 'packs' && <ChannelPackManager />}
                  {activeTab === 'validation' && <DataValidation />}
                </div>
                <div className="overflow-x-auto">
                  {activeTab === 'diagnostics' && <DiagnosticsBundle />}
                  {activeTab === 'seed' && <ImmersiveSeed />}
                  {activeTab === 'reset' && <FactoryReset />}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ user, setActiveTab }) {
  const modules = [
    {
      id: 'users',
      icon: Users,
      title: 'User Management',
      description: 'Invite users, assign roles & permissions',
      status: 'PROD',
      color: 'blue',
      features: [
        'Invite new users via email',
        'Assign roles (user or admin)',
        'Edit user names and roles',
        'Disable user accounts',
        'Search and filter users',
        'View user directory with email',
      ],
    },
    {
      id: 'keys',
      icon: Shield,
      title: 'Access Key Manager',
      description: 'Generate & manage access codes',
      status: 'PROD',
      color: 'purple',
      features: [
        'One permanent key per user',
        'Set rank grants (Vagrant → Founder)',
        'Auto-generate Discord invitations',
        'Copy keys to clipboard',
        'Copy formatted messages for Discord',
        'Revoke keys (admins & pioneers)',
        'Track redemption status',
      ],
    },
    {
      id: 'routing',
      icon: Target,
      title: 'Comms Routing',
      description: 'Manage #tag auto-routing rules',
      status: 'BETA',
      color: 'orange',
      features: [
        'Route #ops, #intel, #logi automatically',
        'Set target channels per tag',
        'Edit rule tags and destinations',
        'Fallback to default rules when schema missing',
      ],
    },
    {
      id: 'packs',
      icon: Radio,
      title: 'Channel Packs',
      description: 'Auto-recommend channels by role/rank/squad',
      status: 'BETA',
      color: 'orange',
      features: [
        'Role-based channel recommendations',
        'Rank and membership targeting',
        'Squad pack support',
        'Local fallback if schema missing',
      ],
    },
    {
      id: 'validation',
      icon: Database,
      title: 'Data Validation',
      description: 'Inspect domains & detect anomalies',
      status: 'PROD',
      color: 'orange',
      features: [
        'Count records across 31+ domains',
        'Detect orphaned/invalid records',
        'Export validation reports (JSON)',
        'Dry-run mode for inspection',
        'Domain health indicators',
      ],
    },
    {
      id: 'diagnostics',
      icon: Zap,
      title: 'Diagnostics Bundle',
      description: 'System snapshot for debugging',
      status: 'PROD',
      color: 'cyan',
      features: [
        'Build info & version snapshot',
        'User & authentication state',
        'Shell UI state tracking',
        'Voice net status',
        'Active operation bindings',
        'Domain record counts',
        'Export as text or JSON',
      ],
    },
    {
      id: 'seed',
      icon: Sparkles,
      title: 'Immersive Seed',
      description: 'Populate demo data (Light/Full)',
      status: 'PROD',
      color: 'blue',
      features: [
        'Light Mode: 5 users, 4 nets, 4 channels',
        'Full Mode: events & extended data',
        'Thematic naming aligned to lore',
        'Auto-tagged with seedSetId',
        'Wipe seeded data selectively',
        'Idempotent re-seed',
      ],
    },
    {
      id: 'reset',
      icon: RotateCcw,
      title: 'Factory Reset',
      description: 'Complete app wipe (5-step safety)',
      status: '⚠️ DESTRUCTIVE',
      color: 'red',
      features: [
        'Wipes all 31+ data domains',
        'Clears localStorage keys',
        'Logs out user session',
        'Type "RESET ALL DATA" to confirm',
        'Progress tracking',
        'Auto-reload after completion',
      ],
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50',
      purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/30 hover:border-purple-500/50',
      orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/30 hover:border-orange-500/50',
      cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/30 hover:border-cyan-500/50',
      red: 'from-red-500/10 to-red-600/5 border-red-500/30 hover:border-red-500/50',
    };
    return colors[color] || colors.blue;
  };

  const getIconColor = (color) => {
    const colors = {
      blue: 'text-blue-500',
      purple: 'text-purple-500',
      orange: 'text-orange-500',
      cyan: 'text-cyan-500',
      red: 'text-red-500',
    };
    return colors[color] || colors.blue;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Status Banner */}
        <div className="p-4 bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/30 rounded-lg flex items-start justify-between">
          <div>
            <h3 className="font-bold text-green-400 mb-1 text-sm">✓ System Admin — Feature Complete</h3>
            <p className="text-xs text-zinc-400">
              Full operational console with user & access management, data validation, diagnostics, seeding, and factory reset.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 bg-green-500/20 text-green-300 rounded font-bold flex-shrink-0">100%</span>
        </div>

        {/* Module Grid - Hub style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Tooltip key={module.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setActiveTab(module.id)}
                    className={`group p-5 bg-gradient-to-br ${getColorClasses(
                      module.color
                    )} border rounded-lg transition-all cursor-pointer hover:scale-[1.02] text-left w-full`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-lg bg-zinc-900/50 border border-zinc-700/50 flex items-center justify-center ${getIconColor(module.color)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[9px] font-mono px-2 py-1 rounded font-bold ${
                        module.color === 'red' ? 'bg-red-500/20 text-red-300' : 'bg-zinc-800/50 text-zinc-400'
                      }`}>
                        {module.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-black uppercase text-white mb-1 tracking-wide">
                      {module.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {module.description}
                    </p>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs bg-zinc-950 border-orange-500/40">
                  <div className="text-xs space-y-2">
                    <p className={`font-bold ${getIconColor(module.color)}`}>{module.title}</p>
                    <ul className="text-zinc-300 space-y-1 text-[11px]">
                      {module.features.map((feature, idx) => (
                        <li key={idx}>• {feature}</li>
                      ))}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Warning Banner */}
        <div className="p-4 bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-orange-400 mb-1 text-sm">⚠️ Critical Operations</h4>
              <p className="text-xs text-zinc-400">
                Factory Reset is permanent and cannot be undone. Always export Diagnostics before destructive operations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
