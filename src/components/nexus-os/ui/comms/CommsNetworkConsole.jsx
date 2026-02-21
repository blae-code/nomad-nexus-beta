import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GitBranch, Mic, Plus, Radio, RefreshCcw, Signal, Users, Zap } from 'lucide-react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { buildCommsGraphSnapshot } from '../../services/commsGraphService';
import type { CommsGraphEdge, CommsGraphNode, CommsGraphSnapshot } from '../../services/commsGraphService';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';
import { AnimatedMount, motionTokens, useReducedMotion } from '../motion';
import { PanelLoadingState } from '../loading';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';

interface CommsNetworkConsoleProps extends CqbPanelSharedProps {}

function nodeFill(node: CommsGraphNode): string {
  if (node.type === 'channel') return 'rgba(34,197,94,0.15)';
  if (node.type === 'voice') return 'rgba(59,130,246,0.15)';
  if (node.type === 'user') return 'rgba(139,92,246,0.12)';
  return 'rgba(110,110,110,0.12)';
}

function nodeBorder(node: CommsGraphNode): string {
  if (node.type === 'channel') return 'rgba(34,197,94,0.6)';
  if (node.type === 'voice') return 'rgba(59,130,246,0.6)';
  if (node.type === 'user') return 'rgba(139,92,246,0.5)';
  return 'rgba(150,150,150,0.4)';
}

