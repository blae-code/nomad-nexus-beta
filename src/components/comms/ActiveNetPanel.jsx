import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Radio, Shield, Activity, Users, RadioReceiver, ScrollText, Lock, Ear, AlertTriangle, Phone, MicOff, Volume2 } from "lucide-react";
import NetStatusBar from "@/components/comms/NetStatusBar";
import { motion, AnimatePresence } from "framer-motion";
import ConnectionTelemetryStrip from "./ConnectionTelemetryStrip";
import { hasMinRank } from "@/components/permissions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TerminalCard, SignalStrength, PermissionBadge, NetTypeIcon } from "@/components/comms/SharedCommsComponents";
import StatusChip from "@/components/status/StatusChip";
import AudioControls from "@/components/comms/AudioControls";
import HailQueue from "@/components/comms/HailQueue";
import VoiceCallIndicator from "./VoiceCallIndicator";
import VolumeControls from "@/components/comms/VolumeControls";
import UserPresencePanel from "./UserPresencePanel";
import { getRankColorClass, getUserRankValue } from "@/components/utils/rankUtils";
import { usePresence } from "@/components/comms/usePresence";
import NetChannelChat from "@/components/comms/NetChannelChat";
import VoiceRecordingControls from "./VoiceRecordingControls";
import RoomDebugPanel from "./RoomDebugPanel";
import { useCommsMode } from '@/components/comms/useCommsMode';
import { Room, RoomEvent } from 'livekit-client';
import { normalizePlayerStatusRecords, normalizePlayerStatus } from '@/components/contracts/normalization';
import { PLAYER_STATUS } from '@/components/contracts/dataContract';
import CommsPreflight from '@/components/comms/CommsPreflight';
import CommsStateChip from './CommsStateChip';
import CommsFailoverBanner from './CommsFailoverBanner';
import CommsFallbackPanel from './CommsFallbackPanel';

function CommsLog({ eventId }) {
  const queryClient = useQueryClient();

  const { data: messages } = useQuery({
    queryKey: ['comms-messages', eventId],
    queryFn: () => base44.entities.Message.list({ 
      sort: { created_date: -1 }, 
      limit: 30 // Reduced from 50
    }),
    enabled: !!eventId,
    staleTime: 8000,
    refetchInterval: false, // Replaced by subscription below
    gcTime: 20000
  });

  // Real-time subscription for comms log updates
  React.useEffect(() => {
    if (!eventId) return;

    const unsubscribe = base44.entities.Message.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['comms-messages', eventId] });
    });

    return () => unsubscribe?.();
  }, [eventId, queryClient]);

  const logs = React.useMemo(() => {
    if (!messages) return [];
    return messages
      .filter(m => m.content.includes('[COMMS LOG]'))
      .slice(0, 6);
  }, [messages]);

  return (
    <div className="space-y-3 pt-4 border-t border-zinc-800">
      <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider pb-2">
         <ScrollText className="w-3 h-3" />
         Signal Log (Recent)
      </div>
      <div className="space-y-2">
         {logs.length === 0 ? (
            <div className="text-[10px] text-zinc-500 italic pl-2">No recent traffic recorded.</div>
         ) : (
            logs.map(log => (
               <div key={log.id} className="text-[10px] font-mono text-zinc-400 pl-2 border-l border-zinc-800">
                  <span className="text-emerald-700 opacity-70 mr-2">
                    {log.created_date ? new Date(log.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : '--:--:--'}
                  </span>
                  <span className="text-zinc-300">{log.content.replace(/\[COMMS LOG\]|Tx on|: \*\*SIMULATED TRANSMISSION\*\*/g, '').trim()}</span>
               </div>
            ))
         )}
      </div>
    </div>
  );
}

