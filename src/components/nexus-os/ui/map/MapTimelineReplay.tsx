import React from 'react';
import type { MapTimelineSnapshot } from '../../services/mapTimelineService';
import { NexusBadge, NexusButton } from '../primitives';

interface MapTimelineReplayProps {
  timeline: MapTimelineSnapshot;
  windowMinutes: number;
  offsetMinutes: number;
  onChangeWindowMinutes: (value: number) => void;
  onChangeOffsetMinutes: (value: number) => void;
}

export default function MapTimelineReplay({
  timeline,
  windowMinutes,
  offsetMinutes,
  onChangeWindowMinutes,
  onChangeOffsetMinutes,
}: MapTimelineReplayProps) {
  const [page, setPage] = React.useState(0);
  const itemsPerPage = 8;
  const pageCount = Math.max(1, Math.ceil(timeline.visibleEntries.length / itemsPerPage));
  const visibleEntries = timeline.visibleEntries.slice(page * itemsPerPage, page * itemsPerPage + itemsPerPage);

  React.useEffect(() => {
    setPage((prev) => Math.min(prev, pageCount - 1));
  }, [pageCount]);

  return (
    <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-200">Timeline Replay</h4>
        <NexusBadge tone="neutral">{timeline.visibleEntries.length}/{timeline.entries.length}</NexusBadge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-zinc-500">
          Window (min)
          <input
            type="range"
            min={10}
            max={180}
            step={5}
            value={windowMinutes}
            onChange={(event) => onChangeWindowMinutes(Number(event.target.value))}
            className="w-full"
          />
          <span className="text-zinc-300">{windowMinutes}</span>
        </label>
        <label className="text-[11px] text-zinc-500">
          Offset (min)
          <input
            type="range"
            min={0}
            max={90}
            step={1}
            value={offsetMinutes}
            onChange={(event) => onChangeOffsetMinutes(Number(event.target.value))}
            className="w-full"
          />
          <span className="text-zinc-300">{offsetMinutes}</span>
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <NexusButton size="sm" intent="subtle" onClick={() => onChangeOffsetMinutes(Math.max(0, offsetMinutes - 1))}>[ Back</NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onChangeOffsetMinutes(offsetMinutes + 1)}>Forward ]</NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onChangeOffsetMinutes(0)}>Live</NexusButton>
      </div>
      <div className="space-y-1.5">
        {visibleEntries.map((entry) => (
          <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-200 truncate">{entry.title}</span>
              <NexusBadge tone={entry.severity === 'HIGH' ? 'danger' : entry.severity === 'MED' ? 'warning' : 'neutral'}>
                {entry.source}
              </NexusBadge>
            </div>
            <div className="mt-0.5 text-zinc-500">{entry.detail}</div>
          </div>
        ))}
        {timeline.visibleEntries.length > itemsPerPage ? (
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <NexusButton size="sm" intent="subtle" onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={page === 0}>
              Prev
            </NexusButton>
            <NexusBadge tone="neutral">{page + 1}/{pageCount}</NexusBadge>
            <NexusButton
              size="sm"
              intent="subtle"
              onClick={() => setPage((prev) => Math.min(pageCount - 1, prev + 1))}
              disabled={page >= pageCount - 1}
            >
              Next
            </NexusButton>
          </div>
        ) : null}
        {timeline.visibleEntries.length === 0 ? (
          <div className="text-xs text-zinc-500">No timeline entries inside the replay window.</div>
        ) : null}
      </div>
    </section>
  );
}
