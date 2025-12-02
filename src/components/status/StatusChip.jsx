import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, Skull, Plane, Radio, Zap, Home, AlertTriangle } from "lucide-react";

export const STATUS_CONFIG = {
  READY: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50", icon: Radio, label: "READY" },
  IN_QUANTUM: { color: "bg-blue-500/20 text-blue-400 border-blue-500/50", icon: Plane, label: "QUANTUM" },
  ENGAGED: { color: "bg-orange-500/20 text-orange-400 border-orange-500/50", icon: Zap, label: "ENGAGED" },
  DOWN: { color: "bg-red-900/40 text-red-500 border-red-500/50", icon: Skull, label: "DOWN" },
  RTB: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: Home, label: "RTB" },
  DISTRESS: { color: "bg-red-600 text-white border-red-400 animate-pulse", icon: AlertTriangle, label: "DISTRESS" },
  OFFLINE: { color: "bg-zinc-800/50 text-zinc-500 border-zinc-700", icon: Activity, label: "OFFLINE" }
};

export default function StatusChip({ status, showLabel = true, className, size = "sm" }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-mono font-bold border flex items-center gap-1.5 transition-colors",
        config.color,
        size === "xs" && "text-[9px] px-1 h-4",
        size === "sm" && "text-[10px] px-2 h-5",
        size === "md" && "text-xs px-2.5 h-6",
        className
      )}
    >
      <Icon className={cn(
        size === "xs" && "w-2.5 h-2.5",
        size === "sm" && "w-3 h-3",
        size === "md" && "w-3.5 h-3.5"
      )} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}