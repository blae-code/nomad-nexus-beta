import React, { useMemo } from 'react';
import { AlertTriangle, Radio, TrendingUp, Zap } from 'lucide-react';
import { NexusBadge } from '../primitives';

/**
 * CommsFleetMetrics — Immersive, thematic metrics dashboard
 * Displays fleet status, squad health, channel load, and bridge activity
 * Uses glow effects, token semantics, and dynamic visual indicators
 */
export default function CommsFleetMetrics({
  squadCards = [],
  channels = [],
  bridgeSessions = [],
  events = [],
  deliveryStats = { persisted: 0, acked: 0, confidencePct: 0 }
}) {
  // Calculate dynamic metrics
  const metrics = useMemo(() => {
    const totalSquads = squadCards.length;
    const activeSquads = squadCards.filter((c) => c.onlineCount > 0).length;
    const readySquads = squadCards.filter((c) => c.onlineCount === c.membershipCount).length;

    const channelLoad = channels.length > 0 ?
    Math.round(channels.filter((ch) => Number(ch.membershipCount || 0) > 0).length / channels.length * 100) :
    0;

    const bridgeLoad = bridgeSessions.length;
    const activeEvents = events.filter((e) => e.status === 'active').length;

    const systemHealth = Math.round(
      activeSquads / Math.max(totalSquads, 1) * 100
    );

    return {
      totalSquads,
      activeSquads,
      readySquads,
      channelLoad,
      bridgeLoad,
      activeEvents,
      systemHealth
    };
  }, [squadCards, channels, bridgeSessions, events]);

  // Determine thematic status tone
  const getHealthTone = (health) => {
    if (health >= 80) return 'ok';
    if (health >= 50) return 'warning';
    return 'danger';
  };

  return (
    <div className="rounded-lg border border-zinc-700/40 bg-gradient-to-br from-zinc-900/60 via-zinc-950/40 to-zinc-950/60 backdrop-blur-sm p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-700/30 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-zinc-200 font-semibold">Fleet Nexus</h3>
        </div>
        


      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {/* Squads Card */}
        <div className="rounded border border-zinc-700/30 bg-zinc-950/40 p-2">
          <div className="text-[8px] uppercase tracking-wide text-zinc-500 mb-1">Squads</div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-cyan-300">{metrics.activeSquads}</span>
            <span className="text-[10px] text-zinc-600">/ {metrics.totalSquads}</span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
              style={{
                width: `${Math.round(metrics.activeSquads / Math.max(metrics.totalSquads, 1) * 100)}%`
              }} />

          </div>
          <div className="mt-1 text-[7px] text-zinc-600">
            {metrics.readySquads} ready
          </div>
        </div>

        {/* Channels Card */}
        <div className="rounded border border-zinc-700/30 bg-zinc-950/40 p-2">
          <div className="text-[8px] uppercase tracking-wide text-zinc-500 mb-1">Channels</div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-purple-300">{channels.length}</span>
            <span className="text-[10px] text-zinc-600">total</span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-300"
              style={{
                width: `${metrics.channelLoad}%`
              }} />

          </div>
          <div className="mt-1 text-[7px] text-zinc-600">
            {metrics.channelLoad}% active
          </div>
        </div>

        {/* Bridges Card */}
        <div className="rounded border border-zinc-700/30 bg-zinc-950/40 p-2">
          <div className="text-[8px] uppercase tracking-wide text-zinc-500 mb-1">Bridges</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold ${metrics.bridgeLoad > 0 ? 'text-orange-300' : 'text-zinc-500'}`}>
              {metrics.bridgeLoad}
            </span>
            <span className="text-[10px] text-zinc-600">active</span>
          </div>
          {metrics.bridgeLoad > 0 &&
          <div className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/30">
              <Zap className="w-2.5 h-2.5 text-orange-400" />
              <span className="text-[7px] text-orange-300 font-semibold">Live</span>
            </div>
          }
        </div>

        {/* Delivery Confidence Card */}
        <div className="rounded border border-zinc-700/30 bg-zinc-950/40 p-2">
          <div className="text-[8px] uppercase tracking-wide text-zinc-500 mb-1">Delivery</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold ${deliveryStats.confidencePct >= 70 ? 'text-green-300' : 'text-yellow-300'}`}>
              {deliveryStats.confidencePct}%
            </span>
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
              deliveryStats.confidencePct >= 70 ?
              'bg-gradient-to-r from-green-500 to-green-400' :
              'bg-gradient-to-r from-yellow-500 to-yellow-400'}`
              }
              style={{
                width: `${deliveryStats.confidencePct}%`
              }} />

          </div>
          <div className="mt-1 text-[7px] text-zinc-600">
            {deliveryStats.acked} acked
          </div>
        </div>
      </div>

      {/* Status Indicators Row */}
      




















    </div>);

}