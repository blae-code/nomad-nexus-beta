import React, { useState } from 'react';
import { createPageUrl } from '@/utils';
import { useCurrentUser } from '@/components/useCurrentUser';
import { canAccessFocusedComms } from '@/components/utils/commsAccessPolicy';
import { COMMS_CHANNEL_TYPES } from '@/components/constants/channelTypes';
import { 
  Home, 
  Calendar, 
  Radio, 
  Users, 
  Map, 
  Box, 
  DollarSign, 
  Settings, 
  Archive, 
  Lock,
  HelpCircle,
  ChevronLeft,
  Activity
} from 'lucide-react';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';

/**
 * SidePanel — Left navigation with permission gating
 * Shows locked state for restricted items with hints
 */
export default function SidePanel({ currentPageName, onToggleCollapse }) {
  const { user } = useCurrentUser();
  const activeOp = useActiveOp();
  const [showAccessModal, setShowAccessModal] = useState(false);

  const navItems = [
    { name: 'Hub', path: 'Hub', icon: Home, requiresAuth: false },
    { name: 'Events', path: 'Events', icon: Calendar, requiresAuth: false },
    { name: 'Comms Console', path: 'CommsConsole', icon: Radio, requiresAuth: false },
    { name: 'User Directory', path: 'UserDirectory', icon: Users, requiresAuth: false },
    { name: 'Universe Map', path: 'UniverseMap', icon: Map, requiresAuth: false },
    { name: 'Fleet Manager', path: 'FleetManager', icon: Box, requiresAuth: false },
    { name: 'Treasury', path: 'Treasury', icon: DollarSign, requiresAuth: false },
    { name: 'Settings', path: 'Settings', icon: Settings, requiresAuth: false },
    { name: 'Recon', path: 'Recon', icon: Archive, requiresAuth: false },
    // ADMIN ONLY
    ...(user?.role === 'admin' ? [
      { name: 'System Admin', path: 'SystemAdmin', icon: Settings, requiresAuth: true },
    ] : []),
  ];

  // Focused Comms gate
  const hasFocusedAccess = canAccessFocusedComms(user, { 
    type: COMMS_CHANNEL_TYPES.FOCUSED, 
    isTemporary: false 
  });

  return (
    <>
      <aside className="w-64 bg-zinc-950/95 border-r-2 border-zinc-800 flex flex-col overflow-hidden">
        {/* Header with Collapse Button */}
        <div className="p-4 border-b-2 border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Nav / Console</h2>
          <button
            onClick={onToggleCollapse}
            className="text-zinc-600 hover:text-orange-500 transition-colors"
            title="Collapse navigation"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Active Op Tile */}
        {activeOp.activeEvent && (
          <div className="p-2 border-b-2 border-zinc-800">
            <div className="bg-orange-500/10 border-2 border-orange-500/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-orange-500 animate-pulse" />
                <span className="text-xs font-black text-orange-400 uppercase tracking-widest">Active Mission</span>
              </div>
              <div className="text-sm font-bold text-white mb-1 truncate uppercase">
                {activeOp.activeEvent.title}
              </div>
              <div className="text-xs text-zinc-400 font-semibold">
                {activeOp.participants.length} PAX
              </div>
              <a
                href={createPageUrl('Events')}
                className="mt-2 block text-xs text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-wide font-bold"
              >
                View Details →
              </a>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.path;
            return (
              <a
                key={item.path}
                href={createPageUrl(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? 'bg-orange-500/20 text-orange-400 border-l-4 border-orange-500'
                    : 'text-zinc-500 hover:bg-zinc-900/80 hover:text-zinc-300 hover:border-l-4 hover:border-zinc-700'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </a>
            );
          })}
        </nav>

        {/* Focused Comms Section */}
        <div className="p-2 border-t border-zinc-800 space-y-2">
          <div
            className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${
              hasFocusedAccess
                ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                : 'bg-zinc-800/30 text-zinc-600 cursor-not-allowed'
            }`}
            title={hasFocusedAccess ? 'Focused channels available' : 'Restricted'}
          >
            <div className="flex items-center gap-2 flex-1">
              <Radio className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-xs font-semibold">Focused</span>
            </div>
            {!hasFocusedAccess && (
              <Lock className="w-3 h-3 flex-shrink-0 ml-2" />
            )}
          </div>

          {!hasFocusedAccess && (
            <button
              onClick={() => setShowAccessModal(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 rounded-lg transition-all"
            >
              <HelpCircle className="w-3 h-3" />
              Request Access
            </button>
          )}
        </div>
      </aside>

      {/* Access Request Modal (Stub) */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-white mb-3">Request Focused Access</h2>
            <p className="text-sm text-zinc-400 mb-4">
              To unlock Focused channels, apply to the organization or request Affiliate/Member status.
            </p>
            <div className="text-xs text-zinc-500 mb-4 p-3 bg-zinc-800/30 rounded">
              <p className="font-semibold mb-1">Current Status:</p>
              <p>Membership: <span className="text-orange-400">{user?.membership || 'GUEST'}</span></p>
            </div>
            <button
              onClick={() => setShowAccessModal(false)}
              className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}