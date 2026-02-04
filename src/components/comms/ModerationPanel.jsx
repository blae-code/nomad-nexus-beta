/**
 * ModerationPanel — Channel moderation tools for admins
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Ban, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ModerationPanel({ channel, isOpen, onClose, currentUser }) {
  const [mutedUsers, setMutedUsers] = useState([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [muteReason, setMuteReason] = useState('');
  const [muteDuration, setMuteDuration] = useState(60); // minutes

  useEffect(() => {
    if (!isOpen || !channel?.id) return;

    const loadMutedUsers = async () => {
      try {
        let mutes = [];
        try {
          mutes = await base44.entities.ChannelMute.filter({
            channel_id: channel.id,
            is_active: true,
          });
        } catch {
          mutes = [];
        }
        setMutedUsers(mutes);
      } catch (error) {
        console.error('Failed to load muted users:', error);
      }
    };

    loadMutedUsers();
  }, [isOpen, channel?.id]);

  const handleMuteUser = async () => {
    if (!targetUserId.trim()) return;

    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + muteDuration);

      await base44.entities.ChannelMute.create({
        channel_id: channel.id,
        member_profile_id: targetUserId,
        user_id: targetUserId,
        muted_by_member_profile_id: currentUser.id,
        muted_by: currentUser.id,
        reason: muteReason || 'No reason provided',
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

      // Reload muted users
      let mutes = [];
      try {
        mutes = await base44.entities.ChannelMute.filter({
          channel_id: channel.id,
          is_active: true,
        });
      } catch {
        mutes = [];
      }
      setMutedUsers(mutes);

      setTargetUserId('');
      setMuteReason('');
    } catch (error) {
      console.error('Failed to mute user:', error);
    }
  };

  const handleUnmute = async (muteId) => {
    try {
      await base44.entities.ChannelMute.update(muteId, { is_active: false });
      setMutedUsers(prev => prev.filter(m => m.id !== muteId));
    } catch (error) {
      console.error('Failed to unmute user:', error);
    }
  };

  if (!channel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            Moderation Tools
          </DialogTitle>
          <div className="text-sm text-zinc-500">#{channel.name}</div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1">
          {/* Mute User Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-semibold">Timeout User</h3>
            </div>
            
            <Input
              placeholder="User ID or email..."
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="h-9"
            />

            <Input
              placeholder="Reason (optional)..."
              value={muteReason}
              onChange={(e) => setMuteReason(e.target.value)}
              className="h-9"
            />

            <div className="flex gap-2">
              <select
                value={muteDuration}
                onChange={(e) => setMuteDuration(Number(e.target.value))}
                className="flex h-9 w-full rounded-lg border-2 border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={60}>1 hour</option>
                <option value={360}>6 hours</option>
                <option value={1440}>24 hours</option>
                <option value={10080}>7 days</option>
              </select>
              
              <Button
                onClick={handleMuteUser}
                disabled={!targetUserId.trim()}
                className="whitespace-nowrap"
              >
                <Ban className="w-4 h-4 mr-2" />
                Timeout
              </Button>
            </div>
          </div>

          {/* Currently Muted Users */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400" />
              Active Timeouts ({mutedUsers.length})
            </h3>

            {mutedUsers.length === 0 ? (
              <div className="text-xs text-zinc-600 text-center py-4">
                No users are currently muted
              </div>
            ) : (
              <div className="space-y-2">
                {mutedUsers.map((mute) => {
                  const expiresAt = new Date(mute.expires_at);
                  const now = new Date();
                  const remaining = Math.ceil((expiresAt - now) / (1000 * 60));

                  return (
                    <div
                      key={mute.id}
                      className="p-3 rounded bg-zinc-900/40 border border-zinc-800"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="text-sm text-white font-medium">
                            {mute.member_profile_id || mute.user_id}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {remaining > 0 ? `${remaining}m remaining` : 'Expired'}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnmute(mute.id)}
                          className="h-7 text-xs"
                        >
                          Unmute
                        </Button>
                      </div>
                      {mute.reason && (
                        <div className="text-xs text-zinc-600">
                          Reason: {mute.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
