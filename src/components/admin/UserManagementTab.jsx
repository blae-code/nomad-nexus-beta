/**
 * UserManagementTab: Admin user management with Command Palette-style layout
 * 
 * Features:
 * - 2-column list/preview layout
 * - Search & filter with rank visualization
 * - Rank/role assignment in preview pane
 * - Invite functionality
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Mail, Filter, CheckCircle2, AlertCircle, Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import { motion, AnimatePresence } from 'framer-motion';

const RANKS = ['Vagrant', 'Scout', 'Voyager', 'Pioneer', 'Founder'];
const ROLES = ['user', 'admin'];
const PERMISSIONS = [
  'manage_events',
  'manage_members',
  'manage_resources',
  'manage_roles',
  'view_reports',
  'manage_treasury'
];

export default function UserManagementTab({ user: currentUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all users (bounded to 500)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
    enabled: !!currentUser
  });

  // Memoize filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchQuery || 
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.callsign?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = filterRole === 'all' || u.role === filterRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, filterRole]);

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: (data) => base44.users.inviteUser(data.email, data.role),
    onSuccess: () => {
      setInviteEmail('');
      setInviteRole('user');
      setShowInviteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
  });

  // Update user rank mutation
  const updateRankMutation = useMutation({
    mutationFn: (data) =>
      base44.auth.updateMe({ rank: data.rank }).then(() => {
        return base44.entities.AdminAuditLog.create({
          step_name: 'user_management',
          action: `rank_change_${data.userId}`,
          status: 'success',
          duration_ms: 0,
          executed_by: currentUser.id,
          executed_at: new Date().toISOString()
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
    }
  });

  const handleInvite = () => {
    if (inviteEmail && inviteRole) {
      inviteUserMutation.mutate({
        email: inviteEmail,
        role: inviteRole
      });
    }
  };

  return (
    <div className="h-full flex gap-0 overflow-hidden bg-zinc-950/60" style={{
      backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)',
      backgroundSize: '100% 2px',
    }}>
      {/* LEFT: User List (flex-1) */}
      <div className="flex-1 border-r border-zinc-800 flex flex-col min-w-0 overflow-hidden">
        {/* Context header */}
        <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/30 text-[9px] font-mono text-zinc-500 shrink-0">
          <span className="text-[7px] text-zinc-700">[</span>
          <span className="text-zinc-400">USER DIRECTORY</span>
          <span className="text-[7px] text-zinc-700">]</span>
        </div>

        {/* Search bar */}
        <div className="px-3 py-2 border-b border-zinc-800 space-y-2 shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1.5 w-3 h-3 text-zinc-600 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-7 pr-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-700"
              />
            </div>
            <Button
              onClick={() => setShowInviteDialog(!showInviteDialog)}
              className="h-7 px-2.5 text-[8px] gap-1 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/60 text-blue-300 shrink-0"
            >
              <UserPlus className="w-3 h-3" />
              Invite
            </Button>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 text-[9px]">
            <Filter className="w-3 h-3 text-zinc-600" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Invite dialog */}
          <AnimatePresence>
            {showInviteDialog && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-zinc-800 bg-zinc-900/50 p-2 space-y-2"
              >
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-blue-600"
                />
                <div className="flex gap-2">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button
                    onClick={handleInvite}
                    disabled={inviteUserMutation.isPending || !inviteEmail}
                    className="h-8 px-2 text-[8px] bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300"
                  >
                    {inviteUserMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> SEND
                      </>
                    ) : (
                      'SEND'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-20 text-zinc-600 text-[9px]">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-zinc-600 text-[9px]">
              No users found
            </div>
          ) : (
            filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors duration-150 border-l-2 hover:bg-zinc-900/50',
                  selectedUser?.id === u.id
                    ? 'bg-zinc-900 text-white border-l-[#ea580c] border-l-2'
                    : 'text-zinc-400 border-l-transparent hover:border-l-[#ea580c]/30'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono truncate">{u.callsign || `USER-${u.id.slice(0, 8)}`}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {u.role === 'admin' && (
                    <span className="px-1 py-0.5 bg-[#ea580c]/20 border border-[#ea580c]/50 text-[7px] font-bold text-[#ea580c]">
                      ADMIN
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-[9px] text-zinc-600 font-mono shrink-0">
          <span>Total: {users.length} · Showing: {filteredUsers.length}</span>
        </div>
      </div>

      {/* RIGHT: Preview Pane (360px) */}
      <div className="w-96 border-l border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0 hidden lg:flex overflow-hidden">
        {selectedUser ? (
          <>
            {/* User Header */}
            <div className="px-4 py-3 border-b border-zinc-800 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-white">{selectedUser.callsign || `USER-${selectedUser.id.slice(0, 8)}`}</p>
                  <p className="text-[8px] text-zinc-500">ID: {selectedUser.id.slice(0, 12)}...</p>
                </div>
                {selectedUser.role === 'admin' && (
                  <span className="px-1.5 py-0.5 bg-[#ea580c]/20 border border-[#ea580c]/50 text-[7px] font-bold text-[#ea580c]">
                    ADMIN
                  </span>
                )}
              </div>
            </div>

            {/* Rank Section */}
            <div className="px-4 py-2.5 border-b border-zinc-800/50 space-y-1.5">
              <p className="text-[8px] text-zinc-600 font-mono uppercase">Rank</p>
              <select
                value={selectedUser.rank || 'Vagrant'}
                onChange={(e) => {
                  updateRankMutation.mutate({
                    userId: selectedUser.id,
                    rank: e.target.value
                  });
                }}
                disabled={updateRankMutation.isPending}
                className={cn(
                  'w-full px-2 py-1.5 bg-zinc-900 border text-white text-[10px] font-mono focus:outline-none focus:border-[#ea580c]',
                  getRankColorClass(selectedUser.rank, 'border')
                )}
              >
                {RANKS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Activity Section */}
            <div className="px-4 py-2.5 border-b border-zinc-800/50 space-y-2">
              <p className="text-[8px] text-zinc-600 font-mono uppercase">Activity</p>
              <div className="space-y-1 text-[8px] text-zinc-500">
                <p>Created: {new Date(selectedUser.created_date).toLocaleDateString()}</p>
                <p>Last Active: {new Date(selectedUser.updated_date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-2.5 space-y-1.5">
              <Button
                onClick={() => navigator.clipboard.writeText(selectedUser.id)}
                className="w-full h-7 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 gap-1"
              >
                <Mail className="w-3 h-3" /> COPY ID
              </Button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4 text-center">
            <p className="text-[9px] text-zinc-600">Select a user to manage</p>
          </div>
        )}
      </div>
    </div>
  );
}