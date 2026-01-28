import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function SignalStrength({ strength = 4, className }) {
  return (
    <div className={cn("flex items-end gap-0.5 h-4", className)}>
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={cn(
            "w-1 rounded-t-[1px]",
            level === 4 ? "h-full" : level === 3 ? "h-[75%]" : level === 2 ? "h-[50%]" : "h-[25%]",
            level <= strength ? "bg-emerald-500" : "bg-zinc-800"
          )}
        />
      ))}
    </div>
  );
}

export function PermissionBadge({ canTx, minRankTx, minRankRx, className }) {
  if (canTx) {
    return (
      <Badge variant="outline" className={cn("text-[10px] font-mono border-emerald-900/50 bg-emerald-950/20 text-emerald-500 tracking-wider", className)}>
        TX ENABLED
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("text-[10px] font-mono border-red-900/50 bg-red-950/20 text-red-500 tracking-wider", className)}>
      RX ONLY (REQ: {minRankTx})
    </Badge>
  );
}

export function TerminalCard({ children, className, active = false, danger = false }) {
  return (
    <Card className={cn(
      "bg-zinc-950 border-zinc-800 relative overflow-hidden transition-colors",
      active && "border-zinc-700 bg-zinc-900/50",
      danger && "border-red-900/30 bg-red-950/5",
      className
    )}>
      {/* Scanline effect overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" style={{ backgroundSize: "100% 2px, 3px 100%" }} />
      {children}
    </Card>
  );
}

export function NetTypeIcon({ type }) {
  if (type === 'command') return <div className="w-2 h-2 rounded-sm bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />;
  if (type === 'squad') return <div className="w-2 h-2 rounded-full bg-blue-500" />;
  if (type === 'general') return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
  return <div className="w-2 h-2 rounded-full bg-zinc-500" />;
}