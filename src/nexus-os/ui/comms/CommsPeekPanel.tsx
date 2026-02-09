import React, { useEffect, useMemo, useState } from 'react';
import { determineChannelContext } from '../../services/channelContextService';
import { getCqbChannelTraffic } from '../../services/commsGraphService';
import { NexusBadge, NexusButton, RustPulseIndicator } from '../primitives';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';

interface CommsPeekPanelProps extends CqbPanelSharedProps {
  onOpenCommsNetwork?: () => void;
}

export default function CommsPeekPanel({ variantId, opId, onOpenCommsNetwork }: CommsPeekPanelProps) {
  const context = useMemo(() => determineChannelContext({ variantId }), [variantId]);
  const [activity, setActivity] = useState(() => getCqbChannelTraffic({ variantId, opId, cqbWindowMs: 20000 }));

  useEffect(() => {
    setActivity(getCqbChannelTraffic({ variantId, opId, cqbWindowMs: 20000 }));
    const timer = setInterval(() => {
      setActivity(getCqbChannelTraffic({ variantId, opId, cqbWindowMs: 20000 }));
    }, 1500);
    return () => clearInterval(timer);
  }, [variantId, opId]);

  const activeChannels = context.channelIds.map((channelId) => {
    const traffic = activity.byChannelId[channelId];
    return {
      channelId,
      count: traffic?.count || 0,
      intensity: traffic?.intensity || 0,
    };
  });

  const total = activeChannels.reduce((sum, item) => sum + item.count, 0);
  const hottest = activeChannels.reduce((best, entry) => (entry.intensity > best.intensity ? entry : best), {
    channelId: context.primaryChannelId,
    count: 0,
    intensity: 0,
  });

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-500 uppercase tracking-wide">Template {context.templateId}</div>
        <NexusBadge tone={total > 0 ? 'active' : 'neutral'}>{total} events / 20s</NexusBadge>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900/55 px-3 py-2 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Active channels</span>
          <span className="text-zinc-200">{context.channelIds.length}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Hottest lane</span>
          <span className="text-zinc-200">{hottest.channelId || 'UNSCOPED'}</span>
        </div>
      </div>

      <div className="space-y-1 overflow-auto pr-1">
        {activeChannels.map((entry) => (
          <div key={entry.channelId} className="rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1 flex items-center justify-between">
            <div className="text-xs text-zinc-200 truncate">{entry.channelId}</div>
            <div className="flex items-center gap-2">
              <RustPulseIndicator active={entry.intensity > 0} />
              <span className="text-[11px] text-zinc-500">{entry.count}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-1">
        <NexusButton size="sm" intent="primary" onClick={onOpenCommsNetwork}>
          Open Comms Network
        </NexusButton>
      </div>
    </div>
  );
}

