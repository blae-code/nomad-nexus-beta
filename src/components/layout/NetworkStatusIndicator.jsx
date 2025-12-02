import React, { useState, useEffect } from 'react';
import { Wifi, Activity, Lock, Signal } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function NetworkStatusIndicator() {
  const [ping, setPing] = useState(45);
  const [packets, setPackets] = useState(120);
  const [signalLevel, setSignalLevel] = useState(4);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate fluctuating network stats
      setPing(p => Math.max(10, Math.min(150, p + (Math.random() - 0.5) * 40)));
      setPackets(p => Math.max(50, Math.min(900, p + (Math.random() - 0.5) * 100)));
      
      // Occasional signal dip
      if (Math.random() > 0.9) {
        setSignalLevel(Math.floor(Math.random() * 3) + 2);
      } else {
        setSignalLevel(4);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getPingStatus = (p) => {
    if (p < 60) return { color: "text-emerald-500", bg: "bg-emerald-500", label: "OPTIMAL" };
    if (p < 120) return { color: "text-amber-500", bg: "bg-amber-500", label: "STABLE" };
    return { color: "text-red-500", bg: "bg-red-500", label: "WEAK" };
  };

  const status = getPingStatus(ping);

  return (
    <div className="hidden lg:flex items-center h-8 border-x border-zinc-800/50 bg-zinc-900/10 px-3 gap-4 select-none">
      
      {/* Signal Strength */}
      <div className="flex items-center gap-2" title="Signal Strength">
        <div className="flex items-end gap-0.5 h-3">
           {[1, 2, 3, 4].map(bar => (
              <div 
                key={bar} 
                className={cn(
                  "w-1 rounded-sm transition-all duration-300", 
                  bar <= signalLevel ? status.bg : "bg-zinc-800",
                  bar === 1 ? "h-1.5" : bar === 2 ? "h-2" : bar === 3 ? "h-2.5" : "h-3"
                )} 
              />
           ))}
        </div>
        <div className="flex flex-col">
            <span className={cn("text-[9px] font-black leading-none tracking-wider", status.color)}>
               {status.label}
            </span>
            <span className="text-[8px] font-mono text-zinc-600 leading-none">NET-LINK</span>
        </div>
      </div>

      {/* Latency */}
      <div className="flex items-center gap-2 pl-2 border-l border-zinc-800/50">
         <Activity className="w-3 h-3 text-zinc-600" />
         <div className="flex flex-col">
            <span className="text-[9px] font-mono font-bold text-zinc-400 leading-none">
               {Math.floor(ping)} MS
            </span>
            <span className="text-[8px] font-mono text-zinc-600 leading-none">LATENCY</span>
         </div>
      </div>

      {/* Encryption */}
      <div className="flex items-center gap-2 pl-2 border-l border-zinc-800/50">
         <Lock className="w-3 h-3 text-emerald-900" />
         <div className="flex flex-col">
            <span className="text-[9px] font-bold text-emerald-700/80 leading-none">TLS 1.3</span>
            <span className="text-[8px] font-mono text-zinc-700 leading-none">ENCRYPTED</span>
         </div>
      </div>

    </div>
  );
}