import React from "react";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  LayoutGrid, 
  Radio, 
  Calendar, 
  ShieldAlert, 
  Coins, 
  Users,
  Lock
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function ActivityBar() {
  // 1. Rescue Check
  const { data: hasRescue } = useQuery({
    queryKey: ['nav-rescue-check'],
    queryFn: async () => {
      const distress = await base44.entities.PlayerStatus.list({
        filter: { status: 'DISTRESS' },
        limit: 1
      });
      return distress.length > 0;
    },
    refetchInterval: 5000
  });

  // 2. Event Check (Next 12h)
  const { data: hasEventSoon } = useQuery({
    queryKey: ['nav-event-check'],
    queryFn: async () => {
      const now = new Date();
      const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      
      const events = await base44.entities.Event.list({
        filter: { status: 'scheduled' },
        sort: { start_time: 1 },
        limit: 5
      });
      
      return events.some(e => {
        const start = new Date(e.start_time);
        return start > now && start < twelveHoursLater;
      });
    },
    refetchInterval: 60000
  });

  // 3. Comms Check (Placeholder / Simple User Check)
  const { data: isCommsConnected } = useQuery({
    queryKey: ['nav-comms-check'],
    queryFn: async () => {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return false;
      const status = await base44.entities.PlayerStatus.list({
        user_id: user.id,
        limit: 1
      });
      // Simple check: if they have a status record that isn't OFFLINE
      return status.length > 0 && status[0].status !== 'OFFLINE';
    }
  });

  const NavItem = ({ icon: Icon, label, page, alertColor, isAlertActive, path, pulseFast }) => {
    const isActive = window.location.pathname.includes(page);
    
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <a 
              href={path || createPageUrl(page)} 
              className={cn(
                "relative w-10 h-10 flex items-center justify-center border transition-all duration-200 group",
                isActive 
                  ? "bg-zinc-900 border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.1)]" 
                  : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 hover:bg-zinc-900"
              )}
            >
              <Icon className="w-5 h-5" />
              
              {/* Corner Accents (Tech Look) */}
              <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-current opacity-0 group-hover:opacity-50 transition-opacity" />
              <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-current opacity-0 group-hover:opacity-50 transition-opacity" />

              {/* Status Indicator Light */}
              {isAlertActive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", alertColor, pulseFast ? "animate-ping duration-500" : "animate-ping")}></span>
                  <span className={cn("relative inline-flex rounded-full h-3 w-3", alertColor)}></span>
                </span>
              )}
            </a>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs tracking-widest uppercase rounded-none">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <aside className="w-14 bg-[#0c0c0e] border-r border-zinc-800 flex flex-col items-center py-4 gap-3 shrink-0 z-40 shadow-xl">
      
      <NavItem 
        icon={LayoutGrid} 
        label="Dashboard" 
        page="NomadOpsDashboard" 
      />

      <div className="w-8 h-[1px] bg-zinc-800/50 my-1" />

      <NavItem 
        icon={ShieldAlert} 
        label="Rescue Ops" 
        page="CommsConsole" 
        path={createPageUrl('CommsConsole') + '?view=rescue'}
        alertColor="bg-red-600"
        isAlertActive={hasRescue}
        pulseFast={true}
      />

      <NavItem 
        icon={Calendar} 
        label="Events" 
        page="Events" 
        alertColor="bg-amber-500"
        isAlertActive={hasEventSoon}
      />

      <NavItem 
        icon={Radio} 
        label="Comms" 
        page="CommsConsole" 
        alertColor="bg-green-500"
        isAlertActive={isCommsConnected}
      />

      <div className="w-8 h-[1px] bg-zinc-800/50 my-1" />

      <NavItem 
        icon={Coins} 
        label="Treasury" 
        page="Treasury" 
      />

      <NavItem 
        icon={Users} 
        label="Personnel" 
        page="Channels" // Assuming Channels or a roster page
      />

      <div className="w-8 h-[1px] bg-zinc-800/50 my-1" />

      <NavItem 
        icon={Lock} 
        label="Admin" 
        page="Admin" 
      />

    </aside>
  );
}