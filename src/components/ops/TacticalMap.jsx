import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Navigation, Map as MapIcon, Users, Radio, ShieldAlert, Rocket } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function TacticalMap({ className }) {
  const [selectedSector, setSelectedSector] = useState(null);

  // Simulated Sectors
  const sectors = [
    { id: 'S-01', name: 'Stanton System', x: 50, y: 50, status: 'active' },
    { id: 'S-02', name: 'Pyro Gap', x: 80, y: 20, status: 'danger' },
    { id: 'S-03', name: 'Terra Jump', x: 20, y: 80, status: 'secure' },
  ];

  // Fetch active squads for map placement (simulated coordinates)
  const { data: squads } = useQuery({
    queryKey: ['tactical-squads'],
    queryFn: () => base44.entities.Squad.list(),
    refetchInterval: 5000,
    initialData: []
  });

  // Fetch active distress signals
  const { data: distressSignals } = useQuery({
    queryKey: ['tactical-distress'],
    queryFn: () => base44.entities.PlayerStatus.list({ filter: { status: 'DISTRESS' } }),
    refetchInterval: 2000,
    initialData: []
  });

  // Fetch fleet assets for map
  const { data: fleetAssets } = useQuery({
    queryKey: ['tactical-fleet'],
    queryFn: () => base44.entities.FleetAsset.list(),
    refetchInterval: 5000,
    initialData: []
  });

  return (
    <div className={`relative bg-black border border-zinc-800 overflow-hidden ${className}`}>
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
      />

      {/* Radar Sweep Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent -translate-x-1/2 -translate-y-1/2 animate-[spin_4s_linear_infinite]" />
      </div>

      {/* Map Header */}
      <div className="absolute top-4 left-4 z-10 bg-black/80 border border-zinc-800 p-2 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-emerald-500">
          <MapIcon className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Tactical Overview</span>
        </div>
        <div className="text-[10px] text-zinc-500 font-mono mt-1">
          GRID: STANTON_PRIME // SECTOR_SCAN: ACTIVE
        </div>
      </div>

      {/* Interactive Map Area */}
      <div className="absolute inset-0 p-10">
        {/* Sectors */}
        {sectors.map(sector => (
          <motion.div
            key={sector.id}
            className={`absolute w-32 h-32 border border-dashed rounded-full flex items-center justify-center cursor-pointer transition-all
              ${sector.status === 'danger' ? 'border-red-900 hover:border-red-500' : 'border-zinc-800 hover:border-emerald-500'}`}
            style={{ top: `${sector.y}%`, left: `${sector.x}%`, transform: 'translate(-50%, -50%)' }}
            onClick={() => setSelectedSector(sector)}
            whileHover={{ scale: 1.1 }}
          >
            <div className="text-center">
              <div className={`text-[10px] font-bold uppercase ${sector.status === 'danger' ? 'text-red-700' : 'text-zinc-700'}`}>
                {sector.id}
              </div>
              <div className={`text-[9px] uppercase tracking-wider ${sector.status === 'danger' ? 'text-red-500' : 'text-zinc-500'}`}>
                {sector.name}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Squad Markers (Simulated positions relative to center for demo) */}
        {squads.map((squad, idx) => (
           <motion.div
             key={squad.id}
             className="absolute flex flex-col items-center group cursor-pointer"
             style={{ 
                top: `${40 + (idx * 10)}%`, 
                left: `${40 + (idx * 15)}%` 
             }}
             initial={{ opacity: 0, scale: 0 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: idx * 0.2 }}
           >
              <div className="w-3 h-3 bg-emerald-500 rotate-45 shadow-[0_0_10px_rgba(16,185,129,0.8)] group-hover:scale-150 transition-transform" />
              <div className="mt-2 bg-black/80 px-2 py-0.5 border border-emerald-900 text-[9px] text-emerald-500 uppercase font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                 {squad.name}
              </div>
           </motion.div>
        ))}

        {/* Distress Beacons */}
        {distressSignals.map((signal, idx) => (
           <motion.div
             key={signal.id}
             className="absolute flex items-center justify-center"
             style={{ top: '30%', left: '70%' }} // Static pos for demo if no coords
             animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
             transition={{ duration: 1, repeat: Infinity }}
           >
              <ShieldAlert className="w-6 h-6 text-red-500" />
              <div className="absolute top-full mt-1 text-[9px] font-bold text-red-500 bg-black px-1">DISTRESS</div>
           </motion.div>
        ))}

        {/* Fleet Assets */}
        {fleetAssets.map((asset) => (
           <motion.div
             key={asset.id}
             className="absolute flex flex-col items-center group cursor-pointer z-20"
             style={{ 
                top: `${asset.coordinates?.y || 50}%`, 
                left: `${asset.coordinates?.x || 50}%`,
                transform: 'translate(-50%, -50%)'
             }}
             initial={{ opacity: 0, scale: 0 }}
             animate={{ opacity: 1, scale: 1 }}
           >
              <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[12px] 
                 ${asset.type === 'VEHICLE' ? 'border-b-amber-500' : 'border-b-blue-500'} 
                 ${asset.status === 'DESTROYED' ? 'border-b-red-600' : ''}
                 drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]`} 
              />
              <div className="absolute top-full mt-1 bg-black/80 border border-zinc-800 px-1.5 py-0.5 whitespace-nowrap hidden group-hover:block">
                 <div className="text-[9px] font-bold text-white uppercase">{asset.name}</div>
                 <div className="text-[8px] text-zinc-400 uppercase">{asset.model}</div>
              </div>
           </motion.div>
        ))}

      </div>

      {/* Selected Sector Details */}
      {selectedSector && (
        <div className="absolute bottom-4 right-4 w-64 bg-black/90 border border-zinc-800 p-4 backdrop-blur-sm z-20">
           <h3 className="text-emerald-500 text-sm font-bold uppercase mb-2">{selectedSector.name}</h3>
           <div className="space-y-2 text-[10px] font-mono text-zinc-400">
              <div className="flex justify-between">
                 <span>STATUS:</span>
                 <span className={selectedSector.status === 'danger' ? 'text-red-500' : 'text-emerald-500'}>
                    {selectedSector.status.toUpperCase()}
                 </span>
              </div>
              <div className="flex justify-between">
                 <span>SQUADS:</span>
                 <span>{squads.length} DETECTED</span>
              </div>
              <div className="flex justify-between">
                 <span>THREAT LEVEL:</span>
                 <span>{selectedSector.status === 'danger' ? 'HIGH' : 'MINIMAL'}</span>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}