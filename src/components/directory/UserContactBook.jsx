import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Phone, Star, Plus, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function UserContactBook() {
  const [currentUser, setCurrentUser] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [groups, setGroups] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [mutedUsers, setMutedUsers] = useState(new Set());
  const [volumeAdjustments, setVolumeAdjustments] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showOffline, setShowOffline] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('contactBookPrefs');
    if (saved) {
      const { favorites: fav, groups: grp } = JSON.parse(saved);
      setFavorites(new Set(fav || []));
      setGroups(grp || {});
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (newFav, newGroups) => {
    localStorage.setItem('contactBookPrefs', JSON.stringify({
      favorites: Array.from(newFav),
      groups: newGroups
    }));
  };

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: presences = [] } = useQuery({
    queryKey: ['user-presences-contact'],
    queryFn: async () => {
      const p = await base44.entities.UserPresence.list();
      return p.sort((a, b) => {
        const orderMap = { 'transmitting': 0, 'in-call': 1, 'online': 2, 'idle': 3, 'away': 4 };
        return (orderMap[a.status] || 5) - (orderMap[b.status] || 5);
      });
    },
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
    }
  });

  const toggleFavorite = (userId) => {
    const newFav = new Set(favorites);
    if (newFav.has(userId)) {
      newFav.delete(userId);
    } else {
      newFav.add(userId);
    }
    setFavorites(newFav);
    savePreferences(newFav, groups);
  };

  const addUserToGroup = (userId, groupName) => {
    const newGroups = { ...groups };
    if (!newGroups[groupName]) newGroups[groupName] = [];
    if (!newGroups[groupName].includes(userId)) {
      newGroups[groupName].push(userId);
    }
    setGroups(newGroups);
    savePreferences(favorites, newGroups);
  };

  const removeUserFromGroup = (userId, groupName) => {
    const newGroups = { ...groups };
    newGroups[groupName] = newGroups[groupName].filter(id => id !== userId);
    if (newGroups[groupName].length === 0) delete newGroups[groupName];
    setGroups(newGroups);
    savePreferences(favorites, newGroups);
  };

  const createGroup = (name) => {
    if (name.trim() && !groups[name]) {
      setGroups({ ...groups, [name]: [] });
      setNewGroupName('');
      setShowNewGroupForm(false);
    }
  };

  const deleteGroup = (name) => {
    const newGroups = { ...groups };
    delete newGroups[name];
    setGroups(newGroups);
    savePreferences(favorites, newGroups);
  };

  const getFilteredUsers = () => {
    let userList = presences.filter(p => p.user_id !== currentUser?.id && userDirectory[p.user_id]);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      userList = userList.filter(p => {
        const callsign = userDirectory[p.user_id]?.callsign || '';
        return callsign.toLowerCase().includes(query);
      });
    }

    // Separate online and offline
    const onlineUsers = userList.filter(p => p.status !== 'offline');
    const offlineUsers = userList.filter(p => p.status === 'offline');

    // Apply tab filters
    let filtered = onlineUsers;
    if (activeTab === 'all') {
      filtered = onlineUsers;
    } else if (activeTab === 'favorites') {
      filtered = userList.filter(p => favorites.has(p.user_id));
    } else if (groups[activeTab]) {
      filtered = userList.filter(p => groups[activeTab].includes(p.user_id));
    }

    return { online: filtered.filter(p => p.status !== 'offline'), offline: offlineUsers };
  };

  const renderUserRow = (presence) => {
    const user = userDirectory[presence.user_id];
    const callsign = user?.callsign || 'UNKNOWN';
    const isFav = favorites.has(presence.user_id);

    return (
      <div key={presence.user_id} className="bg-zinc-900/50 border border-zinc-800 p-1.5 text-[9px] space-y-1">
        <div className="flex items-center gap-2">
          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusColors[presence.status])} />
          <span className="font-bold text-zinc-300 truncate flex-1">{callsign}</span>
          <button
            onClick={() => toggleFavorite(presence.user_id)}
            className={cn('transition-colors', isFav ? 'text-yellow-400' : 'text-zinc-600 hover:text-zinc-400')}
          >
            <Star className="w-3 h-3" fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="flex gap-1 pt-1 border-t border-zinc-800/50">
          <button className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 bg-emerald-900/30 border border-emerald-800/50 hover:bg-emerald-900/50 transition-colors text-emerald-300 text-[8px]">
            <Phone className="w-2 h-2" />
            HAIL
          </button>
        </div>
      </div>
    );
  };

  const { online: filteredUsers, offline: offlineUsers } = getFilteredUsers();
  const allTabs = ['all', 'favorites', ...Object.keys(groups)];

  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Search Bar */}
      <div className="flex items-center gap-1 px-1.5 py-1 bg-zinc-900/50 border border-zinc-800 shrink-0">
        <Search className="w-3 h-3 text-zinc-600" />
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-[9px] text-white placeholder-zinc-600 focus:outline-none"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 border-b border-zinc-800 shrink-0">
        {allTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-2 py-1 text-[9px] font-bold uppercase whitespace-nowrap transition-colors shrink-0',
              activeTab === tab
                ? 'text-[#ea580c] border-b-2 border-[#ea580c]'
                : 'text-zinc-500 hover:text-zinc-400'
            )}
          >
            {tab === 'all' ? 'ALL' : tab === 'favorites' ? '⭐ FAVORITES' : tab}
          </button>
        ))}

        {/* New Group Button */}
        <button
          onClick={() => setShowNewGroupForm(!showNewGroupForm)}
          className="px-2 py-1 text-[9px] font-bold text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
          title="Create new group"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* New Group Form */}
      {showNewGroupForm && (
        <div className="flex gap-1 pb-2">
          <input
            type="text"
            placeholder="Group name..."
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') createGroup(newGroupName);
            }}
            className="flex-1 bg-zinc-900 border border-zinc-700 text-[9px] px-2 py-1 text-white placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]"
            autoFocus
          />
          <button
            onClick={() => createGroup(newGroupName)}
            className="px-2 py-1 bg-emerald-900/30 border border-emerald-800/50 hover:bg-emerald-900/50 text-emerald-300 text-[8px] font-bold"
          >
            CREATE
          </button>
          <button
            onClick={() => setShowNewGroupForm(false)}
            className="px-2 py-1 bg-zinc-800/30 border border-zinc-700/50 text-zinc-400 hover:text-zinc-300"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* User List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-1.5">
          {/* Online Users */}
          {filteredUsers.length > 0 && (
            <>
              <div className="text-[8px] font-bold uppercase text-zinc-600 px-1 py-1.5 sticky top-0 bg-zinc-950 border-b border-zinc-800">
                ONLINE ({filteredUsers.length})
              </div>
              {filteredUsers.map(presence => renderUserRow(presence))}
            </>
          )}

          {/* Offline Users Toggle */}
          {offlineUsers.length > 0 && (
            <>
              <button
                onClick={() => setShowOffline(!showOffline)}
                className="w-full text-[8px] font-bold uppercase text-zinc-600 hover:text-zinc-400 px-1 py-1.5 border-b border-zinc-800 transition-colors text-left"
              >
                {showOffline ? '▼' : '▶'} OFFLINE ({offlineUsers.length})
              </button>

              {showOffline && (
                <div className="space-y-1.5">
                  {offlineUsers.map(presence => renderUserRow(presence))}
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {filteredUsers.length === 0 && offlineUsers.length === 0 && (
            <div className="text-[10px] text-zinc-600 px-1 py-2">
              {searchQuery ? 'No users found' : activeTab === 'favorites' ? 'No favorites yet' : 'No users'}
            </div>
          )}
        </div>
      </div>

      {/* Group Management Dropdown */}
      {activeTab !== 'all' && activeTab !== 'favorites' && groups[activeTab] && (
        <div className="pt-2 border-t border-zinc-800/50 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-zinc-500">{groups[activeTab].length} members</span>
            <button
              onClick={() => deleteGroup(activeTab)}
              className="text-[8px] text-red-600 hover:text-red-400 transition-colors"
            >
              DELETE GROUP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}