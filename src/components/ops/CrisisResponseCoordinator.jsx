import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Phone, Radio, AlertCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CrisisResponseCoordinator() {
  const [user, setUser] = React.useState(null);
  const [alertLevel, setAlertLevel] = React.useState('nominal');

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: distressSignals } = useQuery({
    queryKey: ['distress-signals'],
    queryFn: async () => {
      const logs = await base44.entities.EventLog.filter(
        { type: 'RESCUE', severity: 'CRITICAL' },
        '-timestamp',
        10
      );
      return logs;
    },
    initialData: [],
    refetchInterval: 2000
  });

  const hasActiveDistress = distressSignals.length > 0;

  const handleEmergencyEscalation = async (level) => {
    if (!user) return;
    try {
      setAlertLevel(level);
      await base44.entities.EventLog.create({
        event_id: 'global',
        type: 'SYSTEM',
        severity: level === 'critical' ? 'CRITICAL' : 'HIGH',
        actor_user_id: user.id,
        summary: `ALERT LEVEL ESCALATED TO ${level.toUpperCase()}`,
        details: { escalation_level: level, timestamp: new Date().toISOString() }
      });
      toast.success(`ALERT LEVEL: ${level.toUpperCase()}`);
    } catch (err) {
      toast.error('ESCALATION FAILED');
    }
  };

  const handleGlobalComms = async () => {
    if (!user) return;
    try {
      await base44.entities.EventLog.create({
        event_id: 'global',
        type: 'COMMS',
        severity: 'HIGH',
        actor_user_id: user.id,
        summary: 'ALL NETS ALERT INITIATED',
        details: { broadcast: true, timestamp: new Date().toISOString() }
      });
      toast.success('ALL-NETS ALERT TRANSMITTED');
    } catch (err) {
      toast.error('BROADCAST FAILED');
    }
  };

  const alertLevelColor = {
    nominal: 'border-emerald-900/50 bg-emerald-900/10',
    elevated: 'border-amber-900/50 bg-amber-900/10',
    critical: 'border-red-900/50 bg-red-900/10'
  };

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3" />
          CRISIS RESPONSE
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-3">
        {/* Current Alert Level */}
        <div className={cn('p-3 rounded border', alertLevelColor[alertLevel])}>
          <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
            CURRENT ALERT
          </div>
          <div className="flex items-center justify-between">
            <div className={cn('text-sm font-mono font-black uppercase', {
              'text-emerald-400': alertLevel === 'nominal',
              'text-amber-400': alertLevel === 'elevated',
              'text-red-400': alertLevel === 'critical'
            })}>
              {alertLevel}
            </div>
            {hasActiveDistress && (
              <Badge className="bg-red-900 text-red-200 text-[8px]">
                {distressSignals.length} DISTRESS
              </Badge>
            )}
          </div>
        </div>

        {/* Distress Signals */}
        {hasActiveDistress && (
          <div className="p-2 bg-red-900/10 border border-red-900/30 rounded space-y-1">
            <div className="text-[9px] font-bold text-red-400 uppercase">ACTIVE DISTRESS SIGNALS</div>
            {distressSignals.slice(0, 3).map((signal, idx) => (
              <div key={idx} className="text-[8px] text-red-300 line-clamp-1">
                • {signal.summary}
              </div>
            ))}
          </div>
        )}

        {/* Response Actions */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">QUICK RESPONSE</div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleEmergencyEscalation('elevated')}
              variant="outline"
              className="text-xs h-7 border-amber-900/50 text-amber-500 hover:bg-amber-900/20"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              ELEVATED
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="text-xs h-7 bg-red-900 hover:bg-red-800 text-white"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  CRITICAL
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogTitle>ESCALATE TO CRITICAL?</AlertDialogTitle>
                <AlertDialogDescription>
                  All available assets will be mobilized. Command staff will be notified.
                </AlertDialogDescription>
                <div className="flex gap-3 justify-end">
                  <AlertDialogCancel>CANCEL</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleEmergencyEscalation('critical')}
                    className="bg-red-900 hover:bg-red-800"
                  >
                    CONFIRM
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Button
            onClick={handleGlobalComms}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white text-xs h-7"
          >
            <Radio className="w-3 h-3 mr-1" />
            ALL-NETS ALERT
          </Button>
        </div>
      </OpsPanelContent>
    </OpsPanel>
  );
}