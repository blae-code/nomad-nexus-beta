import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, UserX, Trash2, Pin, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ModerationPanel({ channel, currentUser }) {
  const queryClient = useQueryClient();
  const [muteUserId, setMuteUserId] = useState("");
  const [muteReason, setMuteReason] = useState("");
  const [muteDuration, setMuteDuration] = useState("1h");

  const { data: activeMutes = [] } = useQuery({
    queryKey: ['channel-mutes', channel.id],
    queryFn: () => base44.entities.ChannelMute.filter({ 
      channel_id: channel.id, 
      is_active: true 
    }),
    enabled: !!channel.id
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-mute'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const muteUserMutation = useMutation({
    mutationFn: async (data) => {
      const expiresAt = data.duration === "permanent" ? null : 
        new Date(Date.now() + parseDuration(data.duration)).toISOString();
      
      return base44.entities.ChannelMute.create({
        channel_id: channel.id,
        user_id: data.userId,
        muted_by: currentUser.id,
        reason: data.reason,
        expires_at: expiresAt,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-mutes'] });
      toast.success("User muted successfully");
      setMuteUserId("");
      setMuteReason("");
    }
  });

  const unmuteUserMutation = useMutation({
    mutationFn: (muteId) => base44.entities.ChannelMute.update(muteId, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-mutes'] });
      toast.success("User unmuted");
    }
  });

  const updateRulesMutation = useMutation({
    mutationFn: (rules) => base44.entities.Channel.update(channel.id, { rules }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success("Channel rules updated");
    }
  });

  const updateSlowModeMutation = useMutation({
    mutationFn: (seconds) => base44.entities.Channel.update(channel.id, { slow_mode_seconds: seconds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success("Slow mode updated");
    }
  });

  function parseDuration(duration) {
    const units = { m: 60000, h: 3600000, d: 86400000 };
    const match = duration.match(/^(\d+)([mhd])$/);
    if (!match) return 3600000; // default 1h
    return parseInt(match[1]) * units[match[2]];
  }

  const handleMuteUser = () => {
    if (!muteUserId) {
      toast.error("Please select a user");
      return;
    }
    muteUserMutation.mutate({
      userId: muteUserId,
      reason: muteReason,
      duration: muteDuration
    });
  };

  const getMutedUser = (mute) => {
    const user = users.find(u => u.id === mute.user_id);
    return user?.callsign || user?.rsi_handle || user?.full_name || "Unknown User";
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-300 text-sm">
            <Shield className="w-4 h-4 text-[#ea580c]" />
            Channel Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            defaultValue={channel.rules || ""}
            placeholder="Enter channel rules and guidelines..."
            className="bg-zinc-900 border-zinc-800 text-xs min-h-[80px]"
            onBlur={(e) => {
              if (e.target.value !== channel.rules) {
                updateRulesMutation.mutate(e.target.value);
              }
            }}
          />
          {channel.rules && (
            <div className="text-[10px] text-zinc-500 border-l-2 border-[#ea580c] pl-2">
              {channel.rules}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-300 text-sm">
            <Clock className="w-4 h-4 text-[#ea580c]" />
            Slow Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={channel.slow_mode_seconds?.toString() || "0"}
            onValueChange={(value) => updateSlowModeMutation.mutate(parseInt(value))}
          >
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Disabled</SelectItem>
              <SelectItem value="5">5 seconds</SelectItem>
              <SelectItem value="10">10 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-300 text-sm">
            <UserX className="w-4 h-4 text-[#ea580c]" />
            Mute User
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">User</Label>
            <Select value={muteUserId} onValueChange={setMuteUserId}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
                <SelectValue placeholder="Select user to mute" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.callsign || user.rsi_handle || user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Duration</Label>
            <Select value={muteDuration} onValueChange={setMuteDuration}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">5 minutes</SelectItem>
                <SelectItem value="30m">30 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Reason (Optional)</Label>
            <Input
              value={muteReason}
              onChange={(e) => setMuteReason(e.target.value)}
              placeholder="Reason for mute..."
              className="bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>

          <Button
            onClick={handleMuteUser}
            disabled={muteUserMutation.isPending}
            className="w-full bg-red-900/20 hover:bg-red-900/40 border border-red-900 text-red-400 text-xs"
            size="sm"
          >
            <UserX className="w-3 h-3 mr-2" />
            Mute User
          </Button>
        </CardContent>
      </Card>

      {activeMutes.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-300 text-sm">Active Mutes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeMutes.map(mute => (
                <div key={mute.id} className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
                  <div className="flex-1">
                    <div className="text-xs font-mono text-zinc-300">{getMutedUser(mute)}</div>
                    {mute.reason && (
                      <div className="text-[10px] text-zinc-500">{mute.reason}</div>
                    )}
                    <div className="text-[10px] text-zinc-600">
                      {mute.expires_at ? `Expires: ${new Date(mute.expires_at).toLocaleString()}` : "Permanent"}
                    </div>
                  </div>
                  <Button
                    onClick={() => unmuteUserMutation.mutate(mute.id)}
                    variant="ghost"
                    size="sm"
                    className="text-[#ea580c] hover:text-[#c2410c] text-xs"
                  >
                    Unmute
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}