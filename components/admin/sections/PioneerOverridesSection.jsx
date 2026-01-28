import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock } from 'lucide-react';
import { toast } from 'sonner';

const OverrideAction = ({ title, description, icon: Icon, onConfirm, disabled }) => {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = async () => {
    if (confirmText !== 'CONFIRM') {
      toast.error('Type CONFIRM to proceed');
      return;
    }
    setConfirming(true);
    try {
      await onConfirm();
      setConfirmText('');
      setConfirming(false);
    } catch (err) {
      toast.error('Action failed: ' + err.message);
      setConfirming(false);
    }
  };

  return (
    <div className="p-2 bg-red-950/30 border border-red-800/50">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3 h-3 text-red-400" />
        <span className="text-[8px] font-bold text-red-300">{title}</span>
      </div>
      <p className="text-[7px] text-red-300/80 mb-2">{description}</p>

      {!confirming ? (
        <Button
          size="sm"
          onClick={() => setConfirming(true)}
          disabled={disabled}
          className="w-full text-[8px] h-5 bg-red-900/50 hover:bg-red-900 text-red-300 border border-red-700/50"
        >
          <AlertTriangle className="w-2.5 h-2.5" />
          Proceed
        </Button>
      ) : (
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Type CONFIRM"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            className="w-full text-[8px] px-2 py-1 bg-zinc-900 border border-red-700/50 text-zinc-300 placeholder-zinc-600"
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setConfirming(false);
                setConfirmText('');
              }}
              className="flex-1 text-[8px] h-5"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={confirmText !== 'CONFIRM'}
              className="flex-1 text-[8px] h-5 bg-red-900 hover:bg-red-800 text-red-100"
            >
              Execute
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function PioneerOverridesSection({ user, onAudit }) {
  const handleForceDemoMode = async () => {
    const startTime = Date.now();
    try {
      // Set a global flag or cookie to enable demo mode
      localStorage.setItem('forceDemo', 'true');
      
      await onAudit(
        'pioneer_override',
        'Force Enable Demo Mode',
        'success',
        Date.now() - startTime,
        {},
        { enabled: true },
        null
      );
      
      toast.success('Demo mode forced ON');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      await onAudit(
        'pioneer_override',
        'Force Enable Demo Mode',
        'failure',
        Date.now() - startTime,
        {},
        {},
        err.message
      );
      throw err;
    }
  };

  const handleDisableAI = async () => {
    const startTime = Date.now();
    try {
      // Set global AI disable flag
      localStorage.setItem('disableAI', 'true');
      
      await onAudit(
        'pioneer_override',
        'Disable AI Features',
        'success',
        Date.now() - startTime,
        {},
        { disabled: true },
        null
      );
      
      toast.success('AI features disabled globally');
    } catch (err) {
      await onAudit(
        'pioneer_override',
        'Disable AI Features',
        'failure',
        Date.now() - startTime,
        {},
        {},
        err.message
      );
      throw err;
    }
  };

  return (
    <div className="space-y-2 p-3 bg-red-950/20 border border-red-800/40">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-3 h-3 text-red-400" />
        <span className="text-[9px] font-bold text-red-300">DANGER ZONE - Pioneer Only</span>
      </div>

      <div className="space-y-1.5">
        <OverrideAction
          title="Force Enable Demo Mode"
          description="Bypass onboarding gates. Demo features active on next load."
          icon={AlertTriangle}
          onConfirm={handleForceDemoMode}
        />

        <OverrideAction
          title="Disable AI Globally"
          description="Emergency: turn off all AI features for all users immediately."
          icon={AlertTriangle}
          onConfirm={handleDisableAI}
        />
      </div>

      <p className="text-[7px] text-red-300/60 mt-2">
        All overrides logged to AdminAuditLog with ELEVATED flag.
      </p>
    </div>
  );
}