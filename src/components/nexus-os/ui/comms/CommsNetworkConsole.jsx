import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Radio, Signal, Zap } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { buildCommsLinks, buildCommsNetNodes } from '../../services/mapCommsOverlayService';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';
import { PanelLoadingState } from '../loading';
import MapStageCanvas from '../map/MapStageCanvas';

function isParticipantSpeaking(participant) {
  if (participant?.isSpeaking) return true;
  const state = String(participant?.state || '').toUpperCase();
  return state.includes('TALK') || state.includes('TX') || state.includes('SPEAK');
}

export default function CommsNetworkConsole({
  variantId,
  opId,
  roster = [],
  events = [],
  actorId,
  locationEstimates = [],
  controlSignals = [],
  operations = [],
  onCreateMacroEvent,
}) {
  const { user } = useAuth();
  const voiceNet = useVoiceNet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showVoiceLinks, setShowVoiceLinks] = useState(true);
  const [showTextLinks, setShowTextLinks] = useState(true);
  const [feedback, setFeedback] = useState('');

  const voiceNets = useMemo(() => (Array.isArray(voiceNet.voiceNets) ? voiceNet.voiceNets : []), [voiceNet.voiceNets]);
  const voiceParticipants = useMemo(
    () => (Array.isArray(voiceNet.participants) ? voiceNet.participants : []),
    [voiceNet.participants]
  );
  const activeSpeakers = useMemo(
    () => voiceParticipants.filter((participant) => isParticipantSpeaking(participant)),
    [voiceParticipants]
  );
  const activeVoiceNetId = String(voiceNet.activeNetId || voiceNet.transmitNetId || '').trim();

  const commsNetNodes = useMemo(
    () => buildCommsNetNodes({ voiceNets, roster, operations, showVoiceLinks, showTextLinks }),
    [voiceNets, roster, operations, showVoiceLinks, showTextLinks]
  );

  const commsLinks = useMemo(
    () => buildCommsLinks({ voiceNets, roster, operations, voiceParticipants, activeVoiceNetId, showVoiceLinks, showTextLinks }),
    [voiceNets, roster, operations, voiceParticipants, activeVoiceNetId, showVoiceLinks, showTextLinks]
  );

  useEffect(() => {
    if (!feedback) return undefined;
    const timerId = window.setTimeout(() => setFeedback(''), 4200);
    return () => window.clearTimeout(timerId);
  }, [feedback]);

  if (loading) {
    return <PanelLoadingState label="Loading comms map..." />;
  }

  if (error) {
    return <DegradedStateCard state="OFFLINE" reason={error} actionLabel="Retry" onAction={() => setError(null)} />;
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">Comms Network Map</h3>
          <p className="text-xs text-zinc-500 truncate">2D tactical communications visualization</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NexusButton size="sm" intent={showVoiceLinks ? 'primary' : 'subtle'} onClick={() => setShowVoiceLinks((prev) => !prev)}>
            <Signal className="w-3.5 h-3.5 mr-1" />
            Voice
          </NexusButton>
          <NexusButton size="sm" intent={showTextLinks ? 'primary' : 'subtle'} onClick={() => setShowTextLinks((prev) => !prev)}>
            <Radio className="w-3.5 h-3.5 mr-1" />
            Text
          </NexusButton>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[11px] shrink-0">
        <NexusBadge tone="active">Voice Nets {voiceNets.length}</NexusBadge>
        <NexusBadge tone="neutral">Roster {roster.length}</NexusBadge>
        <NexusBadge tone={activeSpeakers.length > 0 ? 'warning' : 'neutral'}>
          <Zap className="w-3 h-3 mr-1" />
          Active {activeSpeakers.length}
        </NexusBadge>
        <NexusBadge tone={activeVoiceNetId ? 'active' : 'neutral'}>
          TX {activeVoiceNetId || 'None'}
        </NexusBadge>
      </div>

      <div className="flex-1 min-h-0 relative">
        <MapStageCanvas
          nodes={commsNetNodes}
          edges={[]}
          commsLinks={commsLinks}
          controlSignals={controlSignals}
          locationEstimates={locationEstimates}
          showCommsLayer={true}
          showPresenceLayer={true}
          onNodeClick={(node) => setFeedback(`Selected: ${node.label || node.id}`)}
        />
      </div>

      {feedback && (
        <div className="shrink-0 rounded border border-orange-500/30 bg-orange-500/10 px-3 py-2">
          <p className="text-xs text-orange-200">{feedback}</p>
        </div>
      )}
    </div>
  );
}