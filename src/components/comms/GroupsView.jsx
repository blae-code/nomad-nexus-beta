/**
 * GroupsView — Display and manage group chats
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Loader, Settings, UserPlus, UserMinus, LogOut, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function GroupsView({ user, onOpenGroup }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    const loadGroups = async () => {
      try {
        if (!user?.id) return;

        // Load group chat channels where user is participant
        const allChannels = await base44.entities.Channel.filter({
          is_dm: true,
          is_group_chat: true,
        });

        const userGroups = allChannels.filter(ch =>
          ch.dm_participants?.includes(user.id)
        );

        setGroups(userGroups);
      } catch (error) {
        console.error('Error loading groups:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();

    // Subscribe to group updates
    const unsubscribe = base44.entities.Channel.subscribe((event) => {
      if (event.data?.is_group_chat) {
        loadGroups();
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleLeaveGroup = async (groupId) => {
    if (!confirm('Leave this group? You can be re-added by another member.')) return;

    try {
      const group = await base44.entities.Channel.get(groupId);
      const newParticipants = group.dm_participants.filter(id => id !== user.id);

      if (newParticipants.length === 0) {
        // Delete group if no participants left
        await base44.entities.Channel.delete(groupId);
      } else {
        await base44.entities.Channel.update(groupId, {
          dm_participants: newParticipants,
        });
      }

      setShowSettings(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const handleRenameGroup = async () => {
    if (!newGroupName.trim() || !selectedGroup) return;

    try {
      await base44.entities.Channel.update(selectedGroup.id, {
        group_name: newGroupName.trim(),
      });
      setShowSettings(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error('Failed to rename group:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="w-4 h-4 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-bold text-white uppercase">Your Groups</h3>
      </div>

      {groups.length === 0 ? (
        <div className="text-xs text-zinc-600 text-center py-8">
          No group chats yet. Create one to organize your team.
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="p-3 rounded bg-zinc-900/40 border border-zinc-800 hover:border-orange-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {group.group_name || 'Unnamed Group'}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {group.dm_participants?.length || 0} members
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setSelectedGroup(group);
                    setNewGroupName(group.group_name || '');
                    setShowSettings(true);
                  }}
                  className="h-6 w-6"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenGroup?.(group)}
                  className="flex-1 h-7 text-xs"
                >
                  Open Chat
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Group Settings Dialog */}
      {selectedGroup && (
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Group Settings</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Group Name</label>
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name..."
                  className="h-9"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Members</label>
                <div className="border border-zinc-800 rounded p-2 space-y-1 max-h-32 overflow-y-auto">
                  {selectedGroup.dm_participants?.map(userId => (
                    <div key={userId} className="text-xs text-zinc-300 py-1">
                      {userId}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 space-y-2">
                <Button
                  variant="outline"
                  onClick={handleRenameGroup}
                  disabled={!newGroupName.trim()}
                  className="w-full"
                >
                  <Edit2 className="w-3 h-3 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleLeaveGroup(selectedGroup.id)}
                  className="w-full text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-3 h-3 mr-2" />
                  Leave Group
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}