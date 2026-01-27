import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Users, Radio, ShieldAlert, AlertCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Squad Net Quick Access
 * Simplified UI for squad leaders to join/manage squad comms
 * Shows only relevant nets for the squad
 */
export default function SquadNetQuickAccess({ 
  squadId, 
  allNets = [], 
  selectedNetId = null, 
  onSelectNet,
  squadDistressStatus = false,
  currentUserRank = 'Vagrant',
  participantCounts = {},
  isLoading = false
}) {
  // Filter nets for this squad
  const squadNets = useMemo(() => {
    if (!squadId) return [];
    
    return allNets.filter(net => 
      net.linked_squad_id === squadId || 
      (net.type === 'general' || net.type === 'command') // Also show general comms
    ).sort((a, b) => {
      // Prioritize squad-specific nets, then command, then general
      const aLinked = a.linked_squad_id === squadId ? 0 : 1;
      const bLinked = b.linked_squad_id === squadId ? 0 : 1;
      if (aLinked !== bLinked) return aLinked - bLinked;
      return (a.priority || 3) - (b.priority || 3);
    });
  }, [allNets, squadId]);

  // Separate nets into categories
  const netsByCategory = useMemo(() => {
    return {
      squad: squadNets.filter(n => n.linked_squad_id === squadId),
      command: squadNets.filter(n => n.type === 'command' && n.linked_squad_id !== squadId),
      general: squadNets.filter(n => n.type === 'general')
    };
  }, [squadNets, squadId]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <div className="h-6 bg-zinc-800 animate-pulse rounded" />
        <div className="h-12 bg-zinc-800 animate-pulse rounded" />
      </div>
    );
  }

  const renderNetButton = (net) => {
    const isSelected = selectedNetId === net.id;
    const participantCount = participantCounts[net.id] || 0;
    const canJoin = !net.allowed_role_tags || net.allowed_role_tags.length === 0;
    
    return (
      <motion.div
        key={net.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => onSelectNet(net)}
          disabled={!canJoin}
          className={cn(
            "w-full text-left transition-all duration-200 p-3 rounded border-l-4",
            isSelected
              ? "bg-emerald-950/40 border-l-emerald-500 border border-emerald-900/50"
              : "bg-zinc-900/40 border-l-zinc-700 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60",
            !canJoin && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white tracking-tight">{net.code}</span>
                
                {squadDistressStatus && net.linked_squad_id === squadId && (
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" title="Squad in Distress" />
                )}
                
                {net.type === 'command' && (
                  <Lock className="w-3 h-3 text-red-500/60 flex-shrink-0" title="Command Net" />
                )}
                
                {net.is_default_for_squad && (
                  <Badge className="text-[8px] bg-amber-900/50 text-amber-300 border-amber-700">DEFAULT</Badge>
                )}
              </div>
              
              <p className="text-xs text-zinc-400 truncate font-mono">{net.label}</p>
            </div>

            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              {participantCount > 0 && (
                <Badge className="text-[9px] bg-zinc-800 text-zinc-300 h-5 px-1.5 flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  {participantCount}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 p-0",
                  isSelected 
                    ? "text-red-500 hover:text-red-400 hover:bg-red-950/30" 
                    : "text-emerald-600 hover:text-emerald-400 hover:bg-emerald-950/30"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNet(isSelected ? null : net);
                }}
                title={isSelected ? "Leave Net" : "Join Net"}
              >
                {isSelected ? <PhoneOff className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </button>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 py-2 border-b border-zinc-800">
        <Radio className="w-4 h-4 text-[#ea580c]" />
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">SQUAD COMMS</span>
        {squadDistressStatus && (
          <AlertCircle className="w-3 h-3 ml-auto text-red-500 animate-pulse" />
        )}
      </div>

      {/* Squad-Specific Nets */}
      {netsByCategory.squad.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase text-zinc-500 font-mono px-1 tracking-wider">Your Squad Nets</div>
          <div className="space-y-2">
            {netsByCategory.squad.map(renderNetButton)}
          </div>
        </div>
      )}

      {/* Command Nets */}
      {netsByCategory.command.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase text-zinc-500 font-mono px-1 tracking-wider">Command Nets</div>
          <div className="space-y-2">
            {netsByCategory.command.map(renderNetButton)}
          </div>
        </div>
      )}

      {/* General Comms */}
      {netsByCategory.general.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase text-zinc-500 font-mono px-1 tracking-wider">General Comms</div>
          <div className="space-y-2">
            {netsByCategory.general.map(renderNetButton)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {squadNets.length === 0 && (
        <div className="p-8 text-center bg-zinc-900/30 rounded border border-zinc-800">
          <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-zinc-500 font-mono">No squad nets configured</p>
        </div>
      )}

      {/* Current Selection Info */}
      {selectedNetId && squadNets.find(n => n.id === selectedNetId) && (
        <div className="p-2 bg-emerald-950/30 border border-emerald-900/50 rounded text-xs text-emerald-300 space-y-1">
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            <span>Connected to <strong>{squadNets.find(n => n.id === selectedNetId)?.code}</strong></span>
          </div>
          {participantCounts[selectedNetId] > 1 && (
            <div className="text-emerald-400 text-[10px]">
              {participantCounts[selectedNetId]} users on this net
            </div>
          )}
        </div>
      )}
    </div>
  );
}