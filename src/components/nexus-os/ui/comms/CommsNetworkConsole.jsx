import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Radio, Signal, Zap, User, Circle, Headphones } from 'lucide-react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { NexusBadge, NexusButton } from '../primitives';

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
      const angle = (index / Math.max(1, voiceNets.length)) * Math.PI * 2 - Math.PI / 2;
      const radius = 30;
      return {
        id: net.id || net.code,
        label: net.code || net.label || net.id,
        type: 'voice-net',
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        data: net,
      };
    });

    const rosterNodes = roster.slice(0, 16).map((member, index) => {
      const angle = (index / Math.max(1, roster.length)) * Math.PI * 2 - Math.PI / 2;
      const radius = 15;
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
    <div className="h-full min-h-0 flex flex-col gap-3 bg-zinc-950 p-4">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">Comms Network Topology</h3>
          <p className="text-xs text-zinc-500 truncate">Voice network tactical visualization</p>
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
          Nets {voiceNets.length}
        </NexusBadge>
        <NexusBadge tone="neutral">
          <User className="w-3 h-3 mr-1" />
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

      <div className="flex-1 min-h-0 rounded border border-zinc-800/60 bg-zinc-950 relative overflow-hidden">
        {/* Tactical grid background */}
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: 'linear-gradient(rgba(251,146,60,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.25) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
        
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{
          background: 'linear-gradient(transparent 50%, rgba(251,146,60,0.15) 50%)',
          backgroundSize: '100% 4px',
          animation: 'scan 8s linear infinite'
        }} />

        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
          <defs>
            <filter id="activeGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0.27 0 0 0  0 0 0.27 0 0  0 0 0 1 0" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="pulseGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="netGradient" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(239,68,68,0.4)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0.1)" />
            </radialGradient>
          </defs>

          {/* Connection lines with tactical styling */}
          {links.map((link) => {
            const fromNode = nodes.find((n) => n.id === link.fromId);
            const toNode = nodes.find((n) => n.id === link.toId);
            if (!fromNode || !toNode) return null;

            const isActive = link.type === 'active';
            return (
              <g key={link.id}>
                {/* Glow layer for active links */}
                {isActive && (
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="rgba(239,68,68,0.2)"
                    strokeWidth={2.5}
                    className="transition-all duration-300"
                  />
                )}
                {/* Main connection line */}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={isActive ? 'rgba(239,68,68,0.95)' : 'rgba(113,113,122,0.4)'}
                  strokeWidth={isActive ? 0.5 : 0.25}
                  strokeDasharray={isActive ? '1.5 0.8' : '0.8 1.5'}
                  className="transition-all duration-300"
                  filter={isActive ? 'url(#activeGlow)' : undefined}
                />
              </g>
            );
          })}

          {/* Node rendering with tactical symbols */}
          {nodes.map((node) => {
            const isVoiceNet = node.type === 'voice-net';
            const isActive = node.id === activeVoiceNetId;
            const isSelected = node.id === selectedNodeId;
            const isSpeaking = links.some((l) => l.fromId === node.id && l.type === 'active');

            return (
              <g key={node.id} onClick={() => setSelectedNodeId(node.id)} className="cursor-pointer">
                {/* Outer pulse ring for active states */}
                {(isActive || isSpeaking) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isVoiceNet ? 6 : 4}
                    fill="none"
                    stroke={isActive ? 'rgba(239,68,68,0.5)' : 'rgba(251,146,60,0.4)'}
                    strokeWidth={0.3}
                    opacity={0.6}
                  >
                    <animate
                      attributeName="r"
                      values={isVoiceNet ? "6;7.5;6" : "4;5.5;4"}
                      dur={isSpeaking ? "1.2s" : "2s"}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.2;0.6"
                      dur={isSpeaking ? "1.2s" : "2s"}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isVoiceNet ? 5.5 : 3.5}
                    fill="none"
                    stroke="rgba(251,191,36,0.9)"
                    strokeWidth={0.6}
                    strokeDasharray="1 1"
                  />
                )}

                {/* Main node container */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isVoiceNet ? 4.5 : 2.8}
                  fill={isVoiceNet 
                    ? (isActive ? 'rgba(24,24,27,0.9)' : 'rgba(24,24,27,0.85)')
                    : 'rgba(39,39,42,0.9)'}
                  stroke={isVoiceNet
                    ? (isActive ? 'rgba(239,68,68,0.95)' : 'rgba(251,146,60,0.85)')
                    : (isSpeaking ? 'rgba(239,68,68,0.8)' : 'rgba(113,113,122,0.7)')}
                  strokeWidth={isVoiceNet ? 0.6 : 0.4}
                  className="transition-all duration-300"
                  filter={isActive || isSpeaking ? 'url(#pulseGlow)' : undefined}
                />

                {/* Tactical icon symbols */}
                {isVoiceNet ? (
                  <g>
                    {/* Radio tower symbol */}
                    <rect 
                      x={node.x - 0.4} 
                      y={node.y - 1.2} 
                      width={0.8} 
                      height={2.8} 
                      fill={isActive ? 'rgba(239,68,68,1)' : 'rgba(251,146,60,1)'} 
                      rx={0.1}
                    />
                    <line 
                      x1={node.x - 1.5} 
                      y1={node.y - 0.8} 
                      x2={node.x + 1.5} 
                      y2={node.y - 0.8} 
                      stroke={isActive ? 'rgba(239,68,68,1)' : 'rgba(251,146,60,1)'} 
                      strokeWidth={0.4}
                    />
                    <line 
                      x1={node.x - 1.2} 
                      y1={node.y} 
                      x2={node.x + 1.2} 
                      y2={node.y} 
                      stroke={isActive ? 'rgba(239,68,68,1)' : 'rgba(251,146,60,1)'} 
                      strokeWidth={0.4}
                    />
                    {/* Signal waves */}
                    <path 
                      d={`M ${node.x - 2} ${node.y - 2} Q ${node.x - 2.5} ${node.y - 2.5} ${node.x - 2} ${node.y - 3}`} 
                      stroke={isActive ? 'rgba(239,68,68,0.7)' : 'rgba(251,146,60,0.6)'} 
                      strokeWidth={0.3} 
                      fill="none"
                    />
                    <path 
                      d={`M ${node.x + 2} ${node.y - 2} Q ${node.x + 2.5} ${node.y - 2.5} ${node.x + 2} ${node.y - 3}`} 
                      stroke={isActive ? 'rgba(239,68,68,0.7)' : 'rgba(251,146,60,0.6)'} 
                      strokeWidth={0.3} 
                      fill="none"
                    />
                  </g>
                ) : (
                  <g>
                    {/* Operator avatar symbol */}
                    <circle 
                      cx={node.x} 
                      cy={node.y - 0.5} 
                      r={0.8} 
                      fill={isSpeaking ? 'rgba(239,68,68,0.95)' : 'rgba(161,161,170,0.9)'} 
                    />
                    <path
                      d={`M ${node.x - 1.3} ${node.y + 1.6} Q ${node.x} ${node.y + 0.2} ${node.x + 1.3} ${node.y + 1.6}`}
                      fill={isSpeaking ? 'rgba(239,68,68,0.95)' : 'rgba(161,161,170,0.9)'}
                      stroke="none"
                    />
                    {/* Headset indicator if speaking */}
                    {isSpeaking && (
                      <circle cx={node.x} cy={node.y - 0.5} r={1.2} fill="none" stroke="rgba(239,68,68,0.8)" strokeWidth={0.3} />
                    )}
                  </g>
                )}

                {/* Callsign label with tactical font */}
                <text
                  x={node.x}
                  y={node.y + (isVoiceNet ? 7 : 5)}
                  textAnchor="middle"
                  className="pointer-events-none select-none font-mono"
                  style={{ 
                    fontSize: isVoiceNet ? '2.4px' : '2px',
                    fill: isActive ? 'rgba(239,68,68,1)' : 
                          isSpeaking ? 'rgba(239,68,68,0.9)' :
                          isVoiceNet ? 'rgba(251,146,60,1)' : 'rgba(161,161,170,0.95)',
                    fontWeight: isVoiceNet ? 700 : 600,
                    letterSpacing: '0.08em'
                  }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* HUD overlays */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-orange-500/30 bg-zinc-950/80 backdrop-blur-sm">
            <Circle className="w-2 h-2 text-orange-500 animate-pulse" />
            <span className="text-[9px] font-mono text-orange-400/90 uppercase tracking-wider font-bold">LIVE</span>
          </div>
        </div>
        <div className="absolute top-3 right-3 text-[9px] font-mono text-orange-400/50 uppercase tracking-wider">
          COMMS TOPO
        </div>

        {/* Bottom stats overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950/70 border border-zinc-800/60 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <span className="text-[9px] text-zinc-400 font-mono">Voice Net</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950/70 border border-zinc-800/60 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              <span className="text-[9px] text-zinc-400 font-mono">Operator</span>
            </div>
          </div>
          <div className="px-2 py-0.5 rounded bg-zinc-950/70 border border-zinc-800/60 backdrop-blur-sm">
            <span className="text-[9px] text-zinc-400 font-mono">{nodes.length} nodes · {links.length} links</span>
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="shrink-0 rounded border border-zinc-800/80 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 px-3 py-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {selectedNode.type === 'voice-net' ? (
                <Signal className="w-4 h-4 text-orange-500" />
              ) : (
                <User className="w-4 h-4 text-zinc-400" />
              )}
              <div>
                <div className="text-xs font-semibold text-zinc-100 font-mono uppercase tracking-wide">{selectedNode.label}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
                  {selectedNode.type === 'voice-net' ? 'Voice Net' : 'Operator'}
                </div>
              </div>
            </div>
            {selectedNode.type === 'voice-net' && selectedNode.id === activeVoiceNetId && (
              <NexusBadge tone="active">
                <Zap className="w-3 h-3 mr-1" />
                TX ACTIVE
              </NexusBadge>
            )}
          </div>
        </div>
      )}

      {feedback && (
        <div className="shrink-0 rounded border border-orange-500/40 bg-gradient-to-r from-orange-500/15 to-zinc-950/60 px-3 py-2 backdrop-blur-sm">
          <p className="text-xs text-orange-200 font-mono">{feedback}</p>
        </div>
      )}
    </div>
  );
}