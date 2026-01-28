import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

/**
 * OpsContextStrip: Route-aware operational context display
 * - Events: shows active/selected op name + start time countdown
 * - Comms: shows current net + PTT status
 * - Rescue: shows open distress count
 * - Default: shows "NO ACTIVE OP" + last activity
 * 
 * Single row, text-[10px] mono labels, text-xs values, no animation.
 * Clickable to open diagnostics drawer.
 */

export default function OpsContextStrip({ onDiagnosticsClick }) {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();

  // Determine current page
  const isEventsPage = pathname.includes('/events');
  const isCommsPage = pathname.includes('/comms');
  const isRescuePage = pathname.includes('/rescue');

  // Fetch recent event (if on Events page)
  const { data: recentEvent } = useQuery({
    queryKey: ['recent-event-for-context'],
    queryFn: async () => {
      const events = await base44.entities.Event.list('-updated_date', 1);
      return events[0] || null;
    },
    enabled: isEventsPage,
    staleTime: 30000,
  });

  // Fetch open incidents/rescue cases (if on Rescue page)
  const { data: openIncidents } = useQuery({
    queryKey: ['open-incidents-context'],
    queryFn: async () => {
      const incidents = await base44.entities.Incident.filter(
        { status: { $in: ['active', 'responding'] } },
        '-created_date',
        10
      );
      return incidents || [];
    },
    enabled: isRescuePage,
    staleTime: 15000,
  });

  // Calculate time until event start (if event exists)
  const timeUntilStart = useMemo(() => {
    if (!recentEvent?.start_time) return null;
    const now = new Date();
    const start = new Date(recentEvent.start_time);
    const diff = start.getTime() - now.getTime();
    
    if (diff < 0) return 'IN PROGRESS';
    if (diff < 60000) return `${Math.round(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
    return `${Math.round(diff / 3600000)}h`;
  }, [recentEvent?.start_time]);

  // Render context based on current page
  const renderContext = () => {
    if (isEventsPage) {
      if (recentEvent) {
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0">OP:</span>
            <span className="text-xs font-semibold text-zinc-200 truncate">{recentEvent.title}</span>
            <div className="w-px h-4 bg-zinc-800/50 shrink-0" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0">START:</span>
            <span className="text-xs font-mono text-zinc-300 shrink-0">{timeUntilStart}</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">NO ACTIVE OP</span>
        </div>
      );
    }

    if (isCommsPage) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0">NET:</span>
          <span className="text-xs font-semibold text-blue-300 truncate">MONITORING</span>
          <div className="w-px h-4 bg-zinc-800/50 shrink-0" />
          <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0">PTT:</span>
          <span className="text-xs font-mono text-zinc-400">DISARMED</span>
        </div>
      );
    }

    if (isRescuePage) {
      const openCount = openIncidents?.length || 0;
      return (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0">DISTRESS:</span>
          <span className={cn(
            'text-xs font-semibold',
            openCount > 0 ? 'text-red-400' : 'text-zinc-400'
          )}>
            {openCount} OPEN
          </span>
        </div>
      );
    }

    // Default
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0">STATUS:</span>
        <span className="text-xs font-mono text-zinc-400">IDLE</span>
      </div>
    );
  };

  return (
    <button
      onClick={onDiagnosticsClick}
      className="hidden lg:flex items-center gap-2 px-3 h-10 border border-zinc-800 bg-zinc-900/30 rounded-sm text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50 transition-colors focus-visible:border-[#ea580c]/50 focus-visible:ring-1 focus-visible:ring-[#ea580c]/30 whitespace-nowrap"
      title="Click to view system diagnostics"
    >
      {renderContext()}
    </button>
  );
}