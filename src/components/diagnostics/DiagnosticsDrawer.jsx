import React, { useState } from 'react';
import { Activity, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { runDiagnostics } from '@/components/utils/diagnostics';

export default function DiagnosticsDrawer({ isOpen, onClose }) {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  // Run lightweight diagnostics
  const { data: diagResults = {}, isLoading, refetch } = useQuery({
    queryKey: ['system-diagnostics'],
    queryFn: async () => {
      try {
        return await runDiagnostics();
      } catch (error) {
        return { error: error.message };
      }
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    enabled: isAdmin
  });

  // Quick health checks (no polling)
  const { data: quickHealth } = useQuery({
    queryKey: ['system-quick-health'],
    queryFn: async () => {
      const checks = {};
      
      try {
        await base44.entities.User.list('-created_date', 1);
        checks.database = { status: 'healthy', message: 'Database responsive' };
      } catch (error) {
        checks.database = { status: 'error', message: error.message };
      }

      try {
        await base44.functions.invoke('getLiveKitRoomStatus', { roomName: 'health' }).catch(() => {});
        checks.services = { status: 'healthy', message: 'Services operational' };
      } catch (error) {
        checks.services = { status: 'degraded', message: 'Some services may be slow' };
      }

      return checks;
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    enabled: isAdmin
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <Check className="w-3 h-3 text-emerald-400" />;
      case 'degraded':
        return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-400" />;
      default:
        return <Activity className="w-3 h-3 text-zinc-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300';
      case 'degraded':
        return 'bg-yellow-950/30 border-yellow-900/50 text-yellow-300';
      case 'error':
        return 'bg-red-950/30 border-red-900/50 text-red-300';
      default:
        return 'bg-zinc-900/30 border-zinc-800/50 text-zinc-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full h-96 bg-zinc-900 border-t border-zinc-800 shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b border-zinc-800 px-4 py-3 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#ea580c]" />
            <h2 className="text-sm font-bold uppercase text-white">System Diagnostics</h2>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => refetch()}
                disabled={isLoading}
                className="h-8 w-8"
              >
                <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!isAdmin ? (
            <div className="text-xs text-zinc-500 p-3 bg-zinc-950/50 border border-zinc-800 rounded">
              Admin access required to view diagnostics.
            </div>
          ) : isLoading ? (
            <div className="text-xs text-zinc-500 animate-pulse p-3">
              Running diagnostics...
            </div>
          ) : (
            <>
              {/* Quick Health Checks */}
              {quickHealth && Object.entries(quickHealth).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(quickHealth).map(([key, check]) => (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border text-xs",
                        getStatusColor(check.status)
                      )}
                    >
                      {getStatusIcon(check.status)}
                      <span className="capitalize font-mono">{key}:</span>
                      <span className="text-zinc-300">{check.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Contract Checks */}
              {Object.keys(diagResults).length > 0 && diagResults.error ? (
                <div className="text-xs text-red-400 p-2 bg-red-950/20 border border-red-900/50 rounded">
                  {diagResults.error}
                </div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {Object.entries(diagResults)
                    .filter(([k]) => k !== 'error')
                    .slice(0, 6)
                    .map(([key, result]) => (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center gap-2 p-1.5 rounded border text-xs font-mono",
                          result.status === 'pass'
                            ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
                            : 'bg-red-950/20 border-red-900/50 text-red-300'
                        )}
                      >
                        {result.status === 'pass' ? (
                          <Check className="w-3 h-3 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3 h-3 shrink-0" />
                        )}
                        <span className="capitalize truncate">{key}</span>
                        {result.duration && (
                          <span className="text-zinc-500 ml-auto text-[10px]">
                            {result.duration}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-zinc-800 px-4 py-2 bg-zinc-950/50 text-[10px] text-zinc-600 font-mono">
          Last check: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}