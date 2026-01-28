import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Radio, Network, Trash2, Power, Lock, Unlock,
  Shield, AlertTriangle, CheckCircle, Loader2, Zap, Command
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TacticalMapPanel from '@/components/admin/TacticalMapPanel';

export default function CommsArray() {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [provisionStatus, setProvisionStatus] = useState(null);
  const [selectedNet, setSelectedNet] = useState(null);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const queryClient = useQueryClient();

  // Data queries
  const { data: events = [] } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => base44.entities.Event.list('-created_date', 50)
  });

  const { data: voiceNets = [] } = useQuery({
    queryKey: ['voice-nets', selectedEventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: selectedEventId }),
    enabled: !!selectedEventId,
    refetchInterval: 5000
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list()
  });

  const { data: userPresence = [] } = useQuery({
    queryKey: ['user-presence', selectedEventId],
    queryFn: () => base44.entities.UserPresence.filter({ event_id: selectedEventId }),
    enabled: !!selectedEventId,
    refetchInterval: 2000
  });

  const { data: voiceNetStatus = [] } = useQuery({
    queryKey: ['voice-net-status', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const netIds = voiceNets.map(n => n.id);
      const statuses = await Promise.all(
        netIds.map(id => base44.entities.VoiceNetStatus.filter({ net_id: id }).catch(() => []))
      );
      return statuses.flat();
    },
    enabled: !!selectedEventId && voiceNets.length > 0,
    refetchInterval: 3000
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list()
  });

  // Mutations
  const provisionMutation = useMutation({
    mutationFn: async (eventId) => {
      const res = await base44.functions.invoke('provisionCommsFromFormation', { eventId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['voice-nets']);
      setProvisionStatus({ success: true, data });
      toast.success(`Provisioned ${data.summary?.total || 0} nets`);
    },
    onError: (error) => {
      setProvisionStatus({ success: false, error: error.message });
      toast.error('Provisioning failed');
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async (eventId) => {
      const nets = await base44.asServiceRole.entities.VoiceNet.filter({ event_id: eventId });
      await Promise.all(nets.map(net => base44.asServiceRole.entities.VoiceNet.delete(net.id)));
      return nets.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(['voice-nets']);
      setProvisionStatus(null);
      toast.success(`Deleted ${count} nets`);
    }
  });

  const updateNetMutation = useMutation({
    mutationFn: async ({ netId, data }) => {
      await base44.asServiceRole.entities.VoiceNet.update(netId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['voice-nets']);
      toast.success('Net updated');
    }
  });

  // Handlers
  const handleProvision = () => {
    if (!selectedEventId) return;
    setProvisionStatus(null);
    provisionMutation.mutate(selectedEventId);
  };

  const handleDeleteAll = () => {
    if (!selectedEventId || voiceNets.length === 0) return;
    if (confirm(`Delete all ${voiceNets.length} nets for this event?`)) {
      deleteAllMutation.mutate(selectedEventId);
    }
  };

  const toggleNetStatus = (net) => {
    updateNetMutation.mutate({
      netId: net.id,
      data: { status: net.status === 'active' ? 'inactive' : 'active' }
    });
  };

  const toggleDiscipline = (net) => {
    updateNetMutation.mutate({
      netId: net.id,
      data: { discipline: net.discipline === 'casual' ? 'focused' : 'casual' }
    });
  };

  const toggleStageMode = (net) => {
    updateNetMutation.mutate({
      netId: net.id,
      data: { stage_mode: !net.stage_mode }
    });
  };

  // Stats
  const fleets = squads.filter(u => u.hierarchy_level === 'fleet');
  const wings = squads.filter(u => u.hierarchy_level === 'wing');
  const regularSquads = squads.filter(u => u.hierarchy_level === 'squad' || !u.hierarchy_level);
  const expectedNetCount = fleets.length + wings.length + regularSquads.length + 2;

  const netsByType = {
    command: voiceNets.filter(n => n.type === 'command'),
    squad: voiceNets.filter(n => n.type === 'squad'),
    support: voiceNets.filter(n => n.type === 'support'),
    general: voiceNets.filter(n => n.type === 'general')
  };

  return (
    <div className="flex gap-3 h-[calc(100vh-200px)] min-h-0">
      {/* LEFT PANEL: Controls */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
      {/* Technical Header */}
      <div className="relative border border-zinc-800 bg-zinc-950">
        <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-[#ea580c]" />
        <div className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-[#ea580c]" />
        <div className="absolute -bottom-[1px] -left-[1px] w-2 h-2 border-b border-l border-[#ea580c]" />
        <div className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b border-r border-[#ea580c]" />
        
        <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-[#ea580c]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">COMMS ARRAY // CONTROL INTERFACE</span>
          </div>
        </div>

        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="text-[8px] text-zinc-600 uppercase font-mono mb-1 tracking-wider">TARGET EVENT</div>
              <Select value={selectedEventId || ''} onValueChange={setSelectedEventId}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 h-7 text-xs font-mono">
                  <SelectValue placeholder="SELECT TARGET..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id} className="text-xs font-mono">
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEventId && (
              <div className="w-24">
                <div className="text-[8px] text-zinc-600 uppercase font-mono mb-1 tracking-wider">NETS</div>
                <div className="h-7 flex items-center justify-center bg-zinc-900 border border-zinc-800">
                  <span className="text-sm font-black text-[#ea580c] font-mono">{voiceNets.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formation Grid */}
      <div className="border border-zinc-800 bg-zinc-950">
        <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Network className="w-3 h-3 text-cyan-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">FORMATION</span>
          </div>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-5 gap-2">
            <FormationCell label="FLEETS" count={fleets.length} color="amber" />
            <FormationCell label="WINGS" count={wings.length} color="cyan" />
            <FormationCell label="SQUADS" count={regularSquads.length} color="emerald" />
            <FormationCell label="SUPPORT" count={2} color="zinc" />
            <FormationCell label="EXPECTED" count={expectedNetCount} color="orange" highlight />
          </div>
        </div>
      </div>

      {/* Provision Controls */}
      {selectedEventId && (
        <div className="border border-zinc-800 bg-zinc-950">
          <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <Command className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">PROVISION</span>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleProvision}
                disabled={provisionMutation.isPending || voiceNets.length > 0}
                className={cn(
                  "flex-1 h-8 flex items-center justify-center gap-2 border transition-all font-mono text-xs uppercase tracking-wider",
                  provisionMutation.isPending || voiceNets.length > 0
                    ? "bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed"
                    : "bg-emerald-950 border-emerald-800 text-emerald-400 hover:bg-emerald-900 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                )}
              >
                {provisionMutation.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    <span>Auto-Provision</span>
                  </>
                )}
              </button>

              {voiceNets.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={deleteAllMutation.isPending}
                  className="h-8 px-3 flex items-center gap-2 bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 transition-all font-mono text-xs uppercase tracking-wider"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Purge</span>
                </button>
              )}
            </div>

            {voiceNets.length > 0 && (
              <div className="text-[9px] text-amber-500 p-2 bg-amber-950/10 border border-amber-900/30 font-mono">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                NETS EXIST // PURGE TO RE-PROVISION
              </div>
            )}

            {provisionStatus && (
              <div className={cn(
                "p-2 border text-[9px] font-mono",
                provisionStatus.success 
                  ? "bg-emerald-950/20 border-emerald-900/50 text-emerald-400" 
                  : "bg-red-950/20 border-red-900/50 text-red-400"
              )}>
                <div className="flex items-center gap-1.5 mb-1.5 font-bold uppercase tracking-wider">
                  {provisionStatus.success ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {provisionStatus.success ? 'SUCCESS' : 'FAILED'}
                </div>
                {provisionStatus.success && provisionStatus.data?.summary && (
                  <div className="space-y-0.5 pl-4">
                    <div>FLT: {provisionStatus.data.summary.fleet_command || 0}</div>
                    <div>WNG: {provisionStatus.data.summary.wings || 0}</div>
                    <div>SQD: {provisionStatus.data.summary.squads || 0}</div>
                    <div>SUP: {provisionStatus.data.summary.support || 0}</div>
                    <div className="font-bold pt-1 border-t border-zinc-800 mt-1 text-emerald-500">
                      TOT: {provisionStatus.data.summary.total || 0}
                    </div>
                  </div>
                )}
                {!provisionStatus.success && (
                  <div className="pl-4">{provisionStatus.error}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Net Grid */}
      {selectedEventId && voiceNets.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-950">
          <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-zinc-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">ACTIVE NETS</span>
            </div>
            <Badge className="bg-[#ea580c]/10 text-[#ea580c] border-[#ea580c]/30 text-[8px] h-4 px-1.5 font-mono">
              {voiceNets.length}
            </Badge>
          </div>
          <ScrollArea className="h-[450px]">
            <div className="p-3 space-y-2">
              {Object.entries(netsByType).map(([type, nets]) => (
                nets.length > 0 && (
                  <div key={type}>
                    <div className="text-[8px] text-zinc-600 uppercase font-bold mb-1.5 font-mono tracking-widest flex items-center gap-1.5">
                      <div className="h-px flex-1 bg-zinc-800" />
                      <span>{type}</span>
                      <span className="text-zinc-700">({nets.length})</span>
                      <div className="h-px flex-1 bg-zinc-800" />
                    </div>
                    <div className="space-y-1">
                      {nets.map(net => (
                        <NetCard
                          key={net.id}
                          net={net}
                          onToggleStatus={toggleNetStatus}
                          onToggleDiscipline={toggleDiscipline}
                          onToggleStageMode={toggleStageMode}
                          onConfigure={() => {
                            setSelectedNet(net);
                            setShowAdvancedConfig(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      </div>

      {/* RIGHT PANEL: Voice Utilities & Mapping */}
      <div className="w-80 space-y-3 overflow-y-auto shrink-0">
        {/* Advanced Config Modal */}
        {showAdvancedConfig && selectedNet && (
          <AdvancedNetConfig
            net={selectedNet}
            roles={roles}
            onClose={() => {
              setShowAdvancedConfig(false);
              setSelectedNet(null);
            }}
            onSave={(data) => {
              updateNetMutation.mutate({ netId: selectedNet.id, data });
              setShowAdvancedConfig(false);
              setSelectedNet(null);
            }}
          />
        )}
        {/* Voice Utilities */}
        <div className="border border-zinc-800 bg-zinc-950 sticky top-0">
          <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-[#ea580c]" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">VOICE UTILITIES</span>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <VoiceUtilityButton
              label="TEST CONNECTION"
              icon={Zap}
              onClick={() => toast.info('Testing voice connection...')}
            />
            <VoiceUtilityButton
              label="ROOM STATUS"
              icon={Network}
              onClick={() => toast.info('Fetching room status...')}
            />
            <VoiceUtilityButton
              label="CLEAR CACHE"
              icon={Trash2}
              onClick={() => toast.info('Clearing voice cache...')}
            />
          </div>
        </div>

        {/* Net Mapping */}
        {selectedEventId && voiceNets.length > 0 && (
          <div className="border border-zinc-800 bg-zinc-950">
            <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Network className="w-3 h-3 text-cyan-500" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">LIVE MONITORING</span>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="p-3">
                <NetHierarchy 
                  nets={voiceNets} 
                  userPresence={userPresence}
                  voiceNetStatus={voiceNetStatus}
                  users={users}
                />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Stats Panel */}
        {selectedEventId && voiceNets.length > 0 && (
          <div className="border border-zinc-800 bg-zinc-950">
            <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-zinc-500" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">STATISTICS</span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <StatRow label="TOTAL NETS" value={voiceNets.length} />
              <StatRow label="ACTIVE" value={voiceNets.filter(n => n.status === 'active').length} color="emerald" />
              <StatRow label="USERS ONLINE" value={userPresence.length} color="cyan" />
              <StatRow label="TRANSMITTING" value={userPresence.filter(p => p.is_transmitting).length} color="orange" />
              <div className="h-px bg-zinc-800 my-2" />
              <StatRow label="JAMMED NETS" value={voiceNetStatus.filter(s => s.is_jammed).length} color="red" />
              <StatRow label="AVG SIGNAL" value={`${Math.round(voiceNetStatus.reduce((acc, s) => acc + (s.signal_strength || 100), 0) / (voiceNetStatus.length || 1))}%`} color="emerald" />
              <StatRow label="PKT LOSS" value={`${(voiceNetStatus.reduce((acc, s) => acc + (s.packet_loss_percent || 0), 0) / (voiceNetStatus.length || 1)).toFixed(1)}%`} color="amber" />
            </div>
          </div>
        )}

        {/* Tactical Map */}
        {selectedEventId && voiceNets.length > 0 && (
          <div className="border border-zinc-800 bg-zinc-950 h-[500px]">
            <TacticalMapPanel
              eventId={selectedEventId}
              nets={voiceNets}
              userPresence={userPresence}
              voiceNetStatus={voiceNetStatus}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceUtilityButton({ label, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full h-7 flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all text-[9px] font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-300 px-2"
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </button>
  );
}

function NetHierarchy({ nets, userPresence, voiceNetStatus, users }) {
  const [hoveredNet, setHoveredNet] = useState(null);

  const netsByType = {
    command: nets.filter(n => n.type === 'command'),
    squad: nets.filter(n => n.type === 'squad'),
    support: nets.filter(n => n.type === 'support'),
    general: nets.filter(n => n.type === 'general')
  };

  const getUsersOnNet = (netId) => {
    return userPresence.filter(p => p.net_id === netId);
  };

  const getNetStatus = (netId) => {
    return voiceNetStatus.find(s => s.net_id === netId);
  };

  const getUserById = (userId) => {
    return users.find(u => u.id === userId);
  };

  const getSignalColor = (strength = 100) => {
    if (strength >= 75) return { border: 'border-emerald-500', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]', text: 'text-emerald-500' };
    if (strength >= 50) return { border: 'border-yellow-500', glow: 'shadow-[0_0_8px_rgba(234,179,8,0.4)]', text: 'text-yellow-500' };
    if (strength >= 25) return { border: 'border-amber-500', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]', text: 'text-amber-500' };
    return { border: 'border-red-500', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]', text: 'text-red-500' };
  };

  // Build topology layers
  const commandLayer = netsByType.command;
  const squadLayer = netsByType.squad;
  const supportLayer = [...netsByType.support, ...netsByType.general];

  return (
    <div className="space-y-4 relative">
      {/* Command Layer */}
      {commandLayer.length > 0 && (
        <div className="space-y-2">
          <div className="text-[7px] text-red-500 uppercase font-bold font-mono tracking-widest flex items-center gap-1">
            <div className="h-px flex-1 bg-red-900/30" />
            <span>COMMAND</span>
            <div className="h-px flex-1 bg-red-900/30" />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {commandLayer.map(net => (
              <NetNode
                key={net.id}
                net={net}
                netStatus={getNetStatus(net.id)}
                usersOnNet={getUsersOnNet(net.id)}
                users={users}
                getUserById={getUserById}
                getSignalColor={getSignalColor}
                isHovered={hoveredNet === net.id}
                onHover={setHoveredNet}
                type="command"
              />
            ))}
          </div>
        </div>
      )}

      {/* Connection Lines */}
      {commandLayer.length > 0 && squadLayer.length > 0 && (
        <div className="flex justify-center">
          <svg width="100%" height="24" className="overflow-visible">
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <line x1="50%" y1="0" x2="50%" y2="24" stroke="url(#connectionGradient)" strokeWidth="1" strokeDasharray="2,2" />
          </svg>
        </div>
      )}

      {/* Squad Layer */}
      {squadLayer.length > 0 && (
        <div className="space-y-2">
          <div className="text-[7px] text-emerald-500 uppercase font-bold font-mono tracking-widest flex items-center gap-1">
            <div className="h-px flex-1 bg-emerald-900/30" />
            <span>SQUADS</span>
            <div className="h-px flex-1 bg-emerald-900/30" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {squadLayer.map(net => (
              <NetNode
                key={net.id}
                net={net}
                netStatus={getNetStatus(net.id)}
                usersOnNet={getUsersOnNet(net.id)}
                users={users}
                getUserById={getUserById}
                getSignalColor={getSignalColor}
                isHovered={hoveredNet === net.id}
                onHover={setHoveredNet}
                type="squad"
              />
            ))}
          </div>
        </div>
      )}

      {/* Support Layer */}
      {supportLayer.length > 0 && (
        <div className="space-y-2">
          <div className="text-[7px] text-cyan-500 uppercase font-bold font-mono tracking-widest flex items-center gap-1">
            <div className="h-px flex-1 bg-cyan-900/30" />
            <span>SUPPORT</span>
            <div className="h-px flex-1 bg-cyan-900/30" />
          </div>
          <div className="flex gap-2">
            {supportLayer.map(net => (
              <NetNode
                key={net.id}
                net={net}
                netStatus={getNetStatus(net.id)}
                usersOnNet={getUsersOnNet(net.id)}
                users={users}
                getUserById={getUserById}
                getSignalColor={getSignalColor}
                isHovered={hoveredNet === net.id}
                onHover={setHoveredNet}
                type="support"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NetNode({ net, netStatus, usersOnNet, users, getUserById, getSignalColor, isHovered, onHover, type }) {
  const signalStrength = netStatus?.signal_strength || 100;
  const signalColors = getSignalColor(signalStrength);
  const hasAnomalies = netStatus?.is_jammed || (netStatus?.packet_loss_percent || 0) > 5;
  const transmittingUsers = usersOnNet.filter(p => p.is_transmitting);

  const typeColors = {
    command: { bg: 'bg-red-950/30', border: 'border-red-800', text: 'text-red-400' },
    squad: { bg: 'bg-emerald-950/30', border: 'border-emerald-800', text: 'text-emerald-400' },
    support: { bg: 'bg-cyan-950/30', border: 'border-cyan-800', text: 'text-cyan-400' }
  };

  const colors = typeColors[type] || typeColors.support;

  return (
    <div
      className={cn(
        "relative border transition-all duration-200 cursor-pointer flex-1 min-w-0",
        colors.bg,
        isHovered ? signalColors.border : colors.border,
        isHovered && signalColors.glow,
        hasAnomalies && "animate-pulse"
      )}
      onMouseEnter={() => onHover(net.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Anomaly Overlays */}
      {netStatus?.is_jammed && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border border-red-900 flex items-center justify-center animate-pulse">
          <AlertTriangle className="w-2 h-2 text-white" />
        </div>
      )}
      {netStatus && netStatus.packet_loss_percent > 5 && (
        <div className="absolute -bottom-1 -right-1 text-[6px] bg-amber-500 border border-amber-900 px-1 font-mono text-black font-bold">
          {netStatus.packet_loss_percent.toFixed(0)}%
        </div>
      )}

      {/* Net Header */}
      <div className="p-2 border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <div className={cn(
              "w-1 h-1",
              net.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-zinc-700"
            )} />
            <span className={cn("text-[8px] font-black font-mono tracking-wider", colors.text)}>
              {net.code}
            </span>
          </div>
          <SignalStrength strength={signalStrength} />
        </div>
        <div className="text-[7px] text-zinc-600 font-mono truncate">{net.label}</div>
      </div>

      {/* User Presence */}
      <div className="p-1.5 min-h-[24px]">
        {usersOnNet.length > 0 ? (
          <div className="space-y-0.5">
            {usersOnNet.slice(0, 3).map(presence => {
              const user = getUserById(presence.user_id);
              const isTransmitting = presence.is_transmitting;
              
              return (
                <div 
                  key={presence.id}
                  className={cn(
                    "text-[7px] font-mono flex items-center gap-1",
                    isTransmitting && "text-[#ea580c] font-bold"
                  )}
                >
                  <div className={cn(
                    "w-0.5 h-0.5 rounded-full",
                    isTransmitting 
                      ? "bg-[#ea580c] shadow-[0_0_6px_rgba(234,88,12,0.8)] animate-pulse" 
                      : "bg-emerald-500"
                  )} />
                  <span className="truncate">{user?.callsign || user?.rsi_handle || 'UNK'}</span>
                  {isTransmitting && <span className="text-[6px]">TX</span>}
                </div>
              );
            })}
            {usersOnNet.length > 3 && (
              <div className="text-[6px] text-zinc-700 font-mono">+{usersOnNet.length - 3} more</div>
            )}
          </div>
        ) : (
          <div className="text-[7px] text-zinc-700 font-mono">NO USERS</div>
        )}
      </div>

      {/* Bottleneck Indicator */}
      {usersOnNet.length > 8 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500/50" />
      )}
    </div>
  );
}

function SignalStrength({ strength = 100 }) {
  const bars = Math.ceil((strength / 100) * 4);
  const getColor = () => {
    if (strength >= 75) return 'bg-emerald-500';
    if (strength >= 50) return 'bg-yellow-500';
    if (strength >= 25) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={cn(
            "w-0.5 transition-all",
            i <= bars ? getColor() : "bg-zinc-800",
            i === 1 && "h-1",
            i === 2 && "h-1.5",
            i === 3 && "h-2",
            i === 4 && "h-2.5"
          )}
        />
      ))}
    </div>
  );
}

function StatRow({ label, value, color = 'zinc' }) {
  const colorClasses = {
    emerald: 'text-emerald-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
    cyan: 'text-cyan-500',
    orange: 'text-[#ea580c]',
    zinc: 'text-zinc-500'
  };

  return (
    <div className="flex items-center justify-between text-[9px] font-mono">
      <span className="text-zinc-600 uppercase tracking-wider">{label}</span>
      <span className={cn("font-black", colorClasses[color])}>{value}</span>
    </div>
  );
}

function FormationCell({ label, count, color, highlight }) {
  const colorClasses = {
    amber: 'border-amber-900/30 text-amber-500',
    cyan: 'border-cyan-900/30 text-cyan-500',
    emerald: 'border-emerald-900/30 text-emerald-500',
    zinc: 'border-zinc-700 text-zinc-400',
    orange: 'border-[#ea580c]/30 text-[#ea580c] bg-[#ea580c]/5'
  };

  return (
    <div className={cn(
      "border bg-zinc-900/50 p-2 text-center",
      colorClasses[color],
      highlight && "font-bold"
    )}>
      <div className={cn("text-xl font-black font-mono", highlight && "text-2xl")}>{count}</div>
      <div className="text-[8px] text-zinc-600 uppercase mt-0.5 font-mono tracking-wider">{label}</div>
    </div>
  );
}

function NetCard({ net, onToggleStatus, onToggleDiscipline, onToggleStageMode, onConfigure }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-2 relative group hover:border-zinc-700 transition-colors">
      <div className="absolute -top-[1px] -left-[1px] w-1 h-1 border-t border-l border-zinc-700 group-hover:border-[#ea580c] transition-colors" />
      <div className="absolute -top-[1px] -right-[1px] w-1 h-1 border-t border-r border-zinc-700 group-hover:border-[#ea580c] transition-colors" />
      
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="text-xs font-black font-mono text-white tracking-wider">{net.code}</div>
          <div className={cn(
            "w-1.5 h-1.5",
            net.status === 'active' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-700"
          )} />
        </div>
        <div className="flex items-center gap-1">
          <Badge className={cn(
            "text-[7px] h-3.5 px-1 font-mono uppercase",
            net.discipline === 'focused' ? "bg-red-900/50 text-red-400 border-red-800" : "bg-zinc-800 text-zinc-500 border-zinc-700"
          )}>
            {net.discipline[0]}
          </Badge>
          {net.stage_mode && (
            <Badge className="bg-amber-900/50 text-amber-400 border-amber-800 text-[7px] h-3.5 px-1 font-mono">STG</Badge>
          )}
        </div>
      </div>

      <div className="text-[9px] text-zinc-500 mb-2 font-mono truncate">{net.label}</div>

      <div className="grid grid-cols-3 gap-1 mb-1.5">
        <button
          onClick={() => onToggleStatus(net)}
          className={cn(
            "h-6 flex items-center justify-center gap-1 border transition-all text-[8px] font-mono uppercase tracking-wider",
            net.status === 'active'
              ? "bg-emerald-950/50 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50"
              : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"
          )}
        >
          <Power className="w-2.5 h-2.5" />
          <span>{net.status === 'active' ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={() => onToggleDiscipline(net)}
          className={cn(
            "h-6 flex items-center justify-center gap-1 border transition-all text-[8px] font-mono uppercase tracking-wider",
            net.discipline === 'focused'
              ? "bg-red-950/50 border-red-800 text-red-400 hover:bg-red-900/50"
              : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
          )}
        >
          <Shield className="w-2.5 h-2.5" />
          <span>{net.discipline === 'focused' ? 'FOC' : 'CAS'}</span>
        </button>

        <button
          onClick={() => onToggleStageMode(net)}
          className={cn(
            "h-6 flex items-center justify-center gap-1 border transition-all text-[8px] font-mono uppercase tracking-wider",
            net.stage_mode
              ? "bg-amber-950/50 border-amber-800 text-amber-400 hover:bg-amber-900/50"
              : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"
          )}
        >
          {net.stage_mode ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
          <span>STG</span>
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1.5 border-t border-zinc-800">
        <div className="text-[8px] font-mono flex-1">
          <span className="text-zinc-700">TX:</span>
          <span className="text-zinc-500 ml-1">{net.min_rank_to_tx || 'VAG'}</span>
        </div>
        <div className="w-px h-3 bg-zinc-800" />
        <div className="text-[8px] font-mono flex-1">
          <span className="text-zinc-700">RX:</span>
          <span className="text-zinc-500 ml-1">{net.min_rank_to_rx || 'VAG'}</span>
        </div>
        <button
          onClick={onConfigure}
          className="ml-2 text-zinc-600 hover:text-[#ea580c] transition-colors"
          title="Configure"
        >
          <Settings className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function AdvancedNetConfig({ net, roles, onClose, onSave }) {
  const [config, setConfig] = useState({
    priority: net.priority || 2,
    bandwidth_limit: net.bandwidth_limit || 0,
    max_users: net.max_users || 0,
    allowed_role_ids: net.allowed_role_ids || [],
    require_approval: net.require_approval || false,
    auto_mute_after: net.auto_mute_after || 0,
    custom_properties: net.custom_properties || {}
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#ea580c]" />
            <span className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono">
              NET CONFIG // {net.code}
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <span className="text-xl">×</span>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Priority & Bandwidth */}
          <div className="border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="text-[8px] text-zinc-600 uppercase font-bold mb-3 font-mono tracking-widest">
              PERFORMANCE
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-mono mb-1 block">
                  Priority Level (1=Highest, 5=Lowest)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={config.priority}
                  onChange={e => setConfig({...config, priority: parseInt(e.target.value)})}
                  className="w-full h-7 bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono px-2"
                />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-mono mb-1 block">
                  Bandwidth Limit (kbps, 0=Unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.bandwidth_limit}
                  onChange={e => setConfig({...config, bandwidth_limit: parseInt(e.target.value)})}
                  className="w-full h-7 bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono px-2"
                />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-mono mb-1 block">
                  Max Users (0=Unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.max_users}
                  onChange={e => setConfig({...config, max_users: parseInt(e.target.value)})}
                  className="w-full h-7 bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono px-2"
                />
              </div>
            </div>
          </div>

          {/* Role-Based Permissions */}
          <div className="border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="text-[8px] text-zinc-600 uppercase font-bold mb-3 font-mono tracking-widest">
              ROLE PERMISSIONS
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {roles.map(role => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono p-2 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={config.allowed_role_ids.includes(role.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setConfig({...config, allowed_role_ids: [...config.allowed_role_ids, role.id]});
                      } else {
                        setConfig({...config, allowed_role_ids: config.allowed_role_ids.filter(id => id !== role.id)});
                      }
                    }}
                    className="w-3 h-3"
                  />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Access Control */}
          <div className="border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="text-[8px] text-zinc-600 uppercase font-bold mb-3 font-mono tracking-widest">
              ACCESS CONTROL
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono">
                <input
                  type="checkbox"
                  checked={config.require_approval}
                  onChange={e => setConfig({...config, require_approval: e.target.checked})}
                  className="w-3 h-3"
                />
                <span>Require Admin Approval to Join</span>
              </label>
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-mono mb-1 block">
                  Auto-Mute After (seconds, 0=Disabled)
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.auto_mute_after}
                  onChange={e => setConfig({...config, auto_mute_after: parseInt(e.target.value)})}
                  className="w-full h-7 bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono px-2"
                />
              </div>
            </div>
          </div>

          {/* Custom Properties */}
          <div className="border border-zinc-800 bg-zinc-900/30 p-3">
            <div className="text-[8px] text-zinc-600 uppercase font-bold mb-3 font-mono tracking-widest">
              CUSTOM PROPERTIES
            </div>
            <textarea
              value={JSON.stringify(config.custom_properties, null, 2)}
              onChange={e => {
                try {
                  setConfig({...config, custom_properties: JSON.parse(e.target.value)});
                } catch {}
              }}
              className="w-full h-24 bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-300 font-mono p-2"
              placeholder='{"key": "value"}'
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-2 sticky bottom-0">
          <button
            onClick={onClose}
            className="h-7 px-3 border border-zinc-800 text-zinc-400 hover:border-zinc-700 transition-all text-[9px] font-mono uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(config)}
            className="h-7 px-3 bg-[#ea580c] border border-[#ea580c] text-white hover:bg-[#c2410c] transition-all text-[9px] font-mono uppercase tracking-wider"
          >
            Save Config
          </button>
        </div>
      </div>
    </div>
  );
}