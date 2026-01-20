import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Ship, User, AlertTriangle, Radio, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserDirectory } from "@/components/hooks/useUserDirectory";

export default function TacticalMapDisplay({ eventId }) {
  const { data: assets } = useQuery({
    queryKey: ['tactical-assets', eventId],
    queryFn: () => base44.entities.FleetAsset.list({ 
      filter: { status: { "$in": ["OPERATIONAL", "MISSION"] } } 
    }),
    refetchInterval: 5000,
    initialData: []
  });

  const { data: playerStatuses } = useQuery({
     queryKey: ['tactical-personnel', eventId],
     queryFn: () => base44.entities.PlayerStatus.list({ 
       filter: { event_id: eventId } 
     }),
     refetchInterval: 3000,
     initialData: []
   });

   const statusUserIds = playerStatuses.map(p => p.user_id).filter(Boolean);
   const { userById } = useUserDirectory(statusUserIds.length > 0 ? statusUserIds : null);

  const distressPersonnel = playerStatuses.filter(p => p.status === 'DISTRESS');
  const engagedPersonnel = playerStatuses.filter(p => p.status === 'ENGAGED');

  return (
    <div className="relative w-full h-full bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(234, 88, 12, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 88, 12, 0.1) 1px, transparent 1px)',
             backgroundSize: '50px 50px'
           }} 
      />

      {/* Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none opacity-5"
           style={{
             backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(234, 88, 12, 0.3) 2px, rgba(234, 88, 12, 0.3) 4px)'
           }}
      />

      {/* Compass */}
      <div className="absolute top-4 right-4 text-xs text-zinc-600 font-mono">
        <div className="text-center mb-1">N</div>
        <div className="flex items-center gap-2">
          <span>W</span>
          <div className="w-6 h-6 border border-zinc-700 rotate-45"></div>
          <span>E</span>
        </div>
        <div className="text-center mt-1">S</div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-black/50 border border-zinc-800 p-2 space-y-1 text-[10px]">
        <div className="flex items-center gap-2 text-emerald-400">
          <Ship className="w-3 h-3" />
          <span>Fleet Assets</span>
        </div>
        <div className="flex items-center gap-2 text-blue-400">
          <User className="w-3 h-3" />
          <span>Personnel</span>
        </div>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-3 h-3" />
          <span>Distress</span>
        </div>
      </div>

      {/* Assets on Map */}
      {assets.filter(a => a.coordinates).map((asset) => (
        <div
          key={asset.id}
          className="absolute group"
          style={{
            left: `${asset.coordinates.x}%`,
            top: `${asset.coordinates.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className={cn(
            "relative w-8 h-8 flex items-center justify-center rounded-full border-2 cursor-pointer transition-all",
            asset.status === 'MISSION' ? "border-emerald-500 bg-emerald-950/50 shadow-lg shadow-emerald-500/30" : "border-emerald-600 bg-emerald-950/30"
          )}>
            <Ship className="w-4 h-4 text-emerald-400" />
            {asset.status === 'MISSION' && (
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-30"></div>
            )}
          </div>
          
          {/* Tooltip */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-emerald-500/30 px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <div className="text-[10px] font-bold text-emerald-400">{asset.name}</div>
            <div className="text-[9px] text-zinc-400">{asset.model}</div>
            <div className="text-[9px] text-zinc-500">{asset.location || 'Unknown'}</div>
          </div>
        </div>
      ))}

      {/* Personnel on Map */}
      {playerStatuses.map((status) => {
        const user = userById[status.user_id];
        const isDistress = status.status === 'DISTRESS';
        const isEngaged = status.status === 'ENGAGED';
        
        // Generate pseudo-random coordinates based on user_id if not available
        const x = ((status.user_id?.charCodeAt(0) || 50) % 80) + 10;
        const y = ((status.user_id?.charCodeAt(1) || 50) % 80) + 10;
        
        return (
          <div
            key={status.id}
            className="absolute group"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className={cn(
              "relative w-6 h-6 flex items-center justify-center rounded-full border-2 cursor-pointer transition-all",
              isDistress ? "border-red-500 bg-red-950/70 shadow-lg shadow-red-500/50" :
              isEngaged ? "border-amber-500 bg-amber-950/50" :
              "border-blue-500 bg-blue-950/30"
            )}>
              {isDistress ? (
                <AlertTriangle className="w-3 h-3 text-red-400" />
              ) : (
                <User className="w-3 h-3 text-blue-400" />
              )}
              
              {isDistress && (
                <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping"></div>
              )}
            </div>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black border border-blue-500/30 px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="text-[10px] font-bold text-blue-400">
                {user?.callsign || user?.rsi_handle || 'Unknown'}
              </div>
              <div className="text-[9px] text-zinc-400">{status.role}</div>
              <div className={cn(
                "text-[9px] font-bold",
                isDistress ? "text-red-400" : isEngaged ? "text-amber-400" : "text-emerald-400"
              )}>
                {status.status}
              </div>
              {status.current_location && (
                <div className="text-[9px] text-zinc-500">{status.current_location}</div>
              )}
            </div>
          </div>
        );
      })}

      {/* Center Marker (Operation Base) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <MapPin className="w-6 h-6 text-[#ea580c]" />
          <div className="absolute inset-0 animate-ping opacity-20">
            <MapPin className="w-6 h-6 text-[#ea580c]" />
          </div>
        </div>
        <div className="text-[9px] text-center text-zinc-500 mt-1 font-mono">OPS BASE</div>
      </div>

      {/* Status Overlay */}
      {distressPersonnel.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-950/80 border border-red-500 px-3 py-1 rounded flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs font-bold text-red-300">
            {distressPersonnel.length} DISTRESS SIGNAL{distressPersonnel.length > 1 ? 'S' : ''}
          </span>
        </div>
      )}
    </div>
  );
}