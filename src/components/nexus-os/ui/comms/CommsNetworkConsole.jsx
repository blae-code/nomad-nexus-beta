import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Radio, Signal, Zap, RefreshCcw } from 'lucide-react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { NexusBadge, NexusButton } from '../primitives';
import { PanelLoadingState } from '../loading';

function isParticipantSpeaking(participant) {
  if (participant?.isSpeaking) return true;
  const state = String(participant?.state || '').toUpperCase();
  return state.includes('TALK') || state.includes('TX') || state.includes('SPEAK');
}

export default function CommsNetworkConsole({
  roster = [],
  operations = [],
  onClose,
}) {
  const voiceNet = useVoiceNet();
  const [feedback, setFeedback] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);

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

  const nodes = useMemo(() => {
    const netNodes = voiceNets.map((net, index) => {
      const angle = (index / voiceNets.length) * Math.PI * 2;
      const radius = 35;
      return {
        id: net.id || net.code,
        label: net.code || net.label || net.id,
        type: 'voice-net',
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        data: net,
      };
    });

    const rosterNodes = roster.slice(0, 12).map((member, index) => {
      const angle = (index / roster.length) * Math.PI * 2;
      const radius = 20;
      return {
        id: member.id,
        label: member.callsign || member.id,
        type: 'member',
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        data: member,
      };
    });

    return [...netNodes, ...rosterNodes];
  }, [voiceNets, roster]);

  const links = useMemo(() => {
    const result = [];
    
    voiceParticipants.forEach((participant) => {
      const participantId = participant.userId || participant.id;
      const netId = participant.netId || activeVoiceNetId;
      
      if (!participantId || !netId) return;
      
      const fromNode = nodes.find((n) => n.id === participantId);
      const toNode = nodes.find((n) => n.id === netId);
      
      if (fromNode && toNode) {
        result.push({
          id: `${participantId}-${netId}`,
          fromId: participantId,
          toId: netId,
          type: isParticipantSpeaking(participant) ? 'active' : 'idle',
          intensity: isParticipantSpeaking(participant) ? 1 : 0.3,
        });
      }
    });

    return result;
  }, [nodes, voiceParticipants, activeVoiceNetId]);

  useEffect(() => {
    if (!feedback) return undefined;
    const timerId = window.setTimeout(() => setFeedback(''), 4200);
    return () => window.clearTimeout(timerId);
  }, [feedback]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="h-full min-h-0 flex flex-col gap-2 bg-zinc-950 p-4">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">Comms Network Map</h3>
          <p className="text-xs text-zinc-500 truncate">Voice network topology visualization</p>
        </div>
        {onClose && (
          <NexusButton size="sm" intent="subtle" onClick={onClose}>
            Close
          </NexusButton>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[11px] shrink-0">
        <NexusBadge tone="active">
          <Signal className="w-3 h-3 mr-1" />
          Voice Nets {voiceNets.length}
        </NexusBadge>
        <NexusBadge tone="neutral">
          <Radio className="w-3 h-3 mr-1" />
          Roster {roster.length}
        </NexusBadge>
        <NexusBadge tone={activeSpeakers.length > 0 ? 'warning' : 'neutral'}>
          <Zap className="w-3 h-3 mr-1" />
          Active {activeSpeakers.length}
        </NexusBadge>
        <NexusBadge tone={activeVoiceNetId ? 'active' : 'neutral'}>
          TX {activeVoiceNetId || 'None'}
        </NexusBadge>
      </div>

      <div className="flex-1 min-h-0 rounded border border-zinc-800 bg-zinc-950/80 relative overflow-hidden">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
          {/* Links */}
          {links.map((link) => {
            const fromNode = nodes.find((n) => n.id === link.fromId);
            const toNode = nodes.find((n) => n.id === link.toId);
            if (!fromNode || !toNode) return null;

            return (
              <line
                key={link.id}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={link.type === 'active' ? 'rgba(239,68,68,0.8)' : 'rgba(113,113,122,0.4)'}
                strokeWidth={link.type === 'active' ? 2 : 1}
                strokeDasharray={link.type === 'active' ? undefined : '2 2'}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isVoiceNet = node.type === 'voice-net';
            const isActive = node.id === activeVoiceNetId;
            const isSelected = node.id === selectedNodeId;
            const radius = isVoiceNet ? 3.5 : 2;
            const fill = isVoiceNet 
              ? (isActive ? 'rgba(239,68,68,0.9)' : 'rgba(251,146,60,0.7)')
              : 'rgba(113,113,122,0.6)';
            const stroke = isSelected ? 'rgba(251,191,36,1)' : isVoiceNet ? 'rgba(251,146,60,0.9)' : 'rgba(161,161,170,0.8)';

            return (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isSelected ? 0.8 : 0.4}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedNodeId(node.id)}
                />
                <text
                  x={node.x}
                  y={node.y - radius - 1.5}
                  textAnchor="middle"
                  className="text-[3px] fill-zinc-300 pointer-events-none select-none"
                  style={{ fontSize: '3px' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode && (
        <div className="shrink-0 rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-zinc-100">{selectedNode.label}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
                {selectedNode.type === 'voice-net' ? 'Voice Net' : 'Member'}
              </div>
            </div>
            {selectedNode.type === 'voice-net' && selectedNode.id === activeVoiceNetId && (
              <NexusBadge tone="active">TRANSMITTING</NexusBadge>
            )}
          </div>
        </div>
      )}

      {feedback && (
        <div className="shrink-0 rounded border border-orange-500/30 bg-orange-500/10 px-3 py-2">
          <p className="text-xs text-orange-200">{feedback}</p>
        </div>
      )}
    </div>
  );
}