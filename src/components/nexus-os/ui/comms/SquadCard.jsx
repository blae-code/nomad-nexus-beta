import React, { useState, useEffect } from 'react';
import { Pin, PinOff, ChevronDown } from 'lucide-react';
import { NexusButton, NexusBadge } from '../primitives';
import { wingTokenIcon, squadTokenIcon, vehicleStatusTokenIcon, operatorStatusTokenIcon, roleTokenIcon } from './commsTokenSemantics';
import { tokenAssets } from '../tokens';
import { operatorStatusTone } from './commsTokenSemantics';
import { base44 } from '@/api/base44Client';

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
  const [expandedVehicleIds, setExpandedVehicleIds] = useState(new Set());
  const [location, setLocation] = useState(card.location || '');

  useEffect(() => {
    if (!card.id) return;
    
    const unsubscribe = base44.entities.Squad.subscribe((event) => {
      if (event.id === card.id && event.data?.location) {
        setLocation(event.data.location);
      }
    });
    
    return () => unsubscribe?.();
  }, [card.id]);

  const buildVehicleTree = () => {
    const byId = {};
    const roots = [];
    
    card.vehicles.forEach((v) => {
      byId[v.id] = { ...v, children: [] };
    });
    
    card.vehicles.forEach((v) => {
      if (v.parent_id && byId[v.parent_id]) {
        byId[v.parent_id].children.push(byId[v.id]);
      } else {
        roots.push(byId[v.id]);
      }
    });
    
    return roots;
  };

  const toggleVehicle = (e, vehicleId) => {
    e.stopPropagation();
    const newSet = new Set(expandedVehicleIds);
    newSet.has(vehicleId) ? newSet.delete(vehicleId) : newSet.add(vehicleId);
    setExpandedVehicleIds(newSet);
  };

  const getSizeSymbol = (vehicleSize) => {
    const sizeMap = {
      'capital': '◆',
      'large': '◇',
      'medium': '○',
      'small': '●',
      'fighter': '▪'
    };
    return sizeMap[String(vehicleSize || '').toLowerCase()] || '◇';
  };

  const getSecurityTone = (securityStatus) => {
    const status = String(securityStatus || 'safe').toLowerCase();
    if (status.includes('engaged')) return 'danger';
    if (status.includes('risk')) return 'warning';
    return 'ok';
  };

  const getFuelTone = (fuelPercent) => {
    const percent = Number(fuelPercent || 0);
    if (percent <= 10) return 'danger';
    if (percent <= 30) return 'warning';
    return 'ok';
  };

  const getAmmoBadge = (ammo) => {
    if (!ammo) return null;
    const percent = Number(ammo || 0);
    if (percent === 0) return { label: 'No Ammo', tone: 'danger' };
    if (percent < 30) return { label: 'Low', tone: 'warning' };
    return { label: 'Ready', tone: 'ok' };
  };

  const getCrewReadiness = (vehicle, crewCount) => {
    const recommended = Number(vehicle.recommended_crew || 2);
    const status = crewCount >= recommended ? 'ready' : 'loading';
    return { current: crewCount, recommended, status };
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
         {/* Header: Squad ID + Location Breadcrumb */}
         <div className="flex items-center justify-between gap-1.5">
           <div className="min-w-0 flex flex-col gap-1">
             <div className="inline-flex items-center gap-1.5">
               <span className="text-[10px] text-zinc-100 uppercase tracking-wide font-semibold">
                 {card.squadLabel}
               </span>
               <span className="text-[8px] text-zinc-500 uppercase tracking-wide">
                 {card.wingLabel}
               </span>
             </div>
             {location && (
               <span className="text-[8px] text-zinc-400 font-mono break-words">
                 {location}
               </span>
             )}
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

      {/* Ships: Collapsible Categories */}
      <div className="mt-1 space-y-1">
        {buildVehicleTree().map((vehicle) => {
          const renderVehicleNode = (vehicle, depth = 0) => {
            const isExpanded = expandedVehicleIds.has(vehicle.id);
            const crewForVehicle = card.operators.filter((op) =>
              vehicle.label.toLowerCase().includes(op.callsign.split('-')[0].toLowerCase()) ||
              card.operators.length <= 5
            ).slice(0, 5);
            const crewStatus = getCrewReadiness(vehicle, crewForVehicle.length);
            const ammoBadge = getAmmoBadge(vehicle.ammo_percent);
            const paddingLeft = depth * 12;

            return (
              <div key={vehicle.id} className="space-y-1">
                <div className="rounded border border-zinc-800/60 bg-zinc-900/25" style={{ marginLeft: `${paddingLeft}px` }}>
              <button
                type="button"
                onClick={(e) => toggleVehicle(e, vehicle.id)}
                className="w-full flex items-center justify-between gap-1 px-1.5 py-1 text-[10px] text-zinc-300 uppercase tracking-wide font-semibold hover:bg-zinc-900/40 transition-colors"
              >
                <div className="flex items-center gap-1 min-w-0 flex-wrap">
                  <ChevronDown
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                  <img
                    src={tokenAssets.comms.vehicle}
                    alt=""
                    className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60"
                  />
                  <span className="truncate">{getSizeSymbol(vehicle.size)} {vehicle.label}</span>
                  {!isExpanded && (
                    <div className="flex gap-0.5 text-[7px] flex-wrap ml-auto">
                      <img src={slaTokenIcon(getSecurityTone(vehicle.security_status))} alt="" className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" title={String(vehicle.security_status || 'SAFE').substring(0, 3)} />
                      {ammoBadge && <img src={slaTokenIcon(ammoBadge.tone)} alt="" className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" title={ammoBadge.label} />}
                      {vehicle.hydrogen_fuel !== undefined && <img src={slaTokenIcon(getFuelTone(vehicle.hydrogen_fuel))} alt="" className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" title={`H2 ${vehicle.hydrogen_fuel}%`} />}
                      {vehicle.quantanium_fuel !== undefined && <img src={slaTokenIcon(getFuelTone(vehicle.quantanium_fuel))} alt="" className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" title={`QT ${vehicle.quantanium_fuel}%`} />}
                      <img src={slaTokenIcon(crewStatus.status === 'ready' ? 'ok' : 'warning')} alt="" className="w-2.5 h-2.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60" title={`${crewStatus.current}/${crewStatus.recommended}`} />
                    </div>
                  )}
                </div>
                <img
                  src={vehicleStatusTokenIcon(vehicle.status)}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm border border-zinc-800/70 bg-zinc-900/60 flex-shrink-0"
                />
              </button>



              {isExpanded && (
                <div className="border-t border-zinc-800/40 px-1 py-1 space-y-0.5">
                  {crewForVehicle.length > 0 ? (
                    crewForVehicle.map((operator) => (
                      <div
                        key={operator.id}
                        className="flex items-center justify-between gap-1 text-[9px] rounded px-1 py-1 bg-zinc-900/50"
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <img
                            src={roleTokenIcon(operator.role)}
                            alt=""
                            className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60 flex-shrink-0"
                            title={operator.role}
                          />
                          <span className="text-zinc-300 truncate">{operator.callsign}</span>
                        </div>
                        <img
                          src={operatorStatusTokenIcon(operator.status)}
                          alt=""
                          className="w-3 h-3 rounded-sm border border-zinc-800/70 bg-zinc-900/60 flex-shrink-0"
                          title={operator.status}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-[8px] text-zinc-500 italic px-1 py-1">No crew assigned</div>
                  )}
                </div>
              )}
              
              {/* Render child vehicles recursively */}
              {isExpanded && vehicle.children && vehicle.children.length > 0 && (
                <div className="space-y-1">
                  {vehicle.children.map((child) => renderVehicleNode(child, depth + 1))}
                </div>
              )}
            </div>
            </div>
          );
        };

        return renderVehicleNode(vehicle);
        })}
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