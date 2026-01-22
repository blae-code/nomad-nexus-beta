import React, { useState, useMemo } from 'react';
import { Search, Filter, Users, UserX } from 'lucide-react';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';
import { getRankColorClass } from '@/components/utils/rankUtils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function UserDirectoryPage() {
  const { users, isLoading, isEmpty } = useUserDirectory();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, online, idle, in-call, away, offline
  const [rankFilter, setRankFilter] = useState('all');

  // Get unique ranks for filter dropdown
  const uniqueRanks = useMemo(() => {
    return ['all', ...new Set(users.map(u => u.rank || 'VAGRANT'))].filter(Boolean);
  }, [users]);

  // Get status color and icon
  const getStatusInfo = (status) => {
    const statusMap = {
      'online': { color: 'bg-emerald-500', label: 'Online', textColor: 'text-emerald-300' },
      'idle': { color: 'bg-yellow-500', label: 'Idle', textColor: 'text-yellow-300' },
      'in-call': { color: 'bg-blue-500', label: 'In-Call', textColor: 'text-blue-300' },
      'away': { color: 'bg-orange-500', label: 'Away', textColor: 'text-orange-300' },
      'offline': { color: 'bg-zinc-600', label: 'Offline', textColor: 'text-zinc-400' }
    };
    return statusMap[status] || statusMap.offline;
  };

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        !searchQuery || 
        (user.callsign?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        statusFilter === 'all' || 
        (user.presence?.status || 'offline') === statusFilter;

      const matchesRank = 
        rankFilter === 'all' || 
        (user.rank || 'VAGRANT') === rankFilter;

      return matchesSearch && matchesStatus && matchesRank;
    });
  }, [users, searchQuery, statusFilter, rankFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-200 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm text-zinc-400 font-mono">LOADING USER DIRECTORY...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[#ea580c]" />
            <h1 className="text-3xl font-black uppercase tracking-tight">USER DIRECTORY</h1>
          </div>
          <p className="text-sm text-zinc-500 font-mono">{filteredUsers.length} / {users.length} users</p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border border-zinc-800 bg-zinc-950/50 p-4 space-y-3"
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input
              type="text"
              placeholder="Search by callsign, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Status Filter */}
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 text-sm p-2"
              >
                <option value="all">All Statuses</option>
                <option value="online">Online</option>
                <option value="idle">Idle</option>
                <option value="in-call">In-Call</option>
                <option value="away">Away</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {/* Rank Filter */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Rank</label>
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 text-sm p-2"
              >
                {uniqueRanks.map(rank => (
                  <option key={rank} value={rank}>
                    {rank === 'all' ? 'All Ranks' : rank}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setRankFilter('all');
                }}
                className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-[#ea580c]/50 text-zinc-400 hover:text-[#ea580c] text-sm p-2 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </motion.div>

        {/* Users List */}
        {isEmpty || filteredUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-zinc-800 bg-zinc-950/50 p-12 text-center space-y-3"
          >
            <UserX className="w-12 h-12 text-zinc-700 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-zinc-400">No users found</h3>
              <p className="text-sm text-zinc-600">
                {isEmpty ? 'No users in directory' : 'Try adjusting your search or filters'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid gap-2"
          >
            {filteredUsers.map((user, index) => {
              const statusInfo = getStatusInfo(user.presence?.status || 'offline');
              
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="border border-zinc-800 bg-zinc-950/50 p-4 hover:border-[#ea580c]/50 transition-all group"
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Callsign & Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <h3 className="text-sm font-bold text-white truncate">
                          {user.callsign || 'UNKNOWN'}
                        </h3>
                        {user.role === 'admin' && (
                          <Badge className="text-[7px] bg-[#ea580c] text-white border-[#ea580c]">ADMIN</Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">
                        {user.full_name || user.email}
                      </p>
                    </div>

                    {/* Center: Rank & Status */}
                    <div className="flex items-center gap-3">
                      <Badge className={cn('text-[8px] font-bold', getRankColorClass(user.rank, 'bg'))}>
                        {user.rank || 'VAGRANT'}
                      </Badge>

                      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900/50 border border-zinc-800">
                        <div className={cn('w-2 h-2 rounded-full', statusInfo.color)} />
                        <span className={cn('text-[8px] font-mono uppercase', statusInfo.textColor)}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Right: Additional Info */}
                    <div className="text-right text-xs text-zinc-600">
                      {user.presence?.net_id && (
                        <div className="font-mono">NET: {user.presence.net_id}</div>
                      )}
                      {user.created_date && (
                        <div className="text-[10px] text-zinc-700">
                          Joined {new Date(user.created_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}