function NetRoster({ net, eventId, currentUserState, onWhisper, room }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [activeSpeakers, setActiveSpeakers] = React.useState(new Set());
  const [expandedUser, setExpandedUser] = React.useState(null);
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);
  const myId = currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';

  // Track active speakers from LiveKit - cleanup ensures no duplicate listeners
  React.useEffect(() => {
    if (!room) return;

    const handleSpeakersChanged = (speakers) => {
      const speakerIds = new Set(speakers.map(p => p.identity));
      setActiveSpeakers(speakerIds);
    };

    // Add listener
    room.on(RoomEvent.ActiveSpeakersChanged, handleSpeakersChanged);

    // Cleanup: remove listener on unmount or room change
    return () => {
      try {
        room.off(RoomEvent.ActiveSpeakersChanged, handleSpeakersChanged);
      } catch (err) {
        console.warn('[COMMS] Failed to remove speaker listener:', err);
      }
    };
  }, [room]);

  const { data: rawStatuses = [] } = useQuery({
    queryKey: ['net-roster-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter({ event_id: eventId }),
    enabled: !!eventId,
    staleTime: 5000,
    refetchInterval: false,
    gcTime: 15000,
    initialData: []
  });

  // Normalize all statuses to canonical form
  const statuses = React.useMemo(() => {
    return normalizePlayerStatusRecords(rawStatuses);
  }, [rawStatuses]);

  // Real-time subscription for player status updates
  React.useEffect(() => {
    if (!eventId) return;

    const unsubscribe = base44.entities.PlayerStatus.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['net-roster-statuses', eventId] });
    });

    return () => unsubscribe?.();
  }, [eventId, queryClient]);

  // Fetch user records for all connected participants
  const participantIds = React.useMemo(() => {
    if (!room || !room.remoteParticipants) return [];
    const ids = Array.from(room.remoteParticipants.values()).map(p => p.identity);
    if (room.localParticipant) {
      ids.push(room.localParticipant.identity);
    }
    return ids;
  }, [room, room?.remoteParticipants?.size, room?.localParticipant]);

  const { data: participantUsers } = useQuery({
    queryKey: ['roster-users', participantIds],
    queryFn: async () => {
      if (participantIds.length === 0) return [];
      const users = await Promise.all(
        participantIds.map(id => base44.entities.User.get(id).catch(() => null))
      );
      return users.filter(u => u !== null);
    },
    enabled: participantIds.length > 0,
    initialData: []
  });

  // Fetch voice mutes for this net
  const { data: voiceMutes = [] } = useQuery({
    queryKey: ['voice-mutes', net.id],
    queryFn: () => base44.entities.VoiceMute.filter({ net_id: net.id, is_active: true }),
    enabled: !!net.id,
    staleTime: 8000,
    refetchInterval: false,
    gcTime: 20000
  });

  // Real-time subscription for voice mute changes
  React.useEffect(() => {
    if (!net?.id) return;

    const unsubscribe = base44.entities.VoiceMute.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['voice-mutes', net.id] });
    });

    return () => unsubscribe?.();
  }, [net?.id, queryClient]);

  // Mute/Unmute mutations
  const muteMutation = useMutation({
    mutationFn: async ({ userId, reason }) => {
      await base44.entities.VoiceMute.create({
        net_id: net.id,
        user_id: userId,
        muted_by: currentUser.id,
        reason: reason || 'Admin action',
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-mutes', net.id] });
      toast.success('User muted');
    }
  });

  const unmuteMutation = useMutation({
    mutationFn: async (muteId) => {
      await base44.entities.VoiceMute.update(muteId, { is_active: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-mutes', net.id] });
      toast.success('User unmuted');
    }
  });

  // Build participants list from room
  const participants = React.useMemo(() => {
    if (!room || !participantUsers) return [];

    return participantUsers.map(u => {
       const status = statuses.find(s => s.user_id === u.id);
       const normalizedStatus = normalizePlayerStatus(status?.status || PLAYER_STATUS.READY);
       const isSpeaking = activeSpeakers.has(u.id);
       const voiceMute = voiceMutes.find(m => m.user_id === u.id && m.is_active);
       return { 
          ...u, 
          status: normalizedStatus,
          role: status?.role || 'OTHER',
          isSpeaking,
          isAdminMuted: !!voiceMute,
          muteId: voiceMute?.id
       };
    }).sort((a, b) => {
       const priority = { [PLAYER_STATUS.DISTRESS]: 0, [PLAYER_STATUS.DOWN]: 1, [PLAYER_STATUS.ENGAGED]: 2, [PLAYER_STATUS.READY]: 3, [PLAYER_STATUS.OFFLINE]: 4 };
       return (priority[a.status] || 99) - (priority[b.status] || 99);
    });
  }, [room, participantUsers, statuses, activeSpeakers, voiceMutes]);

  // Get transmitting users for activity indicator
  const transmittingUsers = React.useMemo(() => {
    return participants.filter(p => p.isSpeaking);
  }, [participants]);

  return (
    <div className="space-y-3">
       <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-800">
          <Users className="w-3 h-3" />
          Active Personnel ({participants.length})
       </div>
       
       {participants.length === 0 ? (
         <div className="text-center py-8 text-zinc-600 text-xs italic">
           {net.type === 'general' ? "Open Frequency" : "No active carrier signal detected."}
         </div>
       ) : (
         <div className="grid grid-cols-1 gap-2">
           {participants.map(participant => {
             // Determine Voice Status Color based on real speaking state
             let voiceStatusColor = "bg-zinc-700"; // Default Grey (Connected but Muted)
             
             if (participant.id === myId && currentUserState) {
                if (currentUserState.isTransmitting) voiceStatusColor = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
                else if (currentUserState.mode === 'PTT' && !currentUserState.isMuted) voiceStatusColor = "bg-orange-600";
             } else if (participant.isSpeaking) {
                // Real speaking detection from LiveKit
                voiceStatusColor = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
             }

             const isExpanded = expandedUser === participant.id;
             const remoteParticipant = room?.remoteParticipants?.get(participant.id);

             return (
             <div key={participant.id} className={cn(
               "bg-zinc-900/50 p-2 rounded border transition-all",
               (participant.status === PLAYER_STATUS.DOWN || participant.status === PLAYER_STATUS.DISTRESS) ? "border-red-900/50 bg-red-950/10" : 
               participant.isAdminMuted ? "border-red-800/50 bg-red-950/20" : 
               "border-zinc-800/50"
             )}>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3 min-w-0">
                    {/* Voice Status Indicator */}
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0 transition-all duration-200", 
                      participant.isAdminMuted ? "bg-red-900" : voiceStatusColor
                    )} />

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-zinc-300 font-bold truncate">
                          {participant.callsign || participant.rsi_handle || participant.full_name}
                        </div>
                        {participant.isAdminMuted && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0">
                            MUTED
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-2">
                         <span className={cn("font-bold", getRankColorClass(participant.rank))}>{participant.rank}</span>
                         <span className="text-zinc-700">•</span>
                         <span>{participant.role}</span>
                      </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 shrink-0">
                    <StatusChip status={participant.status} size="xs" showLabel={false} />

                    {/* Admin Mute/Unmute Controls */}
                    {isAdmin && participant.id !== myId && (
                       participant.isAdminMuted ? (
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 hover:bg-zinc-800 text-red-500 hover:text-red-400"
                            onClick={() => unmuteMutation.mutate(participant.muteId)}
                            title="Unmute user (Admin)"
                         >
                            <Mic className="w-3 h-3" />
                         </Button>
                       ) : (
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 hover:bg-zinc-800 text-zinc-500 hover:text-red-500"
                            onClick={() => muteMutation.mutate({ userId: participant.id, reason: 'Admin action' })}
                            title="Mute user (Admin)"
                         >
                            <MicOff className="w-3 h-3" />
                         </Button>
                       )
                    )}

                    {/* Volume Control Button for Remote Participants */}
                    {participant.id !== myId && remoteParticipant && (
                       <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 hover:bg-zinc-800 text-zinc-500 hover:text-blue-500"
                          onClick={() => setExpandedUser(isExpanded ? null : participant.id)}
                          title="Volume control"
                       >
                          <Volume2 className="w-3 h-3" />
                       </Button>
                    )}

                    {/* Whisper Button */}
                    {participant.id !== myId && (
                       <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 hover:bg-zinc-800 text-zinc-500 hover:text-amber-500"
                          onClick={() => onWhisper && onWhisper(participant)}
                          title={`Whisper to ${participant.callsign}`}
                       >
                          <Ear className="w-3 h-3" />
                       </Button>
                    )}

                    {hasMinRank(participant, net.min_rank_to_tx) && !participant.isAdminMuted && (
                      <Mic className="w-3 h-3 text-zinc-600" />
                    )}
                 </div>
               </div>

               {/* Volume Controls - Expanded */}
               {isExpanded && remoteParticipant && (
                 <div className="mt-2 pl-5">
                   <VolumeControls room={room} participant={remoteParticipant} />
                 </div>
               )}
             </div>
             )})}
             </div>
       )}
    </div>
  );
}

export default function ActiveNetPanel({ net, user, eventId, effectiveMode, fallbackReason, onRetryLive, onConnectSuccess, onConnecting, onDisconnect, onError }) {
  const { isSim, simConfig } = useCommsMode();
  const [audioState, setAudioState] = React.useState(null);
  const [connectionToken, setConnectionToken] = React.useState(null);
  const [whisperTarget, setWhisperTarget] = React.useState(null);
  const [livekitUrl, setLivekitUrl] = React.useState(null);
  const [connectionState, setConnectionState] = React.useState(effectiveMode === 'SIM' ? "connected" : "disconnected");
  const [connectionError, setConnectionError] = React.useState(null);
  const [micPermissionDenied, setMicPermissionDenied] = React.useState(false);
  const [connectionQuality, setConnectionQuality] = React.useState({ packetLoss: 0, latency: 0, quality: 'excellent' });
  const [accessDenied, setAccessDenied] = React.useState(false);
  const [accessReason, setAccessReason] = React.useState("");
  const [hasTemporaryTx, setHasTemporaryTx] = React.useState(false);
  const [selectedChannel, setSelectedChannel] = React.useState(null);
  const [simParticipants, setSimParticipants] = React.useState(null);
  const [showPreflight, setShowPreflight] = React.useState(false);
  const [preflightCompleted, setPreflightCompleted] = React.useState(false);
  const [pendingConnect, setPendingConnect] = React.useState(false);
  const [fallbackDetail, setFallbackDetail] = React.useState(null);

  const isTimeoutReason = React.useCallback((reason) => {
    if (!reason) return false;
    return /timeout|timed out/i.test(reason);
  }, []);

  const isNetworkError = React.useCallback((error) => {
    if (!error) return false;
    const message = (error?.message || error || '').toString();
    return /network|failed to fetch|fetch failed|econnrefused|enotfound|eai_again/i.test(message);
  }, []);

  const isLiveKitConfigError = React.useCallback((errorCode) => {
    return ['ENV_NOT_CONFIGURED', 'INSECURE_LIVEKIT_URL'].includes(errorCode);
  }, []);

  const triggerFallback = React.useCallback((detail) => {
    setFallbackDetail(detail || 'LiveKit service unavailable');
    setConnectionState('failed');
  }, []);

  React.useEffect(() => {
    if (isTimeoutReason(fallbackReason)) {
      triggerFallback(fallbackReason);
    }
  }, [fallbackReason, isTimeoutReason, triggerFallback]);

  // Generate SIM participants (consistent, plausible)
  const generateSimParticipants = React.useCallback(() => {
    const config = simConfig || { participant_count_range: [2, 8], activity_variance: 0.3 };
    const [min, max] = config.participant_count_range;
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const names = ['Phoenix', 'Shadow', 'Viper', 'Hawk', 'Storm', 'Blade', 'Echo', 'Raven', 'Wolf', 'Tiger'];
    const ranks = ['Vagrant', 'Scout', 'Mercenary', 'Specialist', 'Pioneer'];
    
    const participants = [];
    for (let i = 0; i < count; i++) {
      const name = names[i % names.length];
      const idx = Math.floor(Math.random() * 100);
      participants.push({
        id: `sim_${net.code}_${i}`,
        callsign: `${name}-${idx}`,
        rank: ranks[Math.floor(Math.random() * ranks.length)],
        role: ['FLIGHT LEAD', 'PILOT', 'GUNNER', 'MEDIC'][Math.floor(Math.random() * 4)],
        status: Math.random() > 0.9 ? 'DISTRESS' : Math.random() > 0.7 ? 'ENGAGED' : 'READY',
        isSpeaking: Math.random() < config.activity_variance,
        isAdminMuted: false
      });
    }
    return participants;
  }, [net.code, simConfig]);

  React.useEffect(() => {
    if (isSim && !simParticipants) {
      setSimParticipants(generateSimParticipants());
      // Refresh sim state every 5s for activity variance
      const interval = setInterval(() => {
        setSimParticipants(prev => prev?.map(p => ({
          ...p,
          isSpeaking: Math.random() < 0.2
        })));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isSim, simParticipants, generateSimParticipants]);

  // Fetch channels for this net
  const { data: channels = [] } = useQuery({
    queryKey: ['net-channels', net?.id],
    queryFn: async () => {
      if (!net?.id) return [];
      return base44.entities.Channel.filter({ squad_id: net.id });
    },
    enabled: !!net?.id,
    staleTime: 10000,
    refetchInterval: false,
    gcTime: 30000
  });

  // Real-time subscription for channel updates
  useEffect(() => {
    if (!net?.id) return;

    const unsubscribe = base44.entities.Channel.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['net-channels', net.id] });
    });

    return () => unsubscribe?.();
  }, [net?.id, queryClient]);

  const [room, setRoom] = useState(null);
  const roomRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

  // Track user presence on this net
  const { setTransmitting } = usePresence(user?.id, net?.id, eventId);

  // Check if user is admin-muted
  const { data: myVoiceMute } = useQuery({
    queryKey: ['my-voice-mute', net?.id, user?.id],
    queryFn: () => base44.entities.VoiceMute.filter({ 
      net_id: net.id, 
      user_id: user.id, 
      is_active: true 
    }),
    enabled: !!(net?.id && user?.id),
    staleTime: 5000,
    refetchInterval: false,
    gcTime: 15000
  });

  const isAdminMuted = React.useMemo(() => {
    return myVoiceMute && myVoiceMute.length > 0;
  }, [myVoiceMute]);

  // Check preflight status on mount
  useEffect(() => {
    const checkPreflight = async () => {
      try {
        const prefs = await base44.entities.VoicePrefs.filter({ user_id: user.id });
        setPreflightCompleted(prefs?.[0]?.preflight_completed || false);
      } catch (err) {
        console.error('[ACTIVE NET] Preflight check error:', err);
      }
    };

    if (user?.id && effectiveMode === 'LIVE') {
      checkPreflight();
    }
  }, [user?.id, effectiveMode]);

  useEffect(() => {
    if (!net || !user) return;

    let currentRoom = null;
    let mounted = true;
    let qualityInterval = null;

    // Check access based on discipline mode
    const checkAccess = () => {
      const isCasual = net.discipline === 'casual';
      const isFocused = net.discipline === 'focused';
      
      // Casual: Anyone can join
      if (isCasual) {
        setAccessDenied(false);
        return true;
      }
      
      // Focused: Enforce rank checks
      if (isFocused) {
        const minRankRx = net.min_rank_to_rx || 'Vagrant';
        const userRankValue = getUserRankValue(user.rank);
        const minRankValue = getUserRankValue(minRankRx);
        
        if (userRankValue < minRankValue) {
          setAccessDenied(true);
          setAccessReason(`Focused net requires ${minRankRx}+ to receive`);
          return false;
        }
        
        setAccessDenied(false);
        return true;
      }
      
      // Default fallback
      return true;
    };

    if (!checkAccess()) {
      return;
    }

    // SIM mode: fake connection
    if (effectiveMode === 'SIM') {
      onConnectSuccess?.(net.id);
      return;
    }

    // LIVE mode: check preflight before connecting
    if (effectiveMode === 'LIVE' && !preflightCompleted && !pendingConnect) {
      return; // Don't auto-connect, wait for user to click Join
    }

    const connect = async () => {
       try {
          if (!mounted) return;
          setConnectionState("connecting");
          onConnecting?.(net.id);
          setConnectionError(null);
          setMicPermissionDenied(false);
          setConnectionToken(null);
          setLivekitUrl(null);
          setWhisperTarget(null);

          // 1. Get Token with permission enforcement
          const res = await base44.functions.invoke('generateLiveKitToken', {
             roomName: `op-${eventId}-${net.code}`,
             userIdentity: user?.id || 'unknown'
          });

          if (!mounted) return;

          // Handle response
          if (!res.data?.ok) {
             const errorCode = res.data?.errorCode;
             const err = res.data?.message || 'Failed to mint token';
             console.error('[COMMS] Token mint failed:', err);
             setConnectionError(err);
             setConnectionState("failed");
             onError?.(err);
             if (isLiveKitConfigError(errorCode)) {
               triggerFallback(err);
               return;
             }
             // Mark session failover so UI falls back to SIM
             if (typeof window !== 'undefined' && window.__commsMarkFailover) {
               window.__commsMarkFailover(`Token mint failed: ${err}`);
             }
             return;
          }

          const token = res.data?.data?.token;
          let url = res.data?.data?.url;

          if (!token) {
             console.error('[COMMS] No token received for net - insufficient permissions');
             setConnectionError('Insufficient permissions for this net');
             setConnectionState("failed");
             return;
          }

          if (!url) {
             console.error('[COMMS] No LiveKit URL provided in response', res.data);
             setConnectionError('Server error: Missing LiveKit configuration');
             setConnectionState("failed");
             triggerFallback('LiveKit URL not configured');
             return;
          }

          // Validate and normalize URL
          if (typeof url !== 'string' || url.length === 0) {
             console.error('[COMMS] Invalid URL format:', typeof url, url);
             setConnectionError('Invalid server URL');
             setConnectionState("failed");
             return;
          }

          const isDev = import.meta.env.DEV;

          // Ensure URL is properly formatted (wss:// for WebSocket)
          url = url.trim();
          if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
             if (url.startsWith('http://')) {
                url = 'ws://' + url.substring(7);
             } else if (url.startsWith('https://')) {
                url = 'wss://' + url.substring(8);
             } else {
                url = 'wss://' + url;
             }
          }

          if (!isDev && url.startsWith('ws://')) {
            console.error('[COMMS] Insecure LiveKit URL blocked:', url);
            setConnectionError('Insecure comms endpoint blocked.');
            setConnectionState("failed");
            onError?.('Insecure comms endpoint blocked.');
            triggerFallback('Insecure comms endpoint blocked.');
            return;
          }

          if (typeof token !== 'string' || token.length === 0) {
             console.error('[COMMS] Invalid token format:', typeof token);
             setConnectionError('Invalid authentication token');
             setConnectionState("failed");
             return;
          }

          setConnectionToken(token);
          setLivekitUrl(url);

          // 2. Initialize Room
          currentRoom = new Room({
             adaptiveStream: true,
             dynacast: true,
             autoSubscribe: false  // Explicitly manage subscriptions
          });

          roomRef.current = currentRoom;

          // 3. Setup Event Listeners BEFORE connect - store refs for cleanup
          const eventListeners = [];

          const addListener = (event, handler) => {
            currentRoom.on(event, handler);
            eventListeners.push({ event, handler });
          };

          // Track subscription
          const handleTrackSubscribed = (track, publication, participant) => {
             if (track?.kind === 'audio') {
                try {
                   const elements = track.attach();
                   if (!elements) {
                      console.warn(`[COMMS] track.attach() returned null for ${participant.identity}`);
                      return;
                   }

                   const elementsArray = Array.isArray(elements) ? elements : [elements];
                   elementsArray.forEach(el => {
                      if (el && el instanceof HTMLElement) {
                         el.style.display = 'none';
                         el.style.visibility = 'hidden';
                         el.style.height = '0';
                         el.style.width = '0';
                         let audioContainer = document.getElementById('livekit-audio-container');
                         if (!audioContainer) {
                            audioContainer = document.createElement('div');
                            audioContainer.id = 'livekit-audio-container';
                            audioContainer.style.display = 'none';
                            document.body.appendChild(audioContainer);
                         }
                         audioContainer.appendChild(el);
                      }
                   });
                   console.log(`[COMMS] Subscribed to audio from ${participant.identity}`);
                } catch (attachErr) {
                   console.error(`[COMMS] Failed to attach audio track from ${participant.identity}:`, attachErr.message);
                }
             }
          };

          const handleTrackUnsubscribed = (track, publication, participant) => {
             try {
                const elements = track.detach();
                if (!elements) return;

                const elementsArray = Array.isArray(elements) ? elements : [elements];
                elementsArray.forEach(el => {
                   if (el && el instanceof HTMLElement && el.parentNode) {
                      el.remove();
                   }
                });
             } catch (detachErr) {
                console.error(`[COMMS] Failed to detach audio track from ${participant.identity}:`, detachErr.message);
             }
             console.log(`[COMMS] Unsubscribed from ${participant.identity}`);
          };

          const handleReconnecting = () => {
             if (mounted) setConnectionState("reconnecting");
          };

          const handleReconnected = () => {
             if (mounted) setConnectionState("connected");
          };

          const handleDisconnected = (reason) => {
             console.log(`[COMMS] Disconnected: ${reason}`);
             if (mounted && connectionState !== "disconnected") {
                const attemptReconnect = () => {
                   if (!mounted) return;
                   reconnectAttempts.current += 1;
                   const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current - 1), 30000);
                   console.log(`[COMMS] Reconnect attempt ${reconnectAttempts.current} in ${backoffDelay}ms`);
                   setConnectionState("reconnecting");
                   setConnectionError(`Reconnecting... (attempt ${reconnectAttempts.current})`);
                   reconnectTimeoutRef.current = setTimeout(() => {
                      if (mounted && reconnectAttempts.current < 5) {
                         connect();
                      } else {
                         setConnectionState("failed");
                         setConnectionError("Connection lost - max retries reached");
                      }
                   }, backoffDelay);
                };
                attemptReconnect();
             }
          };

          const handleParticipantConnected = (participant) => {
             console.log(`[COMMS] Participant joined: ${participant.identity}`);
             if (mounted) setRoom({ ...currentRoom });
          };

          const handleParticipantDisconnected = (participant) => {
             console.log(`[COMMS] Participant left: ${participant.identity}`);
             if (mounted) setRoom({ ...currentRoom });
          };

          // Register all listeners
          addListener(RoomEvent.TrackSubscribed, handleTrackSubscribed);
          addListener(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
          addListener(RoomEvent.Reconnecting, handleReconnecting);
          addListener(RoomEvent.Reconnected, handleReconnected);
          addListener(RoomEvent.Disconnected, handleDisconnected);
          addListener(RoomEvent.ParticipantConnected, handleParticipantConnected);
          addListener(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

          // 4. Connect
          console.log(`[COMMS] Connecting to LiveKit: ${url} with token length: ${token.length}`);
          await currentRoom.connect(url, token);
          
          if (!mounted) {
             currentRoom.disconnect();
             return;
          }

          setRoom(currentRoom);
          setConnectionState("connected");
          reconnectAttempts.current = 0; // Reset on successful connection
          onConnectSuccess?.(net.id);
          console.log(`[COMMS] Connected to ${net.code}`);

          // Monitor connection quality
          qualityInterval = setInterval(() => {
             if (!currentRoom || !currentRoom.localParticipant) return;
             
             // Get stats from local participant
             const stats = currentRoom.localParticipant.lastConnectionQuality;
             
             // Estimate packet loss and latency from connection quality
             // LiveKit provides: excellent, good, poor
             let packetLoss = 0;
             let latency = 0;
             
             if (stats === 'poor') {
                packetLoss = 5; // Estimated 5%+ loss
                latency = 200; // High latency
             } else if (stats === 'good') {
                packetLoss = 1; // ~1% loss
                latency = 100;
             } else {
                packetLoss = 0;
                latency = 50;
             }
             
             if (mounted) {
                setConnectionQuality({ packetLoss, latency, quality: stats });
             }
          }, 3000);

       } catch (err) {
          console.error('[COMMS] Connection failed:', err);
          if (mounted) {
             const errMsg = err.message || 'Connection failed';
             setConnectionError(errMsg);
             setConnectionState("failed");
             onError?.(errMsg);
             if (isNetworkError(err)) {
               triggerFallback(errMsg);
             }
             // Mark session failover
             if (typeof window !== 'undefined' && window.__commsMarkFailover) {
               window.__commsMarkFailover(`Connect failed: ${errMsg}`);
             }
          }
       }
             };

             connect();

             return () => {
             mounted = false;
             if (qualityInterval) clearInterval(qualityInterval);
             if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

             // Remove all event listeners before disconnecting
             if (currentRoom && eventListeners.length > 0) {
                try {
                   eventListeners.forEach(({ event, handler }) => {
                      currentRoom.off(event, handler);
                   });
                   console.log(`[COMMS] Cleaned up ${eventListeners.length} event listeners`);
                } catch (err) {
                   console.warn('[COMMS] Error removing event listeners:', err);
                }
             }

             if (currentRoom) {
                try {
                   currentRoom.disconnect();
                } catch (err) {
                   console.warn('[COMMS] Error disconnecting:', err);
                }
                roomRef.current = null;
             }
             setRoom(null);
             setConnectionState("disconnected");
             reconnectAttempts.current = 0;
             onDisconnect?.();
             };
             }, [net?.id, user?.id, eventId, effectiveMode, preflightCompleted, pendingConnect]);

             // Handle preflight completion and trigger connect
             const handlePreflightComplete = async (prefs) => {
             setShowPreflight(false);
             setPreflightCompleted(true);
             setPendingConnect(true);

             // Trigger re-render which will auto-connect now that preflight is done
             setTimeout(() => {
             setPendingConnect(false);
             }, 100);
             };

             // Handle Join button click
             const handleJoinClick = () => {
             if (effectiveMode === 'LIVE' && !preflightCompleted) {
             setShowPreflight(true);
             } else {
             setPendingConnect(true);
             setTimeout(() => setPendingConnect(false), 100);
             }
             };

  // Audio Handling - Mic Publish/Unpublish with audio processing
  useEffect(() => {
     if (!room || !room.localParticipant) return;
     
     const handleAudioState = async () => {
        try {
           // Force mute if admin-muted
           if (isAdminMuted) {
              await room.localParticipant.setMicrophoneEnabled(false);
              setTransmitting(false);
              return;
           }

           if (audioState?.isTransmitting) {
              // Enable microphone with audio processing
                 await room.localParticipant.setMicrophoneEnabled(true, {
                   echoCancellation: audioState?.echoCancellation !== false,
                   noiseSuppression: audioState?.noiseSuppression !== false,
                   autoGainControl: audioState?.autoGainControl !== false
                 });
              setTransmitting(true);
              setMicPermissionDenied(false);
           } else {
              // Mute microphone
              await room.localParticipant.setMicrophoneEnabled(false);
              setTransmitting(false);
           }
        } catch (err) {
           console.error('[COMMS] Microphone error:', err);
           if (err.name === 'NotAllowedError' || err.message.includes('Permission')) {
              setMicPermissionDenied(true);
           }
        }
     };
     
     handleAudioState();
  }, [audioState?.isTransmitting, audioState?.echoCancellation, audioState?.noiseSuppression, room, isAdminMuted, setTransmitting]);

  const handleWhisper = (targetUser) => {
     if (whisperTarget?.id === targetUser.id) {
        setWhisperTarget(null);
     } else {
        setWhisperTarget(targetUser);
     }
  };
  
  const canTx = React.useMemo(() => {
    if (!user || !net) return false;
    // Stage mode: only temporary TX grants allowed (unless commander)
    if (net.stage_mode) {
      const isCommander = user.rank === 'Pioneer' || user.rank === 'Founder' || user.role === 'admin';
      return isCommander || hasTemporaryTx;
    }
    // Normal mode: rank-based
    return hasMinRank(user, net.min_rank_to_tx);
  }, [user, net, hasTemporaryTx]);

  if (!net) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-700 border-2 border-dashed border-zinc-900 rounded-lg bg-zinc-950/50 p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(63,63,70,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-10" />
        <Radio className="w-16 h-16 mb-6 opacity-20" />
        <p className="uppercase tracking-[0.3em] text-sm font-bold">No Frequency Selected</p>
        <p className="text-xs mt-2 text-zinc-600 font-mono">AWAITING INPUT //</p>
      </div>
    );
  }

  // Access denied state
  if (accessDenied) {
    return (
       <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center space-y-4 max-w-md">
             <Shield className="w-16 h-16 mx-auto text-red-900 opacity-50" />
             <div>
                <h3 className="text-lg font-black uppercase tracking-widest text-red-800">Access Denied</h3>
                <p className="text-xs font-mono mt-2 text-zinc-500">{accessReason}</p>
             </div>
             <div className="p-4 bg-zinc-950 border border-zinc-800 text-left space-y-2">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Net Details</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                   <span className="text-zinc-500">Code:</span>
                   <span className="text-zinc-300">{net.code}</span>
                   <span className="text-zinc-500">Discipline:</span>
                   <span className={net.discipline === 'focused' ? "text-red-400" : "text-emerald-400"}>
                      {net.discipline?.toUpperCase() || 'FOCUSED'}
                   </span>
                   <span className="text-zinc-500">Min RX Rank:</span>
                   <span className="text-amber-400">{net.min_rank_to_rx || 'Vagrant'}</span>
                </div>
             </div>
          </div>
       </div>
    );
  }

  if (fallbackDetail) {
    return (
      <CommsFallbackPanel
        detail={fallbackDetail}
        onRetry={() => {
          setFallbackDetail(null);
          setConnectionError(null);
          setConnectionState('disconnected');
          onRetryLive?.();
          setPendingConnect(true);
          setTimeout(() => setPendingConnect(false), 100);
        }}
      />
    );
  }

  const isTransmitting = audioState?.isTransmitting || false;
  const participantCount = isSim 
    ? (simParticipants?.length || 0) 
    : (room?.remoteParticipants?.size || 0);

  return (
     <div className="h-full flex flex-col gap-4">
      {/* Failover Banner */}
      {fallbackReason && (
        <CommsFailoverBanner
          fallbackReason={fallbackReason}
          onRetry={() => {
            setConnectionError(null);
            setConnectionState('disconnected');
            onRetryLive?.();
            setPendingConnect(true);
            setTimeout(() => setPendingConnect(false), 100);
          }}
        />
      )}

      {/* State Chip */}
      <div className="shrink-0">
        <CommsStateChip
          mode={effectiveMode}
          connectionState={connectionState}
          roomName={net?.code}
          participants={participantCount}
          lastError={connectionError}
          onRetry={() => {
            setConnectionError(null);
            setConnectionState('disconnected');
            setPendingConnect(true);
            setTimeout(() => setPendingConnect(false), 100);
          }}
        />
      </div>

      {/* Microphone Permission Banner */}
      <AnimatePresence>
        {micPermissionDenied && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-950/50 border border-amber-900 p-3 rounded flex items-center gap-3"
          >
            <Mic className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-bold text-amber-400 uppercase">Microphone Access Required</div>
              <div className="text-[10px] text-amber-300 mt-0.5">
                Please allow microphone access in your browser to transmit. Check the address bar for permissions.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Mute Banner */}
      <AnimatePresence>
        {isAdminMuted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-950/50 border border-red-900 p-3 rounded flex items-center gap-3"
          >
            <MicOff className="w-4 h-4 text-red-500 shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-bold text-red-400 uppercase">Transmission Disabled by Administrator</div>
              <div className="text-[10px] text-red-300 mt-0.5">
                You have been muted by a moderator. Contact an administrator if you believe this is an error.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Card */}
      <TerminalCard className="relative overflow-hidden" active={isTransmitting}>
        {isTransmitting && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 0.05 }}
             className={cn(
                "absolute inset-0 pointer-events-none",
                whisperTarget ? "bg-amber-500" : "bg-emerald-500"
             )}
           />
        )}
        
        {/* Transmission/Whisper Overlay */}
        <AnimatePresence>
          {isTransmitting && (
            <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               className={cn(
                  "absolute top-0 left-0 right-0 text-white text-center py-1 z-20 shadow-lg",
                  whisperTarget ? "bg-amber-600/90" : "bg-red-500/90"
               )}
            >
               <div className="text-xs font-black uppercase tracking-[0.5em] animate-pulse">
                  {whisperTarget ? `WHISPERING TO ${whisperTarget.callsign || 'UNKNOWN'}` : "LIVE TRANSMISSION"}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 pt-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-4">
                 <h2 className={cn(
                    "text-4xl font-black font-mono tracking-tighter leading-none transition-colors duration-150",
                    isTransmitting ? "text-red-500 text-shadow-md" : "text-white text-shadow-sm"
                 )}>
                    {net.code}
                 </h2>
                 {isTransmitting && (
                   <div className="flex gap-1">
                      <div className="w-2 h-6 bg-red-500 animate-[pulse_0.5s_ease-in-out_infinite]" />
                      <div className="w-2 h-6 bg-red-500 animate-[pulse_0.5s_ease-in-out_infinite_0.1s]" />
                      <div className="w-2 h-6 bg-red-500 animate-[pulse_0.5s_ease-in-out_infinite_0.2s]" />
                   </div>
                 )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <NetTypeIcon type={net.type} />
                 <p className="text-zinc-400 uppercase tracking-widest text-xs font-bold">{net.label}</p>
                 <VoiceCallIndicator net={net} compact={false} />
                 {net.discipline === 'casual' && (
                    <span className="text-[9px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase tracking-wider ml-2">
                       CASUAL
                    </span>
                 )}
                 {net.discipline === 'focused' && (
                    <span className="text-[9px] px-2 py-0.5 bg-red-950 text-red-400 border border-red-800 font-bold uppercase tracking-wider ml-2">
                       FOCUSED
                    </span>
                 )}
              </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
              {whisperTarget && (
                 <Badge className="bg-amber-950/50 text-amber-500 border-amber-900 animate-pulse">
                    WHISPER TARGET LOCKED
                 </Badge>
              )}
              <PermissionBadge canTx={canTx} minRankTx={net.min_rank_to_tx} minRankRx={net.min_rank_to_rx} />
               <div className="text-[10px] text-zinc-600 font-mono tracking-widest">ID: {net.id.slice(0,8).toUpperCase()}</div>
            </div>
          </div>
        
           <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-900/50 p-3 rounded-sm border border-zinc-800/50">
                 <div className="text-[9px] text-zinc-500 uppercase mb-1 tracking-widest">Squad Assignment</div>
                 <div className="text-zinc-200 font-bold text-sm font-mono">
                    {net.linked_squad_id ? "DEDICATED LINK" : "GLOBAL / OPEN"}
                 </div>
              </div>
              <div className="bg-zinc-900/50 p-3 rounded-sm border border-zinc-800/50 flex justify-between items-center">
                 <div>
                   <div className="text-[9px] text-zinc-500 uppercase mb-1 tracking-widest">Carrier Signal</div>
                   <div className="text-zinc-200 font-bold text-sm font-mono">OPTIMAL</div>
                 </div>
                 <SignalStrength strength={4} className="h-6 gap-1" />
              </div>
           </div>

           {/* Voice Recording Controls */}
           {canTx && (
             <VoiceRecordingControls netId={net.id} netLabel={net.label} />
           )}

           {/* Audio Controls */}
           {isAdminMuted ? (
             <div className="p-4 bg-red-950/20 border border-red-800/50 rounded-sm text-center space-y-2">
                <div className="text-red-400 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                   <MicOff className="w-4 h-4" />
                   Muted by Administrator
                </div>
                <div className="text-[10px] text-red-300">
                   Transmission disabled by moderator
                </div>
             </div>
           ) : canTx ? (
             <AudioControls 
               onStateChange={setAudioState} 
               room={room}
               defaultMode={net.discipline === 'focused' ? 'PTT' : 'OPEN'}
               isFocused={net.discipline === 'focused'}
             />
           ) : net.stage_mode ? (
             <div className="p-4 bg-amber-950/20 border border-amber-800/50 rounded-sm text-center space-y-2">
                <div className="text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                   Stage Mode Active
                </div>
                <div className="text-[10px] text-amber-300">
                   Request permission to speak from commanders
                </div>
             </div>
           ) : (
             <div className="p-4 bg-zinc-950/50 border-2 border-zinc-900 border-dashed rounded-sm text-center text-zinc-600 font-mono text-xs">
                TRANSMISSION UNAUTHORIZED
             </div>
           )}
           </div>
           </TerminalCard>

           {/* Stage Mode Hail Queue */}
           {net.stage_mode && room && (
           <HailQueue 
           netId={net.id}
           eventId={eventId}
           user={user}
           room={room}
           onGrantTx={(granted) => setHasTemporaryTx(granted)}
           onRevokeTx={() => setHasTemporaryTx(false)}
           hasTemporaryTx={hasTemporaryTx}
           />
           )}

           {/* Connection Telemetry Strip */}
           <ConnectionTelemetryStrip
             mode={effectiveMode}
             state={connectionState}
             roomName={net?.code}
             participantCount={participantCount}
             isMicEnabled={audioState?.isTransmitting || false}
             isTransmitting={isTransmitting}
             pttKey="Space"
             errorMessage={connectionError}
             onRetry={() => {
               setConnectionError(null);
               setConnectionState('disconnected');
               setPendingConnect(true);
               setTimeout(() => setPendingConnect(false), 100);
             }}
           />

           {/* Net Status Bar */}
           <NetStatusBar 
             net={net}
             activeUsers={participants.length}
             transmittingCount={transmittingUsers.length}
             connectionQuality={connectionQuality.quality}
             isConnected={connectionState === 'connected'}
           />

           {/* Tabs: Roster & Chat */}
           <div className="flex-1 flex flex-col overflow-hidden">
             {/* Channel Tabs */}
             {channels.length > 0 && (
               <div className="flex items-center gap-1 px-4 pt-3 border-b border-zinc-800 overflow-x-auto">
                 <button
                   onClick={() => setSelectedChannel(null)}
                   className={cn(
                     'px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                     !selectedChannel
                       ? 'text-white border-b-2 border-[#ea580c]'
                       : 'text-zinc-500 hover:text-zinc-300'
                   )}
                 >
                   Roster
                 </button>
                 {channels.map(ch => (
                   <button
                     key={ch.id}
                     onClick={() => setSelectedChannel(ch)}
                     className={cn(
                       'px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                       selectedChannel?.id === ch.id
                         ? 'text-white border-b-2 border-[#ea580c]'
                         : 'text-zinc-500 hover:text-zinc-300'
                     )}
                   >
                     #{ch.name}
                   </button>
                 ))}
               </div>
             )}

             {/* Content */}
             {selectedChannel ? (
               <NetChannelChat 
                 channel={selectedChannel} 
                 netCode={net.code}
                 user={user}
               />
             ) : (
               <TerminalCard className="flex-1 flex flex-col overflow-hidden">
                 <ScrollArea className="flex-1 p-4">
                   <div className="space-y-6">
                     {/* Active Users on This Net */}
                     <div>
                       <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider pb-2 mb-3 border-b border-zinc-800">
                         <Radio className="w-3 h-3" />
                         Active on Frequency ({participants.length})
                       </div>
                       <UserPresencePanel netId={net.id} eventId={eventId} />
                     </div>

                     {/* Roster */}
                     {isSim && simParticipants ? (
                       <div className="space-y-3">
                         <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider pb-2 border-b border-zinc-800">
                           <Users className="w-3 h-3" />
                           Simulated Personnel ({simParticipants.length})
                         </div>
                         <div className="grid grid-cols-1 gap-2">
                           {simParticipants.map(p => (
                             <div key={p.id} className="bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2 min-w-0">
                                   <div className={cn(
                                     'w-2 h-2 rounded-full shrink-0',
                                     p.isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'
                                   )} />
                                   <div className="truncate">
                                     <div className="text-sm text-zinc-300 font-bold truncate">{p.callsign}</div>
                                     <div className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                                       <span className="font-bold">{p.rank}</span>
                                       <span className="text-zinc-700">•</span>
                                       <span>{p.role}</span>
                                     </div>
                                   </div>
                                 </div>
                                 <StatusChip status={p.status} size="xs" showLabel={false} />
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     ) : (
                       <NetRoster 
                         net={net} 
                         eventId={eventId} 
                         currentUserState={audioState} 
                         onWhisper={handleWhisper}
                         room={room}
                       />
                     )}

                     {/* Comms Log */}
                     <CommsLog eventId={eventId} />
                   </div>
                 </ScrollArea>
         <div className="py-1 px-2 bg-zinc-950 border-t border-zinc-900">
           <div className="w-full flex justify-between text-[9px] text-zinc-500 font-mono">
             <span className={cn(
               connectionState === "connected" ? "text-emerald-500" :
               connectionState === "reconnecting" ? "text-amber-500 animate-pulse" :
               connectionState === "failed" ? "text-red-500" :
               "text-zinc-500"
             )}>
               STATUS: {
                 connectionState === "connected" ? "CONNECTED (SECURE)" :
                 connectionState === "reconnecting" ? "RECONNECTING..." :
                 connectionState === "failed" ? "FAILED" :
                 connectionState === "connecting" ? "HANDSHAKE..." :
                 "OFFLINE"
               }
             </span>
             <div className="flex gap-4">
               {connectionState === "connected" && (
                 <>
                   <span className="text-emerald-600">PEERS: {participantCount + 1}</span>
                   <span className={cn(
                     connectionQuality.quality === 'excellent' ? "text-emerald-600" :
                     connectionQuality.quality === 'good' ? "text-yellow-600" :
                     connectionQuality.quality === 'poor' ? "text-red-600" :
                     "text-zinc-600"
                   )}>
                     Q: {connectionQuality.quality?.toUpperCase() || 'UNKNOWN'}
                   </span>
                   {connectionQuality.packetLoss > 2 && (
                     <span className="text-amber-600 animate-pulse">LOSS: {connectionQuality.packetLoss}%</span>
                   )}
                 </>
               )}
               {livekitUrl && <span className="hidden md:inline text-zinc-500">UPLINK: {livekitUrl.split('://')[1]}</span>}
               <span>ENCRYPTION: {connectionToken ? "AES-256" : "NONE"}</span>
             </div>
           </div>
           </div>
           </TerminalCard>
           )}
           </div>

           {/* Room Debug Panel (LIVE mode) */}
           {isLive && connectionState !== 'disconnected' && (
             <RoomDebugPanel
               room={room}
               roomName={`redscar_${net?.code?.toLowerCase()}`}
               identity={user?.callsign}
               token={connectionToken}
               connectionState={connectionState}
               lastError={connectionError}
             />
           )}

      {/* Preflight Modal */}
      <CommsPreflight
        isOpen={showPreflight}
        onComplete={handlePreflightComplete}
        onCancel={() => setShowPreflight(false)}
        eventMode={net?.discipline === 'focused' ? 'focused' : 'casual'}
      />
           </div>
           );
           }
