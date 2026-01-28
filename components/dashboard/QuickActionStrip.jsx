import React from 'react';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Button } from '@/components/ui/button';
import { Radio, Plus, AlertCircle, Power } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function QuickActionStrip() {
  const [user, setUser] = React.useState(null);
  const [availability, setAvailability] = React.useState('available');

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleJoinComms = () => {
    window.location.href = createPageUrl('CommsConsole');
  };

  const handleCreateEvent = () => {
    window.location.href = createPageUrl('Events');
  };

  const handleToggleStatus = async () => {
    const newStatus = availability === 'available' ? 'standby' : 'available';
    setAvailability(newStatus);
    if (user?.id) {
      await base44.auth.updateMe({ availability: newStatus }).catch(() => {});
      toast.success(`STATUS SET TO ${newStatus.toUpperCase()}`);
    }
  };

  const handleDistress = async () => {
    if (user?.id) {
      try {
        await base44.entities.EventLog.create({
          event_id: 'global',
          type: 'RESCUE',
          severity: 'CRITICAL',
          actor_user_id: user.id,
          summary: `DISTRESS SIGNAL FROM ${user.callsign || user.email}`,
          details: { is_distress: true }
        });
        toast.error('DISTRESS SIGNAL TRANSMITTED');
      } catch (err) {
        toast.error('FAILED TO TRANSMIT DISTRESS');
      }
    }
  };

  return (
    <OpsPanel>
      <OpsPanelContent>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleJoinComms}
            className="bg-emerald-900 hover:bg-emerald-800 text-white text-xs h-8 flex items-center justify-center gap-1"
          >
            <Radio className="w-3 h-3" />
            JOIN COMMS
          </Button>

          <Button
            onClick={handleCreateEvent}
            className="bg-blue-900 hover:bg-blue-800 text-white text-xs h-8 flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />
            NEW OP
          </Button>

          <Button
            onClick={handleToggleStatus}
            variant="outline"
            className="text-xs h-8 border-zinc-700 text-zinc-300 hover:text-white"
          >
            <Power className="w-3 h-3 mr-1" />
            {availability.toUpperCase()}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="text-xs h-8 border-red-900/50 text-red-500 hover:bg-red-900/20"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                DISTRESS
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>TRANSMIT DISTRESS SIGNAL?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will alert all command staff. Confirm only if in actual distress.
              </AlertDialogDescription>
              <div className="flex gap-3 justify-end">
                <AlertDialogCancel>CANCEL</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDistress}
                  className="bg-red-900 hover:bg-red-800"
                >
                  CONFIRM
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </OpsPanelContent>
    </OpsPanel>
  );
}