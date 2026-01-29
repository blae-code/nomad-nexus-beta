import React from 'react';
import { AlertCircle, Zap } from 'lucide-react';

export default function ConstructionTicker() {
  return (
    <div className="bg-gradient-to-r from-orange-950/40 via-orange-900/30 to-orange-950/40 border-b border-orange-500/30 backdrop-blur-sm">
      <div className="relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(234,88,12,0.1),transparent)] animate-pulse" />
        
        <div className="relative px-4 py-3 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 animate-pulse" />
          
          <div className="flex-1 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-orange-400">
              ⚙️ NEXUS CONSTRUCTION PROTOCOL ACTIVE
            </p>
            <p className="text-[11px] text-orange-300/80 font-semibold tracking-wide mt-0.5">
              TEST MODE — Beta Release Scheduled <span className="text-orange-400 font-black">FEBRUARY 2956</span> | Star Citizen
            </p>
          </div>
          
          <Zap className="w-4 h-4 text-orange-500 flex-shrink-0 animate-pulse" />
        </div>
        
        {/* Subtle animated line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
      </div>
    </div>
  );
}