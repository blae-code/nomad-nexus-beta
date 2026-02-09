import React from 'react';
import { CqbVariantRegistry } from '../../registries/cqbVariantRegistry';
import { NexusBadge } from '../primitives';
import type { CqbElementFilter, CqbRosterMember } from './cqbTypes';

interface CqbContextSelectorProps {
  variantId: string;
  onVariantIdChange: (value: string) => void;
  opId: string;
  onOpIdChange: (value: string) => void;
  elementFilter: CqbElementFilter;
  onElementFilterChange: (value: CqbElementFilter) => void;
  actorId: string;
  onActorIdChange: (value: string) => void;
  roster: CqbRosterMember[];
}

export default function CqbContextSelector({
  variantId,
  onVariantIdChange,
  opId,
  onOpIdChange,
  elementFilter,
  onElementFilterChange,
  actorId,
  onActorIdChange,
  roster,
}: CqbContextSelectorProps) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="text-xs sm:text-sm text-zinc-100 font-semibold uppercase tracking-wide">CQB Context</h2>
        <NexusBadge tone="warning">Dev Only</NexusBadge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <label className="text-[11px] text-zinc-500 flex flex-col gap-1">
          Variant
          <select
            value={variantId}
            onChange={(event) => onVariantIdChange(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            aria-label="CQB variant"
          >
            {CqbVariantRegistry.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.id}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-zinc-500 flex flex-col gap-1">
          opId (optional)
          <input
            value={opId}
            onChange={(event) => onOpIdChange(event.target.value)}
            placeholder="op_redscar_alpha"
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          />
        </label>
        <label className="text-[11px] text-zinc-500 flex flex-col gap-1">
          Element filter
          <select
            value={elementFilter}
            onChange={(event) => onElementFilterChange(event.target.value as CqbElementFilter)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            aria-label="Element filter"
          >
            <option value="ALL">ALL</option>
            <option value="CE">CE</option>
            <option value="GCE">GCE</option>
            <option value="ACE">ACE</option>
          </select>
        </label>
        <label className="text-[11px] text-zinc-500 flex flex-col gap-1">
          Active sender
          <select
            value={actorId}
            onChange={(event) => onActorIdChange(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            aria-label="Active sender"
          >
            {roster.map((member) => (
              <option key={member.id} value={member.id}>
                {member.element}/{member.callsign} ({member.role})
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

