import React from 'react';
import { useAlertSimulator } from '@/components/hooks/useAlertSimulator';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * NotificationExample — Demo component for testing notification system
 * Can be added to a page or removed after testing
 */
export default function NotificationExample() {
  const { triggerEventAlert, triggerSystemAlert, triggerSuccessNotif, triggerErrorNotif } = useAlertSimulator();

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg">
        <h3 className="text-sm font-bold text-white mb-4">Notification Examples</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="default" onClick={triggerEventAlert} className="gap-2">
            <AlertCircle className="w-4 h-4" />
            Event Alert
          </Button>
          <Button size="sm" variant="outline" onClick={triggerSystemAlert} className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            System Alert
          </Button>
          <Button size="sm" variant="default" onClick={triggerSuccessNotif} className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Success
          </Button>
          <Button size="sm" variant="destructive" onClick={triggerErrorNotif} className="gap-2">
            <Info className="w-4 h-4" />
            Error
          </Button>
        </div>
      </div>
    </div>
  );
}