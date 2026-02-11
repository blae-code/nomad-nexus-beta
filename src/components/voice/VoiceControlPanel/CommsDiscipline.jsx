import React from 'react';
import { AlertTriangle, Check, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';

export default function CommsDiscipline() {
  const voiceNet = useVoiceNet();
  const activeMode = voiceNet.disciplineModeByNet?.[voiceNet.transmitNetId] || 'PTT';
  const requestCount = (voiceNet.requestToSpeakByNet?.[voiceNet.transmitNetId] || []).filter((r) => String(r?.status || '').toUpperCase() === 'PENDING').length;

  if (!voiceNet.activeNetId) return null;

  return (
    <div className="mx-4 mt-3 p-3 rounded-md bg-blue-500/10 border border-blue-500/30 space-y-2 animate-in fade-in duration-200">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-blue-300 mb-1">Net Discipline</h4>
          <p className="text-xs text-blue-200 leading-relaxed">
            Mode <strong>{activeMode}</strong> is active on this transmit net.
            {requestCount > 0 ? ` ${requestCount} request-to-speak item(s) pending.` : ' No pending speak requests.'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" className="text-xs" onClick={() => voiceNet.requestToSpeak?.({ reason: 'Requesting transmission window' })}>
          <Radio className="w-3 h-3 mr-1" />
          Request TX
        </Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={() => voiceNet.publishCommandBusAction?.('CLEAR_TO_TRANSMIT', { note: 'Lane clear' })}>
          <Check className="w-3 h-3 mr-1" />
          Clear TX
        </Button>
      </div>
    </div>
  );
}
