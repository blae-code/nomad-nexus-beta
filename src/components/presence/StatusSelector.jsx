import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthProvider';
import { ChevronDown } from 'lucide-react';

const STATUS_CONFIG = {
  online: { label: 'Online', color: 'bg-green-500', border: 'border-green-500/50' },
  idle: { label: 'Idle', color: 'bg-yellow-500', border: 'border-yellow-500/50' },
  'in-call': { label: 'In Call', color: 'bg-yellow-600', border: 'border-yellow-600/50' },
  transmitting: { label: 'Transmitting', color: 'bg-orange-500', border: 'border-orange-500/50' },
  away: { label: 'Away', color: 'bg-red-500', border: 'border-red-500/50' },
  offline: { label: 'Offline', color: 'bg-zinc-600', border: 'border-zinc-600/50' },
};

export default function StatusSelector({ compact = false }) {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState('online');
  const [showDropdown, setShowDropdown] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load current status on mount
  useEffect(() => {
    const loadStatus = async () => {
      if (!user?.id) return;
      try {
        const records = await base44.entities.UserPresence.filter(
          { member_profile_id: user.id },
          '-created_date',
          1
        );
        if (records?.[0]) {
          setCurrentStatus(records[0].status || 'online');
        }
      } catch (e) {
        console.warn('[Status] Failed to load:', e?.message);
      }
    };
    loadStatus();

    // Subscribe to real-time status updates
    const unsubscribe = base44.entities.UserPresence.subscribe((event) => {
      if (event.data?.member_profile_id === user?.id) {
        setCurrentStatus(event.data.status || 'online');
      }
    });

    return unsubscribe;
  }, [user?.id]);

  const handleStatusChange = async (newStatus) => {
    if (!user?.id) return;
    setCurrentStatus(newStatus);
    setShowDropdown(false);
    setSyncing(true);

    try {
      // Get or create presence record
      const existing = await base44.entities.UserPresence.filter(
        { member_profile_id: user.id },
        '-created_date',
        1
      );

      if (existing?.[0]) {
        await base44.entities.UserPresence.update(existing[0].id, {
          status: newStatus,
          last_activity: new Date().toISOString(),
        });
      } else {
        await base44.entities.UserPresence.create({
          member_profile_id: user.id,
          status: newStatus,
          last_activity: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('[Status] Failed to sync:', e);
      // Revert on error
      setCurrentStatus(currentStatus);
    } finally {
      setSyncing(false);
    }
  };

  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.offline;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-[9px] text-zinc-400">{config.label}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`px-2.5 py-1.5 rounded border ${config.border} bg-black/40 text-[10px] font-semibold text-zinc-200 hover:bg-black/60 transition-colors flex items-center gap-1.5`}
        title="Change your status"
      >
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.label}
        <ChevronDown className="w-3 h-3 text-zinc-600" />
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 w-40 bg-zinc-900/95 border border-red-700/40 rounded-lg shadow-lg z-[1000]">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={syncing}
              className={`w-full px-3 py-2 flex items-center gap-2 text-left text-[9px] font-semibold transition-colors hover:bg-red-950/30 disabled:opacity-50 ${
                currentStatus === status ? 'bg-red-950/50 border-l-2 border-red-500' : 'border-l-2 border-transparent'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
              {cfg.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}