import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';

export default function CommsDiscipline() {
  const voiceNet = useVoiceNet();
  const [showNotice, setShowNotice] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  useEffect(() => {
    const net = voiceNet.voiceNets?.find((n) => n.id === voiceNet.activeNetId);
    if (net?.discipline === 'focused' && !dismissedThisSession) {
      setShowNotice(true);
    } else {
      setShowNotice(false);
    }
  }, [voiceNet.activeNetId, voiceNet.voiceNets, dismissedThisSession]);

  const handleDismiss = () => {
    setShowNotice(false);
    setDismissedThisSession(true);
  };

  if (!showNotice) {
    return null;
  }

  return (
    <div className="mx-4 mt-3 p-3 rounded-md bg-blue-500/10 border border-blue-500/30 space-y-2 animate-in fade-in duration-200">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-blue-300 mb-1">Comms Discipline</h4>
          <p className="text-xs text-blue-200 leading-relaxed">
            You've joined a <strong>Focused comms net</strong>. Keep chatter brief and professional. 
            Use <strong>Casual</strong> nets for general discussion and casual operations.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          onClick={handleDismiss}
        >
          <Check className="w-3 h-3 mr-1" />
          Got it
        </Button>
      </div>
      <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
        <input
          type="checkbox"
          checked={dismissedThisSession}
          onChange={(e) => setDismissedThisSession(e.target.checked)}
          className="w-3 h-3 rounded"
        />
        <span>Don't show again this session</span>
      </label>
    </div>
  );
}