import React from "react";
import { Activity, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CurrentStatusHeader({ user }) {
  const role = user?.role_tags?.[0] || user?.rank || "OPERATIVE";
  // Mocking connection status
  const isConnected = true; 

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-2 border-b border-zinc-800/50 mb-4">
       <div className="flex items-center gap-2 text-orange-500">
          <Activity className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Current Operational Focus</span>
       </div>
       
       <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
          {role}
       </h1>
       
       <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider",
          isConnected ? "border-emerald-900/50 bg-emerald-950/10 text-emerald-500" : "border-zinc-800 bg-zinc-900 text-zinc-500"
       )}>
          <Wifi className="w-3 h-3" />
          {isConnected ? "COMM ARRAY UPLINK ACTIVE" : "OFFLINE"}
       </div>
    </div>
  );
}