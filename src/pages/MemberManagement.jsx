import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users, UserPlus } from 'lucide-react';
import { getDisplayCallsign } from '@/utils';
import { LoadingState, EmptyState } from '@/components/common/UIStates';
import MemberList from '@/components/members/MemberList';
import MemberProfile from '@/components/members/MemberProfile';

export default function MemberManagement({ embedded = false }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const profiles = await base44.entities.MemberProfile.list('-created_date', 200);
      const membersFromProfiles = (profiles || []).map((profile) => ({
        id: profile.id,
        full_name: getDisplayCallsign(profile) || profile.callsign || 'Unknown',
        email: profile.email || '',
        profile,
      }));
      setMembers(membersFromProfiles);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    const display = getDisplayCallsign(member.profile).toLowerCase();
    return (
      member.full_name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      display.includes(query)
    );
  });

  const containerClass = embedded ? 'w-full' : 'max-w-7xl mx-auto px-4 py-8';

  if (loading) {
    return (
      <div className={containerClass}>
        <LoadingState label="Loading member data..." />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {!embedded && (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">Member Management</h1>
            <p className="text-zinc-400 text-sm">View profiles, track participation, manage roles</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadMembers}>
            🔄 Refresh
          </Button>
        </div>
      )}

      {/* Search */}
      <div className={`mb-6 ${embedded ? 'flex items-center gap-2' : ''}`}>
        <div className={`relative ${embedded ? 'flex-1' : ''}`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members by name, email, or callsign..."
            className="pl-10"
          />
        </div>
        {embedded && (
          <Button variant="outline" size="sm" onClick={loadMembers}>
            🔄 Refresh
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Members List */}
        <div className="col-span-1">
          <MemberList
            members={filteredMembers}
            selectedMember={selectedMember}
            onSelectMember={setSelectedMember}
          />
        </div>

        {/* Member Details */}
        <div className="col-span-2">
          {!selectedMember ? (
            <EmptyState
              icon={Users}
              title="Select a member"
              message="Choose a member to view details and manage roles"
            />
          ) : (
            <MemberProfile member={selectedMember} onMemberUpdate={loadMembers} />
          )}
        </div>
      </div>
    </div>
  );
}
