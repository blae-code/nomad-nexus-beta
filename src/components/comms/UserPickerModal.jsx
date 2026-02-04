/**
 * UserPickerModal — Select users for DM or group chat creation
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function UserPickerModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  mode = 'dm', // 'dm' or 'group'
  currentUserId
}) {
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        const allMembers = await base44.entities.MemberProfile.list();
        const others = allMembers.filter((member) => member.id !== currentUserId);
        setUsers(others);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
    
    // Reset state when opening
    setSelectedUserIds([]);
    setGroupName('');
    setSearchQuery('');
  }, [isOpen, currentUserId]);

  const toggleUser = (userId) => {
    if (mode === 'dm') {
      setSelectedUserIds([userId]); // Only one for DM
    } else {
      setSelectedUserIds(prev => 
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleConfirm = () => {
    if (selectedUserIds.length === 0) return;
    
    if (mode === 'group' && !groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    onConfirm({
      userIds: selectedUserIds,
      groupName: mode === 'group' ? groupName.trim() : undefined,
    });
    onClose();
  };

  const filteredUsers = users.filter((u) => {
    const searchValue = [
      u.display_callsign,
      u.callsign,
      u.full_name,
      u.email,
    ].filter(Boolean).join(' ').toLowerCase();
    return searchValue.includes(searchQuery.toLowerCase());
  });

  const canConfirm = mode === 'dm' 
    ? selectedUserIds.length === 1
    : selectedUserIds.length >= 1 && groupName.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'dm' ? 'Start Direct Message' : 'Create Group Chat'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {mode === 'group' && (
            <Input
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="h-9 text-sm"
            />
          )}

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-9 text-sm"
            />
          </div>

          {mode === 'group' && selectedUserIds.length > 0 && (
            <div className="text-xs text-zinc-400">
              {selectedUserIds.length} {selectedUserIds.length === 1 ? 'user' : 'users'} selected
            </div>
          )}

          <div className="max-h-64 overflow-y-auto border border-zinc-800 rounded">
            {loading ? (
              <div className="p-4 text-center text-sm text-zinc-500">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500">
                No users found
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {filteredUsers.map(user => {
                  const isSelected = selectedUserIds.includes(user.id);
                  const displayName = user.display_callsign || user.callsign || user.full_name || user.email || 'Unknown';
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-zinc-800/40 transition-colors flex items-center justify-between ${
                        isSelected ? 'bg-orange-500/10' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {displayName}
                        </div>
                        {user.callsign && user.display_callsign && (
                          <div className="text-xs text-zinc-500 truncate">
                            {user.callsign}
                          </div>
                        )}
                        {user.email && displayName !== user.email && (
                          <div className="text-xs text-zinc-500 truncate">
                            {user.email}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-orange-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {mode === 'dm' ? 'Start DM' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
