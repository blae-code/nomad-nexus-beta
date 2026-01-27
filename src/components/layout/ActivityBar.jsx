import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  LayoutGrid, 
  Radio, 
  ShieldAlert, 
  Coins, 
  Users,
  Lock,
  Rocket,
  Target,
  MessageSquare,
  UserCircle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import NavItem from "@/components/layout/NavItem";
import { SURFACE_BG_CLASS, SURFACE_BORDER_CLASS } from "@/components/layout/headerStyles";

/**
 * ⚠️ DEPRECATED: ActivityBar (Legacy)
 * 
 * Do not use this component. The app now uses AppShellV3.
 * This component will be removed in a future version.
 */
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

  const ActivityNavItem = ({ icon: Icon, label, page, alertColor, isAlertActive, path, pulseFast }) => {
    const isActive = window.location.pathname.includes(page);
    
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <NavItem
              href={path || createPageUrl(page)}
              icon={Icon}
              isActive={isActive}
              size="md"
            >
              
              {/* Corner Accents (Tech Look) */}
              {/* Status Indicator Light */}
              {isAlertActive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", alertColor, pulseFast ? "animate-ping duration-500" : "animate-ping")}></span>
                  <span className={cn("relative inline-flex rounded-full h-3 w-3", alertColor)}></span>
                </span>
              )}
            </NavItem>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs tracking-widest uppercase rounded-none">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <aside
      className={cn(
        "w-14 flex flex-col items-center py-4 gap-2 shrink-0 z-40 shadow-xl border-r",
        SURFACE_BG_CLASS,
        SURFACE_BORDER_CLASS
      )}
    >
      
      <ActivityNavItem 
        icon={LayoutGrid} 
        label="Hub" 
        page="Hub" 
      />

      <div className="w-8 h-[1px] bg-zinc-800/50 my-1" />

      <ActivityNavItem 
        icon={Target} 
        label="Operations" 
        page="Events" 
        alertColor="bg-amber-500"
        isAlertActive={hasEventSoon}
      />

      <ActivityNavItem 
        icon={Radio} 
        label="Comms" 
        page="CommsConsole" 
        alertColor="bg-green-500"
        isAlertActive={isCommsConnected}
      />

      <ActivityNavItem 
        icon={ShieldAlert} 
        label="Rescue" 
        page="CommsConsole" 
        path={createPageUrl('CommsConsole') + '?view=rescue'}
        alertColor="bg-red-600"
        isAlertActive={hasRescue}
        pulseFast={true}
      />

      <div className="w-8 h-[1px] bg-zinc-800/50 my-1" />

      <ActivityNavItem 
        icon={Rocket} 
        label="Fleet" 
        page="FleetManager" 
      />

      <ActivityNavItem 
        icon={Coins} 
        label="Treasury" 
        page="Treasury" 
      />

      <div className="w-8 h-[1px] bg-zinc-800/50 my-1" />

      <ActivityNavItem 
        icon={MessageSquare} 
        label="Channels" 
        page="Channels" 
      />

      <ActivityNavItem 
        icon={Users} 
        label="Roster" 
        page="Ranks" 
      />

      <div className="flex-1" />

      <ActivityNavItem 
        icon={UserCircle} 
        label="Profile" 
        page="Profile" 
      />

      <ActivityNavItem 
        icon={Lock} 
        label="Admin" 
        page="Admin" 
      />

    </aside>
  );
}
