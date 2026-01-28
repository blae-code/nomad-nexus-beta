import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Radio, Brain, Activity, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const EVENT_TYPES = {
  DISTRESS: { icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-950/30", borderColor: "border-red-900" },
  AI_INSIGHT: { icon: Brain, color: "text-purple-500", bgColor: "bg-purple-950/30", borderColor: "border-purple-900" },
  STATUS_CHANGE: { icon: Activity, color: "text-amber-500", bgColor: "bg-amber-950/30", borderColor: "border-amber-900" },
  NET_ACTIVITY: { icon: Radio, color: "text-blue-500", bgColor: "bg-blue-950/30", borderColor: "border-blue-900" },
  CRITICAL: { icon: Shield, color: "text-orange-500", bgColor: "bg-orange-950/30", borderColor: "border-orange-900" }
};

function EventFeedItem({ event, onDismiss }) {
  const typeConfig = EVENT_TYPES[event.type] || EVENT_TYPES.NET_ACTIVITY;
  const Icon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        "p-3 border-l-4 bg-zinc-950/80 backdrop-blur-sm",
        typeConfig.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded", typeConfig.bgColor)}>
          <Icon className={cn("w-4 h-4", typeConfig.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-zinc-200">{event.title}</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {event.priority || "STANDARD"}
            </Badge>
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed">{event.message}</p>
          
          {event.metadata && (
            <div className="flex gap-2 mt-2 text-[10px] text-zinc-600">
              {event.metadata.net && <span>NET: {event.metadata.net}</span>}
              {event.metadata.user && <span>USER: {event.metadata.user}</span>}
              {event.metadata.location && <span>LOC: {event.metadata.location}</span>}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[9px] text-zinc-600 font-mono">
            {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
          </span>
          {onDismiss && (
            <button 
              onClick={() => onDismiss(event.id)}
              className="text-zinc-600 hover:text-zinc-400 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function OperationalEventFeed({ eventId, selectedNet }) {
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({
    showDistress: true,
    showAI: true,
    showStatus: true,
    showNet: true,
    showCritical: true,
    priority: "all" // all, CRITICAL, HIGH, STANDARD, LOW
  });
  const [audioEnabled, setAudioEnabled] = useState(true);
  const scrollRef = useRef(null);
  const audioContextRef = useRef(null);

  // Fetch initial data
  const { data: initialStatuses } = useQuery({
    queryKey: ['feed-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter({ event_id: eventId }),
    enabled: !!eventId,
    initialData: []
  });

  const { data: initialLogs } = useQuery({
    queryKey: ['feed-logs', eventId],
    queryFn: () => base44.entities.AIAgentLog.filter({ event_id: eventId }),
    enabled: !!eventId,
    initialData: []
  });

  // Subscribe to PlayerStatus changes (distress signals)
  useEffect(() => {
    if (!eventId) return;

    const unsubscribeStatus = base44.entities.PlayerStatus.subscribe((statusEvent) => {
      const data = statusEvent.data;
      
      // Only process if it's for our event
      if (data.event_id !== eventId) return;

      // Distress signal
      if (statusEvent.type === 'update' && data.status === 'DISTRESS') {
        const newEvent = {
          id: `distress-${data.id}-${Date.now()}`,
          type: 'DISTRESS',
          priority: 'CRITICAL',
          title: '🚨 DISTRESS SIGNAL',
          message: `Operator in distress - immediate response required`,
          timestamp: new Date().toISOString(),
          metadata: {
            user: data.user_id,
            location: data.current_location || 'Unknown',
            status: data.status
          }
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, 100));
        playAlert('distress');
        toast.error(`DISTRESS: Operator needs assistance`, { duration: 10000 });
      }
      
      // Status changes
      if (statusEvent.type === 'update' && ['DOWN', 'ENGAGED', 'RTB'].includes(data.status)) {
        const newEvent = {
          id: `status-${data.id}-${Date.now()}`,
          type: 'STATUS_CHANGE',
          priority: data.status === 'DOWN' ? 'HIGH' : 'STANDARD',
          title: `Status Update: ${data.status}`,
          message: `Operator status changed to ${data.status}`,
          timestamp: new Date().toISOString(),
          metadata: {
            user: data.user_id,
            status: data.status,
            location: data.current_location
          }
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, 100));
        if (data.status === 'DOWN') playAlert('warning');
      }
    });

    return () => unsubscribeStatus();
  }, [eventId]);

  // Subscribe to AIAgentLog changes (AI insights)
  useEffect(() => {
    if (!eventId) return;

    const unsubscribeLog = base44.entities.AIAgentLog.subscribe((logEvent) => {
      const data = logEvent.data;
      
      if (data.event_id !== eventId) return;
      if (logEvent.type !== 'create') return;

      const newEvent = {
        id: `ai-${data.id}-${Date.now()}`,
        type: 'AI_INSIGHT',
        priority: data.severity,
        title: `AI ${data.type}: ${data.agent_slug}`,
        message: data.summary,
        timestamp: new Date().toISOString(),
        metadata: {
          agent: data.agent_slug,
          severity: data.severity,
          details: data.details
        }
      };
      
      setEvents(prev => [newEvent, ...prev].slice(0, 100));
      
      if (data.severity === 'HIGH') {
        playAlert('info');
      }
    });

    return () => unsubscribeLog();
  }, [eventId]);

  // Subscribe to Message changes (critical comms)
  useEffect(() => {
    if (!eventId) return;

    const unsubscribeMsg = base44.entities.Message.subscribe((msgEvent) => {
      const data = msgEvent.data;
      
      if (msgEvent.type !== 'create') return;
      
      // Only critical messages flagged by AI
      if (data.ai_analysis?.is_priority) {
        const newEvent = {
          id: `msg-${data.id}-${Date.now()}`,
          type: 'CRITICAL',
          priority: 'HIGH',
          title: '⚡ Priority Communication',
          message: data.content.substring(0, 100) + (data.content.length > 100 ? '...' : ''),
          timestamp: new Date().toISOString(),
          metadata: {
            user: data.user_id,
            sentiment: data.ai_analysis?.sentiment,
            tags: data.ai_analysis?.tags?.join(', ')
          }
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, 100));
        playAlert('info');
      }
    });

    return () => unsubscribeMsg();
  }, [eventId]);

  // Audio alert function
  const playAlert = (type) => {
    if (!audioEnabled) return;
    
    try {
      const audioContext = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'distress') {
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
          oscillator.frequency.value = 440;
        }, 150);
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 300);
      } else if (type === 'warning') {
        oscillator.frequency.value = 660;
        gainNode.gain.value = 0.2;
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 200);
      } else {
        oscillator.frequency.value = 550;
        gainNode.gain.value = 0.15;
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close();
        }, 100);
      }
    } catch (err) {
      console.warn("Audio alert failed:", err);
    }
  };

  // Auto-scroll to top on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  // Filter events
  const filteredEvents = React.useMemo(() => {
    return events.filter(event => {
      // Type filters
      if (!filters.showDistress && event.type === 'DISTRESS') return false;
      if (!filters.showAI && event.type === 'AI_INSIGHT') return false;
      if (!filters.showStatus && event.type === 'STATUS_CHANGE') return false;
      if (!filters.showNet && event.type === 'NET_ACTIVITY') return false;
      if (!filters.showCritical && event.type === 'CRITICAL') return false;
      
      // Priority filter
      if (filters.priority !== 'all' && event.priority !== filters.priority) return false;
      
      return true;
    });
  }, [events, filters]);

  const dismissEvent = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-zinc-900">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#ea580c]" />
            Live Operational Feed
            {filteredEvents.length > 0 && (
              <Badge className="bg-red-950 text-red-400 border-red-900 animate-pulse">
                {filteredEvents.length}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={cn("h-6 px-2 text-xs", audioEnabled ? "text-emerald-500" : "text-zinc-600")}
            >
              🔔 {audioEnabled ? "ON" : "OFF"}
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => setFilters(f => ({ ...f, showDistress: !f.showDistress }))}
            className={cn(
              "text-[10px] px-2 py-1 rounded border transition-colors",
              filters.showDistress 
                ? "bg-red-950/30 border-red-900 text-red-400" 
                : "bg-zinc-900 border-zinc-800 text-zinc-600"
            )}
          >
            DISTRESS
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, showCritical: !f.showCritical }))}
            className={cn(
              "text-[10px] px-2 py-1 rounded border transition-colors",
              filters.showCritical 
                ? "bg-orange-950/30 border-orange-900 text-orange-400" 
                : "bg-zinc-900 border-zinc-800 text-zinc-600"
            )}
          >
            CRITICAL
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, showAI: !f.showAI }))}
            className={cn(
              "text-[10px] px-2 py-1 rounded border transition-colors",
              filters.showAI 
                ? "bg-purple-950/30 border-purple-900 text-purple-400" 
                : "bg-zinc-900 border-zinc-800 text-zinc-600"
            )}
          >
            AI
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, showStatus: !f.showStatus }))}
            className={cn(
              "text-[10px] px-2 py-1 rounded border transition-colors",
              filters.showStatus 
                ? "bg-amber-950/30 border-amber-900 text-amber-400" 
                : "bg-zinc-900 border-zinc-800 text-zinc-600"
            )}
          >
            STATUS
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-zinc-600"
                >
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-mono">MONITORING OPERATIONAL CHANNELS</p>
                  <p className="text-[10px] text-zinc-700 mt-1">Awaiting events...</p>
                </motion.div>
              ) : (
                filteredEvents.map(event => (
                  <EventFeedItem 
                    key={event.id} 
                    event={event}
                    onDismiss={dismissEvent}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
      
      <div className="px-3 py-2 bg-black border-t border-zinc-900">
        <div className="flex items-center justify-between text-[9px] text-zinc-600 font-mono">
          <span>REAL-TIME MONITORING ACTIVE</span>
          <span className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            LIVE
          </span>
        </div>
      </div>
    </Card>
  );
}