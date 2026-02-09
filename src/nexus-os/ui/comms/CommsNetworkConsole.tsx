import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { buildCommsGraphSnapshot } from '../../services/commsGraphService';
import type { CommsGraphEdge, CommsGraphNode, CommsGraphSnapshot } from '../../services/commsGraphService';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';
import { AnimatedMount, motionTokens, useReducedMotion } from '../motion';
import { PanelLoadingState } from '../loading';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';

interface CommsNetworkConsoleProps extends CqbPanelSharedProps {}

function nodeFill(node: CommsGraphNode): string {
  if (node.type === 'channel') return 'rgba(179,90,47,0.24)';
  if (node.type === 'team') return 'rgba(130,110,94,0.22)';
  return 'rgba(110,110,110,0.22)';
}

function nodeBorder(node: CommsGraphNode): string {
  if (node.type === 'channel') return 'rgba(179,90,47,0.7)';
  if (node.type === 'team') return 'rgba(160,130,110,0.58)';
  return 'rgba(150,150,150,0.5)';
}

export default function CommsNetworkConsole({ variantId, opId, roster }: CommsNetworkConsoleProps) {
  const reducedMotion = useReducedMotion();
  const [snapshot, setSnapshot] = useState<CommsGraphSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [showUsers, setShowUsers] = useState(false);

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
  const nodeMap = useMemo(() => nodes.reduce<Record<string, CommsGraphNode>>((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {}), [nodes]);

  const channels = snapshot?.channels || [];

  if (loading) {
    return <PanelLoadingState label="Loading comms graph..." />;
  }

  if (error || !snapshot) {
    return (
      <DegradedStateCard
        state="OFFLINE"
        reason={error || 'Comms graph data unavailable.'}
        actionLabel="Retry"
        onAction={loadGraph}
      />
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">Comms Network</h3>
          <p className="text-xs text-zinc-500 truncate">Template: {snapshot.templateId}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <NexusButton size="sm" intent={showMonitoring ? 'primary' : 'subtle'} onClick={() => setShowMonitoring((prev) => !prev)}>
            Monitoring
          </NexusButton>
          <NexusButton size="sm" intent={showUsers ? 'primary' : 'subtle'} onClick={() => setShowUsers((prev) => !prev)}>
            Users
          </NexusButton>
          <NexusButton size="sm" intent="subtle" onClick={loadGraph}>
            Refresh
          </NexusButton>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500">
        <NexusBadge tone="active">Channels {channels.length}</NexusBadge>
        <NexusBadge tone="neutral">Nodes {nodes.length}</NexusBadge>
        <NexusBadge tone="neutral">Edges {edges.length}</NexusBadge>
      </div>

      <div className="flex-1 min-h-0 rounded border border-zinc-800 bg-zinc-950/65 p-2 relative overflow-hidden">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {edges.map((edge: CommsGraphEdge) => {
            const source = nodeMap[edge.sourceId];
            const target = nodeMap[edge.targetId];
            if (!source || !target) return null;

            const isMonitoring = edge.type === 'monitoring';
            const visible = isMonitoring ? showMonitoring : true;
            const width = 1 + edge.intensity * 2.2;
            const opacity = visible ? (0.3 + edge.intensity * 0.7) : 0;
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={isMonitoring ? 'rgba(180,150,120,0.62)' : 'rgba(179,90,47,0.72)'}
                strokeWidth={width}
                strokeDasharray={isMonitoring ? '2.5 2.5' : undefined}
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
          const visible = isUser ? showUsers : true;
          const glow = node.intensity > 0 ? 8 + node.intensity * 18 : 0;
          const sizePx = Math.round(26 + node.size * 0.6);

          return (
            <AnimatedMount
              key={node.id}
              show={visible}
              delayMs={index * 10}
              durationMs={reducedMotion ? 0 : motionTokens.duration.fast}
              className="absolute"
            >
              <div
                className="absolute"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: `box-shadow ${reducedMotion ? 0 : motionTokens.duration.fast}ms ${motionTokens.easing.standard}`,
                }}
              >
                <div
                  className="rounded-md border px-2 py-1 text-[10px] text-zinc-100 text-center whitespace-nowrap"
                  style={{
                    minWidth: `${sizePx}px`,
                    background: nodeFill(node),
                    borderColor: nodeBorder(node),
                    boxShadow: glow > 0 ? `0 0 ${glow}px rgba(179,90,47,0.42)` : 'none',
                  }}
                  title={`${node.label}${node.type === 'channel' ? ` • activity ${Math.round(node.intensity * 100)}%` : ''}`}
                >
                  <div className="font-semibold uppercase tracking-wide">{node.label}</div>
                  {node.type === 'channel' ? (
                    <div className="text-[9px] text-zinc-300">{Math.round(node.intensity * 100)}%</div>
                  ) : null}
                </div>
              </div>
            </AnimatedMount>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-auto max-h-32 pr-1">
        {channels.map((channel) => (
          <div key={channel.id} className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 flex items-center justify-between text-xs">
            <span className="text-zinc-200 truncate mr-2">{channel.label}</span>
            <span className="text-zinc-500">{channel.membershipCount} members</span>
          </div>
        ))}
      </div>
    </div>
  );
}

