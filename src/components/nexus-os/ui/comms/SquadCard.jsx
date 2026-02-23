import React, { useState } from 'react';
import { Pin, PinOff, ChevronDown } from 'lucide-react';
import { NexusButton, NexusBadge } from '../primitives';
import { wingTokenIcon, squadTokenIcon, vehicleStatusTokenIcon, operatorStatusTokenIcon, roleTokenIcon } from './commsTokenSemantics';
import { tokenAssets } from '../tokens';
import { operatorStatusTone } from './commsTokenSemantics';

export default function SquadCard({
  card,
  sla,
  escalation,
  isBridged,
  isWatchlisted,
  isSelected,
  onSelect,
  onHailPilot,
  onHailMedic,
  onHailSquad,
  onToggleBridge,
  onToggleWatchlist,
  onEscalate,
  slaTokenIcon,
  slaTone,
  formatSlaAge
}) {
  const [expandedVehicleId, setExpandedVehicleId] = useState(null);

  const toggleVehicle = (e, vehicleId) => {
    e.stopPropagation();
    setExpandedVehicleId(expandedVehicleId === vehicleId ? null : vehicleId);
  };

  return (
    <article
      key={card.id}
      data-comms-squad-card="true"
      className={`rounded border px-2 py-1.5 transition-colors ${
        isSelected
          ? 'border-orange-500/60 bg-zinc-950/80'
          : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700/80'
      }`}
    >
      <button type="button" onClick={() => onSelect(card.id)} className="w-full text-left">
        {/* Header: Wing + Squad + Status Icons */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="min-w-0 inline-flex items-center gap-1.5">
            <img
              src={wingTokenIcon(card.wingId, 'ready')}
              alt=""
              className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
            />
            <span className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">
              {card.squadLabel}
            </span>
            <span className="text-[8px] text-zinc-500 uppercase tracking-wide truncate">
              {card.wingLabel}
            </span>
          </div>
          <div className="inline-flex items-center gap-1 shrink-0">
            {isBridged ? <NexusBadge tone="active">BR</NexusBadge> : null}
            <NexusBadge
              tone={
                card.txCount > 0 ? 'warning' : card.offNetCount > 0 ? 'danger' : 'ok'
              }
            >
              TX {card.txCount}
            </NexusBadge>
          </div>
        </div>

        {/* Metrics: Ships, Crew, Links */}
        <div className="mt-1 flex items-center justify-between gap-1 text-[8px] text-zinc-500 uppercase tracking-wide">
          <span>Ships {card.vehicles.length}</span>
          <span>Crew {card.operators.length}</span>
          <span>Links {card.linkedSquadIds.length}</span>
        </div>
      </button>

      {/* SLA Status Row */}
      {sla ? (
        <div className="mt-1 rounded border border-zinc-800 bg-zinc-900/30 px-1.5 py-1 grid grid-cols-3 gap-1 text-[8px] uppercase tracking-wide">
          <span className="inline-flex items-center gap-1 text-zinc-400">
            <img
              src={slaTokenIcon(sla.checkinStatus)}
              alt=""
              className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
            />
            CI {formatSlaAge(sla.last_checkin_age_s)}
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-400">
            <img
              src={slaTokenIcon(sla.ackStatus)}
              alt=""
              className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
            />
            ACK {formatSlaAge(sla.last_ack_age_s)}
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-400">
            <img
              src={slaTokenIcon(sla.offNetStatus)}
              alt=""
              className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
            />
            OFF {formatSlaAge(sla.off_net_duration_s)}
          </span>
        </div>
      ) : null}

      {/* Ship + Crew Compact Row */}
      <div className="mt-1 flex items-center gap-1 flex-wrap text-[8px]">
        {card.vehicles.slice(0, 2).map((vehicle) => (
          <div
            key={vehicle.id}
            className="inline-flex items-center gap-0.5 rounded border border-zinc-800/60 bg-zinc-900/25 px-1 py-0.5"
          >
            <img
              src={tokenAssets.comms.vehicle}
              alt=""
              className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
            />
            <span className="text-zinc-400 truncate">{vehicle.label.substring(0, 3)}</span>
            <img
              src={vehicleStatusTokenIcon(vehicle.status)}
              alt=""
              className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
            />
          </div>
        ))}
        {card.operators.slice(0, 3).map((operator) => (
          <div
            key={operator.id}
            className="inline-flex items-center gap-0.5 rounded border border-zinc-800/60 bg-zinc-900/25 px-1 py-0.5"
          >
            <img
              src={roleTokenIcon(operator.role)}
              alt=""
              className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
              title={operator.role}
            />
            <img
              src={operatorStatusTokenIcon(operator.status)}
              alt=""
              className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
              title={operator.status}
            />
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
        <NexusButton size="sm" intent="subtle" onClick={() => onHailPilot(card)} disabled={card.pilotCount === 0} title="Hail Pilots">
          Hail Pilot
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onHailMedic(card)} disabled={card.medicCount === 0} title="Hail Medics">
          Hail Medics
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onHailSquad(card)} title="Hail all crew">
          Hail Squad
        </NexusButton>
        <NexusButton
          size="sm"
          intent={isBridged ? 'primary' : 'subtle'}
          onClick={() => onToggleBridge(card.id)}
          title="Toggle bridge"
        >
          Bridge
        </NexusButton>
        <NexusButton
          size="sm"
          intent="subtle"
          onClick={() => onToggleWatchlist(card.id)}
          title="Toggle watchlist"
        >
          {isWatchlisted ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </NexusButton>
        {escalation ? (
          <NexusButton
            size="sm"
            intent={slaTone(sla?.overallStatus || 'green')}
            onClick={() => onEscalate(card, escalation)}
            title={escalation.label}
          >
            {escalation.label}
          </NexusButton>
        ) : null}
      </div>
    </article>
  );
}