import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info, X, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AICriticalAlertsMonitor({ eventId, onAlertAction }) {
  const [alerts, setAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);

  const { data: messages = [] } = useQuery({
    queryKey: ['alert-monitor-messages', eventId],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 10 * 60 * 1000); // Last 10 minutes
      const msgs = await base44.entities.Message.list('-created_date', 100);
      return msgs.filter(m => new Date(m.created_date) > cutoff);
    },
    enabled: !!eventId && isEnabled,
    refetchInterval: 15000,
    initialData: []
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ['alert-monitor-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter({ event_id: eventId }),
    enabled: !!eventId && isEnabled,
    refetchInterval: 10000,
    initialData: []
  });

  const { data: voiceNets = [] } = useQuery({
    queryKey: ['alert-monitor-nets', eventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: eventId }),
    enabled: !!eventId && isEnabled,
    initialData: []
  });

  const analyzeForAlerts = async () => {
    if (!isEnabled || messages.length === 0) return;

    try {
      // Prepare data for AI analysis
      const commsPatterns = {
        total_messages: messages.length,
        recent_keywords: messages.map(m => m.content).join(' ').match(/\b(emergency|help|down|critical|mayday|distress)\b/gi) || [],
        distress_count: statuses.filter(s => s.status === 'DISTRESS' || s.status === 'DOWN').length,
        active_nets: voiceNets.filter(n => n.status === 'active').length
      };

      // Check for specific patterns
      const newAlerts = [];

      // Pattern 1: Multiple distress calls
      if (commsPatterns.distress_count >= 3) {
        newAlerts.push({
          id: `distress-${Date.now()}`,
          severity: 'critical',
          type: 'MULTIPLE_DISTRESS',
          message: `${commsPatterns.distress_count} units reporting distress`,
          action: 'Coordinate rescue operations immediately',
          timestamp: new Date().toISOString()
        });
      }

      // Pattern 2: Emergency keywords detected
      if (commsPatterns.recent_keywords.length >= 5) {
        newAlerts.push({
          id: `keywords-${Date.now()}`,
          severity: 'high',
          type: 'EMERGENCY_KEYWORDS',
          message: 'High frequency of emergency keywords detected',
          action: 'Review recent communications for situational awareness',
          timestamp: new Date().toISOString()
        });
      }

      // Pattern 3: Sudden spike in comms
      if (messages.length > 50) {
        newAlerts.push({
          id: `spike-${Date.now()}`,
          severity: 'medium',
          type: 'COMMS_SPIKE',
          message: 'Unusual spike in communications detected',
          action: 'Monitor for developing situation',
          timestamp: new Date().toISOString()
        });
      }

      // Pattern 4: No active nets but event is active
      if (voiceNets.length > 0 && commsPatterns.active_nets === 0) {
        newAlerts.push({
          id: `nets-${Date.now()}`,
          severity: 'medium',
          type: 'NO_ACTIVE_NETS',
          message: 'No active voice nets detected',
          action: 'Verify network connectivity and activation status',
          timestamp: new Date().toISOString()
        });
      }

      // Filter out dismissed alerts
      const filteredAlerts = newAlerts.filter(alert => !dismissedAlerts.includes(alert.id));

      if (filteredAlerts.length > alerts.length) {
        toast.error(`${filteredAlerts.length - alerts.length} new critical alerts detected`, {
          icon: <AlertTriangle className="w-4 h-4" />
        });
      }

      setAlerts(filteredAlerts);
    } catch (error) {
      console.error('Alert analysis failed:', error);
    }
  };

  useEffect(() => {
    if (isEnabled && messages.length > 0) {
      analyzeForAlerts();
    }
  }, [messages.length, statuses.length, voiceNets.length, isEnabled]);

  const dismissAlert = (alertId) => {
    setDismissedAlerts([...dismissedAlerts, alertId]);
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  if (!isEnabled) {
    return (
      <div className="flex items-center justify-center p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEnabled(true)}
          className="text-xs text-zinc-500"
        >
          <BellOff className="w-3 h-3 mr-1" />
          Enable Alert Monitor
        </Button>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 animate-pulse" />
          Critical Network Alerts
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEnabled(false)}
          className="h-5 w-5"
          title="Disable monitoring"
        >
          <BellOff className="w-3 h-3" />
        </Button>
      </div>

      {alerts.map(alert => (
        <Card
          key={alert.id}
          className={cn(
            "border-l-4",
            alert.severity === 'critical' && "border-l-red-500 bg-red-950/20",
            alert.severity === 'high' && "border-l-orange-500 bg-orange-950/20",
            alert.severity === 'medium' && "border-l-yellow-500 bg-yellow-950/20",
            alert.severity === 'low' && "border-l-blue-500 bg-blue-950/20"
          )}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {alert.severity === 'critical' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                  {alert.severity === 'high' && <AlertCircle className="w-4 h-4 text-orange-400" />}
                  {alert.severity === 'medium' && <Info className="w-4 h-4 text-yellow-400" />}
                  <Badge variant="outline" className="text-[9px] h-4 uppercase">
                    {alert.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="text-xs font-bold text-zinc-200">{alert.message}</div>
                {alert.action && (
                  <div className="text-[10px] text-zinc-400">→ {alert.action}</div>
                )}
                <div className="text-[9px] text-zinc-600 font-mono">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dismissAlert(alert.id)}
                className="h-6 w-6 shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}