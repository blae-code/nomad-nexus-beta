/**
 * SystemAdmin — Admin console for operations & maintenance
 * GATED: Admin users only (rank: Founder/Pioneer OR dev flag)
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useCurrentUser } from '@/components/useCurrentUser';
import { 
  Shield,
  AlertTriangle,
  Users,
  Database,
  Zap,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import FactoryReset from '@/components/admin/FactoryReset';
import ImmersiveSeed from '@/components/admin/ImmersiveSeed';
import DataValidation from '@/components/admin/DataValidation';
import DiagnosticsBundle from '@/components/admin/DiagnosticsBundle';

// Dev-only admin override (DISABLED BY DEFAULT)
const DEV_ADMIN_OVERRIDE_ENABLED = false;

export default function SystemAdmin() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useCurrentUser();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          window.location.href = createPageUrl('AccessGate');
          return;
        }

        // Check authorization
        const me = await base44.auth.me();

        // Admin check: user.role === 'admin' OR rank is FOUNDER/PIONEER with dev flag
        const isAdmin =
          me.role === 'admin' ||
          (DEV_ADMIN_OVERRIDE_ENABLED && (me.rank === 'FOUNDER' || me.rank === 'PIONEER'));

        if (!isAdmin) {
          // Redirect unauthorized users
          window.location.href = createPageUrl('Hub');
          return;
        }

        setAuthorized(true);
      } catch (error) {
        window.location.href = createPageUrl('AccessGate');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
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
    { id: 'validation', label: 'Data', icon: Database },
    { id: 'diagnostics', label: 'Diagnostics', icon: Zap },
    { id: 'seed', label: 'Seed', icon: Sparkles },
    { id: 'reset', label: 'Reset', icon: RotateCcw },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl font-black text-white uppercase tracking-widest">
              System Admin
            </h1>
          </div>
          <p className="text-zinc-400 text-sm">
            Authorized user: <span className="font-mono text-orange-400">{user?.callsign}</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap ${
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
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-6">
          {activeTab === 'overview' && <OverviewTab user={user} />}
          {activeTab === 'validation' && <DataValidation />}
          {activeTab === 'diagnostics' && <DiagnosticsBundle />}
          {activeTab === 'seed' && <ImmersiveSeed />}
          {activeTab === 'reset' && <FactoryReset />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ user }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded">
        <h3 className="font-bold text-blue-400 mb-2">Welcome to System Admin</h3>
        <p className="text-sm text-zinc-400">
          This console provides operational maintenance tools for the Nexus system:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded">
          <h4 className="font-bold text-zinc-200 mb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-orange-500" />
            Data Validation
          </h4>
          <p className="text-xs text-zinc-400">
            Inspect all domains, check for orphans, and repair consistency issues.
          </p>
        </div>

        <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded">
          <h4 className="font-bold text-zinc-200 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-500" />
            Diagnostics Bundle
          </h4>
          <p className="text-xs text-zinc-400">
            Export comprehensive system snapshots for debugging and troubleshooting.
          </p>
        </div>

        <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded">
          <h4 className="font-bold text-zinc-200 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Immersive Seed
          </h4>
          <p className="text-xs text-zinc-400">
            Populate demo data for testing. All seeded records can be wiped selectively.
          </p>
        </div>

        <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded">
          <h4 className="font-bold text-zinc-200 mb-2 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-red-500" />
            Factory Reset
          </h4>
          <p className="text-xs text-zinc-400">
            Complete app wipe with multiple safety confirmations. Returns to fresh state.
          </p>
        </div>
      </div>

      <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-orange-400 mb-1">Important</h4>
            <p className="text-xs text-zinc-400">
              Use these tools carefully. Some operations are destructive and cannot be undone.
              Always verify pre-flight summaries before executing critical operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}