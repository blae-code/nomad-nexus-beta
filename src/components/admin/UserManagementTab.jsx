/**
 * UserManagementTab: Admin user management section
 * 
 * Features:
 * - View all users with search/filter
 * - Assign/modify ranks and roles
 * - Manage permissions
 * - Invite new users
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Edit2, Mail, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';

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
  const [editingUser, setEditingUser] = useState(null);
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
        // Also log audit action
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
      setEditingUser(null);
    }
  });

  // Filter and search
  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || 
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.callsign?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    
    return matchesSearch && matchesRole;
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
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Header + Search + Invite */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            User Directory
          </h3>
          <Button
            onClick={() => setShowInviteDialog(!showInviteDialog)}
            className="h-7 px-2.5 text-[9px] gap-1 bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/60 text-blue-300"
          >
            <UserPlus className="w-3 h-3" />
            Invite
          </Button>
        </div>

        {/* Invite Dialog */}
        {showInviteDialog && (
          <div className="border border-zinc-800 bg-zinc-900/50 p-3 space-y-2 rounded-none">
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
                className="h-8 px-2 text-[9px] bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-300"
              >
                {inviteUserMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2 w-3 h-3 text-zinc-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-7 pr-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800">
            <Filter className="w-3 h-3 text-zinc-600" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-zinc-600">
            <p className="text-[9px]">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-zinc-600">
            <p className="text-[9px]">No users found</p>
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div
              key={u.id}
              className={cn(
                'border p-2.5 space-y-1.5 hover:bg-zinc-900/40 transition-colors cursor-pointer',
                editingUser?.id === u.id
                  ? 'border-blue-700/50 bg-blue-950/20'
                  : 'border-zinc-800 bg-zinc-950/40'
              )}
              onClick={() => setEditingUser(editingUser?.id === u.id ? null : u)}
            >
              {/* User header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white truncate">
                    {u.full_name || u.email}
                  </p>
                  {u.callsign && (
                    <p className="text-[8px] text-zinc-500">@{u.callsign}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {u.role === 'admin' && (
                    <div className="px-1.5 py-0.5 bg-[#ea580c]/20 border border-[#ea580c]/50 rounded-none">
                      <span className="text-[8px] font-bold text-[#ea580c]">ADMIN</span>
                    </div>
                  )}
                  <div className={cn(
                    'px-1.5 py-0.5 border rounded-none',
                    getRankColorClass(u.rank, 'bg')
                  )}>
                    <span className="text-[8px] font-bold">{u.rank || 'Vagrant'}</span>
                  </div>
                </div>
              </div>

              {/* Expanded edit panel */}
              {editingUser?.id === u.id && (
                <div className="border-t border-zinc-800 pt-2 space-y-2">
                  {/* Rank selector */}
                  <div>
                    <label className="text-[8px] font-mono text-zinc-600 uppercase">Rank</label>
                    <select
                      value={u.rank || 'Vagrant'}
                      onChange={(e) => {
                        updateRankMutation.mutate({
                          userId: u.id,
                          rank: e.target.value
                        });
                      }}
                      disabled={updateRankMutation.isPending}
                      className="w-full mt-1 px-2 py-1 bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-700"
                    >
                      {RANKS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Email + Last Active */}
                  <div className="text-[8px] text-zinc-500 space-y-0.5">
                    <p>📧 {u.email}</p>
                    <p>🕐 {u.updated_date ? new Date(u.updated_date).toLocaleDateString() : 'Never'}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(u.email);
                      }}
                      className="flex-1 h-6 px-2 text-[8px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      <Mail className="w-3 h-3 mr-1" /> Copy Email
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="border-t border-zinc-800 pt-2 text-[8px] text-zinc-600 space-y-0.5">
        <p>Total: {users.length} users · Showing: {filteredUsers.length}</p>
        <p>Admins: {users.filter(u => u.role === 'admin').length}</p>
      </div>
    </div>
  );
}