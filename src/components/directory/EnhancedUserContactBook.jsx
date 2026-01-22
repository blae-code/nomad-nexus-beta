import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Search, Star, Plus, X, Settings, Grid, List, ArrowUpDown, Filter,
  MessageSquare, Phone, MoreHorizontal, User, Volume2, VolumeX,
  Clock, Activity, Users as UsersIcon, ChevronDown, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import UserProfileCard from './UserProfileCard';

const statusColors = {
  'online': 'bg-emerald-500',
  'in-call': 'bg-blue-500',
  'transmitting': 'bg-red-500',
  'idle': 'bg-yellow-500',
  'away': 'bg-orange-500',
  'offline': 'bg-zinc-600'
};

const statusLabels = {
  'online': 'ONLINE',
  'in-call': 'IN-CALL',
  'transmitting': 'XMIT',
  'idle': 'IDLE',
  'away': 'AWAY',
  'offline': 'OFFLINE'
};

export default function EnhancedUserContactBook() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [groups, setGroups] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [mutedUsers, setMutedUsers] = useState(new Set());
  const [blockedUsers, setBlockedUsers] = useState(new Set());
  const [userNotes, setUserNotes] = useState({});
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showOffline, setShowOffline] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'compact'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'status', 'recent'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'online', 'in-call', etc.
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [showProfileCard, setShowProfileCard] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('contactBookPrefsV2');
    if (saved) {
      const prefs = JSON.parse(saved);
      setFavorites(new Set(prefs.favorites || []));
      setGroups(prefs.groups || {});
      setMutedUsers(new Set(prefs.mutedUsers || []));
      setBlockedUsers(new Set(prefs.blockedUsers || []));
      setUserNotes(prefs.userNotes || {});
      setVolumeAdjustments(prefs.volumeAdjustments || {});
      setViewMode(prefs.viewMode || 'list');
      setSortBy(prefs.sortBy || 'name');
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (updates) => {
    const prefs = {
      favorites: Array.from(favorites),
      groups,
      mutedUsers: Array.from(mutedUsers),
      blockedUsers: Array.from(blockedUsers),
      userNotes,
      volumeAdjustments,
      viewMode,
      sortBy,
      ...updates
    };
    localStorage.setItem('contactBookPrefsV2', JSON.stringify(prefs));
  };

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-contact'],
    queryFn: async () => await base44.entities.User.list(),
    refetchInterval: 10000
  });

  const { data: presences = [] } = useQuery({
    queryKey: ['user-presences-contact'],
    queryFn: async () => await base44.entities.UserPresence.list(),
    refetchInterval: 3000
  });

  const { data: userDirectory = {} } = useQuery({
    queryKey: ['user-directory-contact'],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getUserDirectory', {});
        return result.data.userById || {};
      } catch {
        return {};
      }
    },
    refetchInterval: 5000
  });

  const { data: squadMemberships = [] } = useQuery({
    queryKey: ['squad-memberships-contact'],
    queryFn: async () => await base44.entities.SquadMembership.list(),
    enabled: !!currentUser
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubUsers = base44.entities.User.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['all-users-contact'] });
    });
    const unsubPresence = base44.entities.UserPresence.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['user-presences-contact'] });
    });
    return () => {
      unsubUsers();
      unsubPresence();
    };
  }, [queryClient]);

  const toggleFavorite = (userId) => {
    const newFav = new Set(favorites);
    if (newFav.has(userId)) {
      newFav.delete(userId);
    } else {
      newFav.add(userId);
    }
    setFavorites(newFav);
    savePreferences({ favorites: Array.from(newFav) });
  };

  const toggleMute = (userId) => {
    const newMuted = new Set(mutedUsers);
    if (newMuted.has(userId)) {
      newMuted.delete(userId);
    } else {
      newMuted.add(userId);
    }
    setMutedUsers(newMuted);
    savePreferences({ mutedUsers: Array.from(newMuted) });
  };

  const toggleBlock = (userId) => {
    const newBlocked = new Set(blockedUsers);
    if (newBlocked.has(userId)) {
      newBlocked.delete(userId);
    } else {
      newBlocked.add(userId);
    }
    setBlockedUsers(newBlocked);
    savePreferences({ blockedUsers: Array.from(newBlocked) });
  };

  const saveNote = (userId, note) => {
    const newNotes = { ...userNotes, [userId]: note };
    setUserNotes(newNotes);
    savePreferences({ userNotes: newNotes });
  };

  const createGroup = (name) => {
    if (name.trim() && !groups[name]) {
      const newGroups = { ...groups, [name]: [] };
      setGroups(newGroups);
      setNewGroupName('');
      setShowNewGroupForm(false);
      savePreferences({ groups: newGroups });
    }
  };

  const deleteGroup = (name) => {
    const newGroups = { ...groups };
    delete newGroups[name];
    setGroups(newGroups);
    savePreferences({ groups: newGroups });
  };

  const addToGroup = (userId, groupName) => {
    const newGroups = { ...groups };
    if (!newGroups[groupName]) newGroups[groupName] = [];
    if (!newGroups[groupName].includes(userId)) {
      newGroups[groupName].push(userId);
    }
    setGroups(newGroups);
    savePreferences({ groups: newGroups });
  };

  const getMutualSquads = (userId) => {
    if (!currentUser) return [];
    const userSquads = squadMemberships.filter(m => m.user_id === userId).map(m => m.squad_id);
    const mySquads = squadMemberships.filter(m => m.user_id === currentUser.id).map(m => m.squad_id);
    return userSquads.filter(s => mySquads.includes(s));
  };

  const getFilteredUsers = () => {
    const presenceMap = {};
    presences.forEach(p => {
      presenceMap[p.user_id] = p;
    });

    let userList = allUsers
      .filter(u => u.id !== currentUser?.id && userDirectory[u.id])
      .filter(u => !blockedUsers.has(u.id))
      .map(u => ({
        user: u,
        user_id: u.id,
        status: presenceMap[u.id]?.status || 'offline',
        is_transmitting: presenceMap[u.id]?.is_transmitting || false,
        last_activity: presenceMap[u.id]?.last_activity || u.updated_date
      }));

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      userList = userList.filter(p => {
        const callsign = userDirectory[p.user_id]?.callsign || '';
        const rank = userDirectory[p.user_id]?.rank || '';
        return callsign.toLowerCase().includes(query) || rank.toLowerCase().includes(query);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      userList = userList.filter(p => p.status === statusFilter);
    }

    // Tab filter
    if (activeTab === 'favorites') {
      userList = userList.filter(p => favorites.has(p.user_id));
    } else if (groups[activeTab]) {
      userList = userList.filter(p => groups[activeTab].includes(p.user_id));
    }

    // Sorting
    const sortFn = {
      'name': (a, b) => {
        const nameA = (userDirectory[a.user_id]?.callsign || '').toUpperCase();
        const nameB = (userDirectory[b.user_id]?.callsign || '').toUpperCase();
        return nameA.localeCompare(nameB);
      },
      'status': (a, b) => {
        const statusOrder = { 'transmitting': 0, 'in-call': 1, 'online': 2, 'idle': 3, 'away': 4, 'offline': 5 };
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      },
      'recent': (a, b) => {
        const timeA = a.last_activity ? new Date(a.last_activity) : new Date(0);
        const timeB = b.last_activity ? new Date(b.last_activity) : new Date(0);
        return timeB - timeA;
      }
    }[sortBy] || sortFn.name;

    const sorted = userList.sort(sortFn);
    const online = sorted.filter(p => p.status !== 'offline');
    const offline = sorted.filter(p => p.status === 'offline');

    return { online, offline };
  };

  const handleUserClick = (userId, event) => {
    if (event.shiftKey) {
      // Multi-select with shift
      const newSelected = new Set(selectedUsers);
      if (newSelected.has(userId)) {
        newSelected.delete(userId);
      } else {
        newSelected.add(userId);
      }
      setSelectedUsers(newSelected);
    } else {
      // Show profile card
      setShowProfileCard(userId);
    }
  };

  const handleContextMenu = (userId, event) => {
    event.preventDefault();
    setContextMenu({ userId, x: event.clientX, y: event.clientY });
  };

  const renderUserRow = (presence, compact = false) => {
    const user = userDirectory[presence.user_id];
    const callsign = user?.callsign || 'UNKNOWN';
    const rank = user?.rank || presence.user?.rank || 'VAGRANT';
    const isFav = favorites.has(presence.user_id);
    const isMuted = mutedUsers.has(presence.user_id);
    const isSelected = selectedUsers.has(presence.user_id);
    const isTransmitting = presence.is_transmitting;

    if (compact) {
      return (
        <button
          key={presence.user_id}
          onClick={(e) => handleUserClick(presence.user_id, e)}
          onContextMenu={(e) => handleContextMenu(presence.user_id, e)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1 transition-colors border-l-2 hover:bg-zinc-900/60',
            presence.status === 'offline' ? 'border-l-zinc-700 bg-zinc-950/30' : 'border-l-transparent',
            isSelected && 'bg-blue-900/30 border-l-blue-500'
          )}
        >
          <div className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            statusColors[presence.status],
            isTransmitting && 'animate-pulse'
          )} />
          <div className="text-[10px] font-mono font-bold text-white truncate flex-1 text-left">{callsign}</div>
          {isFav && <Star className="w-2.5 h-2.5 text-yellow-400 shrink-0" fill="currentColor" />}
          {isMuted && <VolumeX className="w-2.5 h-2.5 text-red-400 shrink-0" />}
        </button>
      );
    }

    return (
      <button
        key={presence.user_id}
        onClick={(e) => handleUserClick(presence.user_id, e)}
        onContextMenu={(e) => handleContextMenu(presence.user_id, e)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 transition-colors border-l-2 hover:bg-zinc-900/60',
          presence.status === 'offline' ? 'border-l-zinc-700 bg-zinc-950/30' : 'border-l-transparent',
          isSelected && 'bg-blue-900/30 border-l-blue-500'
        )}
      >
        <div className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          statusColors[presence.status],
          isTransmitting && 'animate-pulse'
        )} />

        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs font-mono font-bold text-white truncate">{callsign}</div>
          <div className="text-[8px] text-zinc-500 font-mono truncate">{rank}</div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className="text-[8px] font-mono uppercase bg-zinc-900/50 border-zinc-700">
            {statusLabels[presence.status]}
          </Badge>
          {isMuted && <VolumeX className="w-3 h-3 text-red-400" />}
          {isFav && <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />}
        </div>
      </button>
    );
  };

  const { online: filteredUsers, offline: offlineUsers } = getFilteredUsers();
  const allTabs = ['all', 'favorites', ...Object.keys(groups)];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-2 py-2 border-b border-zinc-800 space-y-2 shrink-0">
        {/* Search & Actions */}
        <div className="flex items-center gap-1">
          <div className="flex-1 flex items-center gap-1 px-2 py-1 bg-zinc-900/50 border border-zinc-800">
            <Search className="w-3 h-3 text-zinc-600 shrink-0" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[10px] text-white placeholder-zinc-600 focus:outline-none"
            />
          </div>

          {/* View Mode Toggle */}
          <Button
            size="sm"
            onClick={() => {
              const newMode = viewMode === 'list' ? 'compact' : 'list';
              setViewMode(newMode);
              savePreferences({ viewMode: newMode });
            }}
            className="h-7 w-7 p-0 bg-blue-900/50 hover:bg-blue-900 border border-blue-700 text-blue-300"
            title={viewMode === 'list' ? 'Compact view' : 'List view'}
          >
            {viewMode === 'list' ? <Grid className="w-3 h-3" /> : <List className="w-3 h-3" />}
          </Button>

          {/* Sort Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button size="sm" className="h-7 w-7 p-0 bg-cyan-900/50 hover:bg-cyan-900 border border-cyan-700 text-cyan-300" title="Sort">
                <ArrowUpDown className="w-3 h-3" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-40 bg-zinc-900 border border-zinc-700 shadow-xl p-1 z-50">
                {[
                  { value: 'name', label: 'Name' },
                  { value: 'status', label: 'Status' },
                  { value: 'recent', label: 'Recent Activity' }
                ].map(opt => (
                  <DropdownMenu.Item
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value);
                      savePreferences({ sortBy: opt.value });
                    }}
                    className="px-3 py-1.5 text-[10px] text-zinc-200 hover:bg-zinc-800 cursor-pointer outline-none flex items-center justify-between"
                  >
                    {opt.label}
                    {sortBy === opt.value && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Filter Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button size="sm" className="h-7 w-7 p-0 bg-amber-900/50 hover:bg-amber-900 border border-amber-700 text-amber-300" title="Filter">
                <Filter className="w-3 h-3" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-40 bg-zinc-900 border border-zinc-700 shadow-xl p-1 z-50">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'online', label: 'Online' },
                  { value: 'in-call', label: 'In Call' },
                  { value: 'offline', label: 'Offline' }
                ].map(opt => (
                  <DropdownMenu.Item
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className="px-3 py-1.5 text-[10px] text-zinc-200 hover:bg-zinc-800 cursor-pointer outline-none flex items-center justify-between"
                  >
                    {opt.label}
                    {statusFilter === opt.value && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {allTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-2 py-1 text-[9px] font-bold uppercase whitespace-nowrap transition-colors shrink-0',
                activeTab === tab
                  ? 'text-[#ea580c] border-b-2 border-[#ea580c] bg-[#ea580c]/10'
                  : 'text-zinc-500 hover:text-zinc-400'
              )}
            >
              {tab === 'all' ? 'ALL' : tab === 'favorites' ? '⭐ FAVORITES' : tab}
            </button>
          ))}

          <button
            onClick={() => setShowNewGroupForm(!showNewGroupForm)}
            className="px-2 py-1 text-[9px] font-bold text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
            title="Create group"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* New Group Form */}
        {showNewGroupForm && (
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') createGroup(newGroupName);
              }}
              className="flex-1 bg-zinc-900 border border-zinc-700 text-[10px] px-2 py-1 text-white placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]"
              autoFocus
            />
            <Button size="sm" onClick={() => createGroup(newGroupName)} className="h-7 px-2 text-[8px] bg-emerald-600 hover:bg-emerald-700 text-white">
              CREATE
            </Button>
            <Button size="sm" onClick={() => setShowNewGroupForm(false)} className="h-7 w-7 p-0 bg-red-900/50 hover:bg-red-900 border border-red-700 text-red-300">
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Selected Users Actions */}
        {selectedUsers.size > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-900/20 border border-blue-700/50">
            <span className="text-[9px] text-blue-300 font-bold">{selectedUsers.size} selected</span>
            <Button size="sm" onClick={() => setSelectedUsers(new Set())} className="h-6 px-2 text-[8px] bg-red-900/50 hover:bg-red-900 border border-red-700 text-red-300">
              Clear
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button size="sm" className="h-6 px-2 text-[8px] bg-emerald-900/50 hover:bg-emerald-900 border border-emerald-700 text-emerald-300">
                  Add to Group <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-32 bg-zinc-900 border border-zinc-700 shadow-xl p-1 z-50">
                  {Object.keys(groups).map(groupName => (
                    <DropdownMenu.Item
                      key={groupName}
                      onClick={() => {
                        selectedUsers.forEach(uid => addToGroup(uid, groupName));
                        setSelectedUsers(new Set());
                      }}
                      className="px-3 py-1.5 text-[10px] text-zinc-200 hover:bg-zinc-800 cursor-pointer outline-none"
                    >
                      {groupName}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        )}
      </div>

      {/* User List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-0.5">
          {/* Online Users */}
          {filteredUsers.length > 0 && (
            <>
              <div className="sticky top-0 z-10 text-[8px] font-bold uppercase text-zinc-600 px-2 py-1.5 bg-zinc-950 border-b border-zinc-800">
                ONLINE ({filteredUsers.length})
              </div>
              {filteredUsers.map(presence => renderUserRow(presence, viewMode === 'compact'))}
            </>
          )}

          {/* Offline Users */}
          {offlineUsers.length > 0 && (
            <>
              <button
                onClick={() => setShowOffline(!showOffline)}
                className="sticky top-0 z-10 w-full text-[8px] font-bold uppercase text-zinc-600 hover:text-zinc-400 px-2 py-1.5 bg-zinc-950 border-b border-zinc-800 transition-colors text-left"
              >
                {showOffline ? '▼' : '▶'} OFFLINE ({offlineUsers.length})
              </button>
              {showOffline && offlineUsers.map(presence => renderUserRow(presence, viewMode === 'compact'))}
            </>
          )}

          {/* Empty State */}
          {filteredUsers.length === 0 && offlineUsers.length === 0 && (
            <div className="text-center py-8 px-4">
              <User className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <div className="text-[10px] text-zinc-500">
                {searchQuery ? 'No contacts found' : activeTab === 'favorites' ? 'No favorites yet' : 'No contacts'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Group Management Footer */}
      {activeTab !== 'all' && activeTab !== 'favorites' && groups[activeTab] && (
        <div className="px-3 py-2 border-t border-zinc-800 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-zinc-500">{groups[activeTab].length} members</span>
            <Button
              size="sm"
              onClick={() => deleteGroup(activeTab)}
              className="h-6 px-2 text-[8px] bg-red-900/30 hover:bg-red-900/50 text-red-300"
            >
              DELETE GROUP
            </Button>
          </div>
        </div>
      )}

      {/* Profile Card Popover */}
      {showProfileCard && (
        <Popover.Root open={!!showProfileCard} onOpenChange={(open) => !open && setShowProfileCard(null)}>
          <Popover.Anchor style={{ position: 'fixed', top: 0, left: 0 }} />
          <Popover.Portal>
            <Popover.Content
              className="z-50"
              sideOffset={5}
              align="center"
            >
              <UserProfileCard
                user={allUsers.find(u => u.id === showProfileCard)}
                presence={presences.find(p => p.user_id === showProfileCard)}
                userDirectory={userDirectory}
                isFavorite={favorites.has(showProfileCard)}
                isMuted={mutedUsers.has(showProfileCard)}
                notes={userNotes[showProfileCard]}
                onToggleFavorite={() => toggleFavorite(showProfileCard)}
                onToggleMute={() => toggleMute(showProfileCard)}
                onSaveNote={(note) => saveNote(showProfileCard, note)}
                onMessage={() => {/* TODO: Implement messaging */}}
                onCall={() => {/* TODO: Implement calling */}}
                onClose={() => setShowProfileCard(null)}
                mutualSquads={getMutualSquads(showProfileCard)}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100 }}
          className="min-w-48 bg-zinc-900 border border-zinc-700 shadow-xl p-1"
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            onClick={() => {
              setShowProfileCard(contextMenu.userId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-[11px] text-zinc-200 hover:bg-zinc-800 text-left flex items-center gap-2"
          >
            <User className="w-3 h-3" />
            View Profile
          </button>
          <button
            onClick={() => {
              toggleFavorite(contextMenu.userId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-[11px] text-zinc-200 hover:bg-zinc-800 text-left flex items-center gap-2"
          >
            <Star className="w-3 h-3" />
            {favorites.has(contextMenu.userId) ? 'Remove Favorite' : 'Add to Favorites'}
          </button>
          <button
            onClick={() => {
              toggleMute(contextMenu.userId);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-[11px] text-zinc-200 hover:bg-zinc-800 text-left flex items-center gap-2"
          >
            <Volume2 className="w-3 h-3" />
            {mutedUsers.has(contextMenu.userId) ? 'Unmute' : 'Mute'}
          </button>
          <div className="h-px bg-zinc-800 my-1" />
          <button className="w-full px-3 py-2 text-[11px] text-zinc-200 hover:bg-zinc-800 text-left flex items-center gap-2">
            <MessageSquare className="w-3 h-3" />
            Send Message
          </button>
          <button className="w-full px-3 py-2 text-[11px] text-zinc-200 hover:bg-zinc-800 text-left flex items-center gap-2">
            <Phone className="w-3 h-3" />
            Start Call
          </button>
        </div>
      )}
    </div>
  );
}