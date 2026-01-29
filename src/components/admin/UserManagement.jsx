import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail } from 'lucide-react';
import { useNotification } from '@/components/providers/NotificationContext';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const { addNotification } = useNotification();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const userList = await base44.entities.User.list();
      setUsers(userList);

      // Load member profiles
      const profileMap = {};
      for (const user of userList) {
        const userProfiles = await base44.entities.MemberProfile.filter({ user_id: user.id });
        if (userProfiles.length > 0) {
          profileMap[user.id] = userProfiles[0];
        }
      }
      setProfiles(profileMap);
    } catch (error) {
      console.error('Failed to load users:', error);
      addNotification({ type: 'error', title: 'Error', message: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const profile = profiles[user.id];
    const callsign = profile?.callsign || '';
    const term = searchTerm.toLowerCase();
    return user.email.toLowerCase().includes(term) || callsign.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black uppercase tracking-widest text-white">User Management</h2>
        <p className="text-sm text-zinc-400 mt-1">Manage members and permissions</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
        <Input
          type="text"
          placeholder="Search by email or callsign..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-zinc-900 border-zinc-700"
        />
      </div>

      {/* Users List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center text-zinc-400 py-8">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            {users.length === 0 ? 'No users yet' : 'No users match your search'}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const profile = profiles[user.id];
            return (
              <div key={user.id} className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div>
                        <div className="font-bold text-white">
                          {profile?.callsign || 'No Profile'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-400 mt-2">
                      <span>Role: <span className="text-orange-300 font-bold">{user.role}</span></span>
                      {profile && (
                        <>
                          <span>Rank: <span className="text-orange-300 font-bold">{profile.rank}</span></span>
                          <span>Onboarded: <span className={profile.onboarding_completed ? 'text-green-400' : 'text-yellow-400'}>{profile.onboarding_completed ? 'Yes' : 'No'}</span></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Future action buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="text-xs"
                      title="Coming soon"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}