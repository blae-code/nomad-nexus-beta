import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Users, TrendingUp } from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/common/UIStates';
import SkillTree from '@/components/progression/SkillTree';
import PromotionRecommendations from '@/components/progression/PromotionRecommendations';
import MentorshipMatching from '@/components/progression/MentorshipMatching';

export default function MemberProgression() {
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
      const users = await base44.entities.User.list();
      const profiles = await Promise.all(
        users.map(async (user) => {
          try {
            const profile = await base44.entities.MemberProfile.filter({ user_id: user.id });
            return { ...user, profile: profile[0] || null };
          } catch {
            return { ...user, profile: null };
          }
        })
      );
      setMembers(profiles);
      if (profiles.length > 0) setSelectedMember(profiles[0]);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.profile?.callsign?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LoadingState label="Loading progression data..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Member Progression</h1>
          <p className="text-zinc-400 text-sm">Skills, promotions, and mentorship matching</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Members List */}
        <div className="col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className="pl-10"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className={`w-full text-left p-3 rounded transition border ${
                  selectedMember?.id === member.id
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-purple-500/50'
                }`}
              >
                <div className="font-bold text-white text-sm">{member.full_name}</div>
                <div className="text-xs text-zinc-400">{member.profile?.callsign || 'N/A'}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Progression Details */}
        <div className="col-span-2">
          {!selectedMember ? (
            <EmptyState icon={Users} title="No member selected" message="Choose a member to view progression" />
          ) : (
            <div className="bg-zinc-900/50 border-2 border-zinc-800 rounded p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-white uppercase mb-1">{selectedMember.full_name}</h2>
                <p className="text-zinc-400 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {selectedMember.profile?.rank || 'VAGRANT'}
                </p>
              </div>

              <Tabs defaultValue="skills" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="skills">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Skill Tree
                  </TabsTrigger>
                  <TabsTrigger value="promotions">
                    <Users className="w-4 h-4 mr-2" />
                    Promotion Path
                  </TabsTrigger>
                  <TabsTrigger value="mentorship">Mentorship</TabsTrigger>
                </TabsList>

                <TabsContent value="skills">
                  <SkillTree member={selectedMember} />
                </TabsContent>

                <TabsContent value="promotions">
                  <PromotionRecommendations member={selectedMember} onMemberUpdate={loadMembers} />
                </TabsContent>

                <TabsContent value="mentorship">
                  <MentorshipMatching currentMember={selectedMember} allMembers={members} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}