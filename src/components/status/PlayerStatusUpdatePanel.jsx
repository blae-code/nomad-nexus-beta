import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, MapPin, MessageSquare, Send, AlertTriangle, Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: 'READY', label: 'READY', color: 'bg-emerald-500', border: 'border-emerald-500' },
  { value: 'IN_QUANTUM', label: 'Q-JUMP', color: 'bg-blue-500', border: 'border-blue-500' },
  { value: 'ENGAGED', label: 'ENGAGED', color: 'bg-red-500', border: 'border-red-500' },
  { value: 'RTB', label: 'RTB', color: 'bg-amber-500', border: 'border-amber-500' },
  { value: 'DOWN', label: 'DOWN', color: 'bg-zinc-100', border: 'border-zinc-100' },
  { value: 'DISTRESS', label: 'DISTRESS', color: 'bg-red-600', border: 'border-red-600' },
  { value: 'OFFLINE', label: 'OFFLINE', color: 'bg-zinc-700', border: 'border-zinc-700' },
];

const ROLE_OPTIONS = ['PILOT', 'GUNNER', 'MEDIC', 'LOGISTICS', 'SCOUT', 'MARINE', 'OTHER'];

export default function PlayerStatusUpdatePanel({ eventId, user, currentStatus, compact = false }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    status: currentStatus?.status || 'OFFLINE',
    role: currentStatus?.role || 'OTHER',
    current_location: currentStatus?.current_location || '',
    notes: currentStatus?.notes || ''
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        user_id: user.id,
        event_id: eventId,
        last_updated: new Date().toISOString()
      };

      // Call AI analysis function for critical statuses
      if (['DISTRESS', 'DOWN', 'ENGAGED'].includes(data.status) || data.notes.trim().length > 0) {
        try {
          await base44.functions.invoke('analyzeStatusUpdate', {
            userId: user.id,
            eventId,
            status: data.status,
            location: data.current_location,
            notes: data.notes,
            callsign: user.callsign || user.rsi_handle
          });
        } catch (err) {
          console.warn("AI analysis failed:", err);
        }
      }

      if (currentStatus?.id) {
        return base44.entities.PlayerStatus.update(currentStatus.id, payload);
      } else {
        return base44.entities.PlayerStatus.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player-statuses', eventId]);
      if (formData.notes) {
        setFormData(prev => ({ ...prev, notes: '' }));
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {STATUS_OPTIONS.slice(0, 5).map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setFormData(prev => ({ ...prev, status: opt.value }));
                updateMutation.mutate({ ...formData, status: opt.value });
              }}
              disabled={updateMutation.isPending}
              className={cn(
                "px-2 py-2 text-[10px] font-bold uppercase border transition-all hover:scale-105",
                formData.status === opt.value 
                  ? `${opt.border} ${opt.color} text-black shadow-lg`
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        
        {formData.status !== 'OFFLINE' && (
          <div className="space-y-2">
            <Input
              value={formData.current_location}
              onChange={(e) => setFormData(prev => ({ ...prev, current_location: e.target.value }))}
              placeholder="Location (e.g., Hurston - Lorville)"
              className="bg-zinc-900 border-zinc-800 text-xs"
              onBlur={handleSubmit}
            />
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Status notes (e.g., 'Taking fire at OM-3', 'Need medical evac')"
              className="bg-zinc-900 border-zinc-800 text-xs"
              rows={2}
            />
            <Button
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              size="sm"
              className="w-full bg-[#ea580c] hover:bg-[#c2410c] gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              Update Status
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-3 border-b border-zinc-900">
        <CardTitle className="text-sm flex items-center gap-2 text-zinc-200">
          <Activity className="w-4 h-4 text-[#ea580c]" />
          Status Update
          {currentStatus && (
            <Badge className={cn("text-[10px]", STATUS_OPTIONS.find(o => o.value === currentStatus.status)?.color)}>
              {currentStatus.status}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Tactical Status</Label>
            <div className="grid grid-cols-4 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: opt.value }))}
                  className={cn(
                    "px-2 py-2 text-[10px] font-bold uppercase border transition-all hover:scale-105",
                    formData.status === opt.value 
                      ? `${opt.border} ${opt.color} text-black shadow-lg`
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {formData.status === 'DISTRESS' && (
              <div className="flex items-center gap-2 p-2 bg-red-950/30 border border-red-900 rounded text-xs text-red-400">
                <AlertTriangle className="w-4 h-4" />
                Emergency distress signal will be broadcast
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Role</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData(prev => ({ ...prev, role: val }))}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role} value={role} className="text-xs">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </Label>
              <Input
                value={formData.current_location}
                onChange={(e) => setFormData(prev => ({ ...prev, current_location: e.target.value }))}
                placeholder="System / Planet / POI"
                className="bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Activity / Notes
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="What are you doing? Any critical info? (e.g., 'Mining in Aaron Halo', 'Under attack at OM-3')"
              className="bg-zinc-900 border-zinc-800 text-xs"
              rows={3}
            />
            <p className="text-[10px] text-zinc-600 font-mono">
              AI will analyze for distress signals and operational intel
            </p>
          </div>

          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full bg-[#ea580c] hover:bg-[#c2410c] gap-2"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Transmit Status Update
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}