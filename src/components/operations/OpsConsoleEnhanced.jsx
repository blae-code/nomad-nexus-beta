import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/layout/PageLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AlertTriangle, Activity, Users, Map, Radio } from 'lucide-react';
import OpsTimeline from '@/components/operations/panels/OpsTimeline';
import OpsTacticalMap from '@/components/operations/panels/OpsTacticalMap';
import OpsCommsPanel from '@/components/operations/panels/OpsCommsPanel';
import OpsRosterPanel from '@/components/operations/panels/OpsRosterPanel';
import OpsCommandPalette from '@/components/operations/OpsCommandPalette';
import OpsNotificationCenter from '@/components/operations/OpsNotificationCenter';

export default function OpsConsoleEnhanced({ sessionId }) {
  const [user, setUser] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapLayer, setMapLayer] = useState('personnel');
  const queryClient = useQueryClient();

  const notificationCenter = OpsNotificationCenter();
  const { NotificationDisplay } = notificationCenter;

  // Auth
  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.ctrlKey) {
        e.preventDefault();
        // Command palette is handled by component visibility
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch OpsSession
  const { data: session, isLoading, error } = useQuery({
    queryKey: ['ops-session', sessionId],
    queryFn: () => base44.entities.OpsSession.filter({ id: sessionId }),
    staleTime: 5000,
    refetchInterval: 10000
  });

  const opsSession = session?.[0];

  // Real-time subscriptions
  useEffect(() => {
    if (!opsSession) return;

    const unsubOpsLog = base44.entities.OpsSession.subscribe((event) => {
      if (event.id === opsSession.id) {
        queryClient.invalidateQueries({ queryKey: ['ops-session', sessionId] });
        
        // Notify on status changes
        if (event.data?.status !== opsSession.status) {
          notificationCenter.addNotification({
            type: 'alert',
            title: 'STATUS CHANGE',
            message: `Operation status: ${event.data?.status}`,
            autoClose: 3000
          });
        }
      }
    });

    return () => unsubOpsLog?.();
  }, [opsSession?.id, sessionId, notificationCenter]);

  if (isLoading) {
    return (
      <PageLayout title="Ops Console">
        <div className="h-full flex items-center justify-center bg-black">
          <p className="text-sm font-mono text-zinc-500">INITIALIZING CONSOLE...</p>
        </div>
      </PageLayout>
    );
  }

  if (error || !opsSession) {
    return (
      <PageLayout title="Ops Console">
        <div className="h-full flex items-center justify-center bg-black">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-400">Session not found</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const isCommandRole = user?.role === 'admin' || ['Commander', 'XO', 'Comms Officer'].includes(user?.custom_title);
  const isRescueLead = user?.custom_title === 'Rescue Lead';

  return (
    <PageLayout title={`OPS CONSOLE • ${opsSession?.status}`}>
      <div className="h-full overflow-hidden flex gap-1 bg-black p-1">
        {/* LEFT: Op Timeline (20%) */}
        <div className="w-1/5 border border-zinc-800 bg-zinc-950/60 overflow-hidden flex flex-col">
          <div className="px-2 py-1.5 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-zinc-400">
              <Activity className="w-3 h-3" />
              TIMELINE
            </div>
          </div>
          <ScrollArea className="flex-1">
            <OpsTimeline
              session={opsSession}
              user={user}
              onLogEntry={(entry) => {
                base44.entities.OpsSession.update(sessionId, {
                  operation_log: [...(opsSession.operation_log || []), entry]
                });
              }}
            />
          </ScrollArea>
        </div>

        {/* CENTER: Tactical Map (60%) */}
        <div className="flex-1 border border-zinc-800 bg-zinc-950/60 overflow-hidden flex flex-col">
          <div className="px-2 py-1.5 border-b border-zinc-800 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-zinc-400">
              <Map className="w-3 h-3" />
              TACTICAL MAP
            </div>
            <div className="flex items-center gap-1">
              {['personnel', 'squads', 'incidents', 'objectives'].map(layer => (
                <button
                  key={layer}
                  onClick={() => setMapLayer(layer)}
                  className={cn(
                    'px-2 py-1 text-[8px] font-mono uppercase border rounded-none',
                    mapLayer === layer
                      ? 'bg-[#ea580c]/30 border-[#ea580c] text-[#ea580c]'
                      : 'bg-zinc-800/30 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                  )}
                >
                  {layer}
                </button>
              ))}
            </div>
          </div>
          <OpsTacticalMap
            session={opsSession}
            layer={mapLayer}
            selectedMarker={selectedMarker}
            onSelectMarker={setSelectedMarker}
            isCommandRole={isCommandRole}
          />
        </div>

        {/* RIGHT: Comms + Roster (20%) */}
        <div className="w-1/5 border border-zinc-800 bg-zinc-950/60 overflow-hidden flex flex-col">
          <div className="flex h-full gap-1">
            {/* Comms Panel */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-800">
              <div className="px-2 py-1.5 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-zinc-400">
                  <Radio className="w-3 h-3" />
                  COMMS
                </div>
              </div>
              <ScrollArea className="flex-1">
                <OpsCommsPanel
                  session={opsSession}
                  user={user}
                  isCommandRole={isCommandRole}
                />
              </ScrollArea>
            </div>

            {/* Roster Panel */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-2 py-1.5 border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-zinc-400">
                  <Users className="w-3 h-3" />
                  ROSTER
                </div>
              </div>
              <ScrollArea className="flex-1">
                <OpsRosterPanel
                  session={opsSession}
                  user={user}
                  isCommandRole={isCommandRole}
                  isRescueLead={isRescueLead}
                />
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Command Palette & Notifications */}
      <OpsCommandPalette
        session={opsSession}
        user={user}
        onNotification={notificationCenter.addNotification}
        isCommandRole={isCommandRole}
      />
      <NotificationDisplay />

      {/* Keyboard hint */}
      <div className="fixed bottom-4 left-4 text-[8px] text-zinc-600">
        Press <span className="font-mono bg-zinc-800 px-1 py-0.5">Ctrl+Space</span> for commands
      </div>
    </PageLayout>
  );
}