export default function CommsNetworkConsole({
  variantId,
  opId,
  roster,
}: CommsNetworkConsoleProps) {
  const reducedMotion = useReducedMotion();
  const voiceNet = useVoiceNet() as any;
  const [snapshot, setSnapshot] = useState<CommsGraphSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [showVoiceNets, setShowVoiceNets] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await buildCommsGraphSnapshot({
        variantId,
        opId,
        includeUserNodes: showUsers,
        roster,
      });
      setSnapshot(next);
    } catch (err: any) {
      setError(err?.message || 'Failed to load comms graph.');
    } finally {
      setLoading(false);
    }
  }, [variantId, opId, showUsers, roster]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const nodes = snapshot?.nodes || [];
  const edges = snapshot?.edges || [];
  const nodeMap = useMemo(
    () =>
      nodes.reduce<Record<string, CommsGraphNode>>((acc, node) => {
        acc[node.id] = node;
        return acc;
      }, {}),
    [nodes]
  );

  const voiceNets = useMemo(() => (Array.isArray(voiceNet.voiceNets) ? voiceNet.voiceNets : []), [voiceNet.voiceNets]);
  const voiceParticipants = useMemo(
    () => (Array.isArray(voiceNet.participants) ? voiceNet.participants : []),
    [voiceNet.participants]
  );

  const selectedNode = selectedNodeId ? nodeMap[selectedNodeId] : null;

  if (loading) {
    return <PanelLoadingState label="Loading comms network..." />;
  }

  if (error || !snapshot) {
    return <DegradedStateCard state="OFFLINE" reason={error || 'Comms graph data unavailable.'} actionLabel="Retry" onAction={loadGraph} />;
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2">
      <header className="flex items-center justify-between gap-2 px-2 py-2 border-b border-zinc-700/40">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 truncate">Comms Network Map</h3>
          <p className="text-[10px] text-zinc-500">Visual topology · Drag to reposition · Click to connect</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <NexusBadge tone="neutral">{nodes.length} nodes</NexusBadge>
          <NexusBadge tone="neutral">{edges.length} links</NexusBadge>
          <NexusButton size="sm" intent={showVoiceNets ? 'primary' : 'subtle'} onClick={() => setShowVoiceNets((prev) => !prev)}>
            <Radio className="w-3 h-3" />
          </NexusButton>
          <NexusButton size="sm" intent={showUsers ? 'primary' : 'subtle'} onClick={() => setShowUsers((prev) => !prev)}>
            <Users className="w-3 h-3" />
          </NexusButton>
          <NexusButton size="sm" intent="subtle" onClick={loadGraph}>
            <RefreshCcw className="w-3 h-3" />
          </NexusButton>
        </div>
      </header>

      <section className="flex-1 min-h-0 rounded border border-zinc-700/40 bg-gradient-to-br from-zinc-900/50 to-zinc-950/80 relative overflow-hidden">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(113,113,122,0.1)" strokeWidth="0.15" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {edges.map((edge: CommsGraphEdge) => {
            const source = nodeMap[edge.sourceId];
            const target = nodeMap[edge.targetId];
            if (!source || !target) return null;

            const isMonitoring = edge.type === 'monitoring';
            const visible = isMonitoring ? showMonitoring : true;
            const width = 0.5 + edge.intensity * 1.5;
            const opacity = visible ? 0.25 + edge.intensity * 0.6 : 0;
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isMonitoring ? 'rgba(139,92,246,0.5)' : 'rgba(34,197,94,0.6)'}
                strokeWidth={width}
                strokeDasharray={isMonitoring ? '1.5 1.5' : undefined}
                style={{
                  opacity,
                  transition: `opacity ${reducedMotion ? 0 : motionTokens.duration.fast}ms ${motionTokens.easing.standard}`,
                }}
              />
            );
          })}
        </svg>

        {nodes.map((node, index) => {
          const isUser = node.type === 'user';
          const isVoice = node.type === 'voice';
          const visible = (isUser && showUsers) || (isVoice && showVoiceNets) || (!isUser && !isVoice);
          const glow = node.intensity > 0 ? 6 + node.intensity * 14 : 0;
          const sizePx = Math.round(24 + node.size * 0.5);
          const isSelected = selectedNodeId === node.id;

          return (
            <AnimatedMount
              key={node.id}
              show={visible}
              delayMs={index * 8}
              durationMs={reducedMotion ? 0 : motionTokens.duration.fast}
              className="absolute"
            >
              <button
                type="button"
                className="absolute cursor-pointer group"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: `box-shadow ${reducedMotion ? 0 : motionTokens.duration.fast}ms ${motionTokens.easing.standard}`,
                }}
                onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                title={`${node.label}${node.type === 'channel' || node.type === 'voice' ? ` · activity ${Math.round(node.intensity * 100)}%` : ''}`}
              >
                <div
                  className={`rounded border px-2 py-1 text-[9px] text-zinc-100 text-center whitespace-nowrap transition-all ${
                    isSelected ? 'ring-2 ring-orange-500/60' : 'hover:ring-1 hover:ring-zinc-500/40'
                  }`}
                  style={{
                    minWidth: `${sizePx}px`,
                    background: nodeFill(node),
                    borderColor: nodeBorder(node),
                    boxShadow: glow > 0 ? `0 0 ${glow}px ${isVoice ? 'rgba(59,130,246,0.4)' : 'rgba(34,197,94,0.35)'}` : 'none',
                  }}
                >
                  <div className="font-bold uppercase tracking-wide flex items-center justify-center gap-1">
                    {isVoice ? <Signal className="w-2.5 h-2.5" /> : node.type === 'user' ? <Users className="w-2.5 h-2.5" /> : <GitBranch className="w-2.5 h-2.5" />}
                    {node.label}
                  </div>
                  {(node.type === 'channel' || node.type === 'voice') && node.intensity > 0 ? (
                    <div className="text-[8px] text-zinc-300">{Math.round(node.intensity * 100)}%</div>
                  ) : null}
                </div>
              </button>
            </AnimatedMount>
          );
        })}
      </section>

      {selectedNode ? (
        <footer className="px-2 py-2 border-t border-zinc-700/40 bg-zinc-900/40">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-100">{selectedNode.label}</div>
              <div className="text-[9px] text-zinc-500">
                Type: {selectedNode.type} · Activity: {Math.round(selectedNode.intensity * 100)}%
              </div>
            </div>
            <NexusButton size="sm" intent="subtle" onClick={() => setSelectedNodeId(null)}>
              Close
            </NexusButton>
          </div>
        </footer>
      ) : (
        <footer className="px-2 py-1.5 border-t border-zinc-700/40 bg-zinc-900/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <NexusBadge tone="ok">
              <Signal className="w-3 h-3 mr-1" />
              {voiceNets.length} voice nets
            </NexusBadge>
            <NexusBadge tone="neutral">
              <Users className="w-3 h-3 mr-1" />
              {voiceParticipants.length} participants
            </NexusBadge>
          </div>
          <div className="text-[9px] text-zinc-500">Click nodes to inspect · Drag to reposition</div>
        </footer>
      )}
    </div>
  );
}