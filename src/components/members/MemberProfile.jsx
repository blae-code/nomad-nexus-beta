import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Zap, Activity, Award, Mail, Shield, Medal, Ship } from 'lucide-react';
import { getDisplayCallsign } from '@/utils';
import { getMembershipLabel } from '@/components/constants/labels';
import RoleAssignment from '@/components/members/RoleAssignment';
import SkillAssessment from '@/components/members/SkillAssessment';
import MemberDossier from '@/components/members/MemberDossier';
import MemberHangar from '@/components/members/MemberHangar';
import MemberCommendations from '@/components/members/MemberCommendations';

export default function MemberProfile({ member, onMemberUpdate }) {
  const [participationHistory, setParticipationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showRoleAssignment, setShowRoleAssignment] = useState(false);

  useEffect(() => {
    if (member?.id) {
      loadParticipationHistory();
    }
  }, [member?.id]);

  const loadParticipationHistory = async () => {
    setLoadingHistory(true);
    try {
      const events = await base44.entities.Event.list('-start_time', 100);
      const memberId = member.profile?.id || member.id;
      const memberEvents = events
        .filter((e) => {
          const assigned = e.assigned_member_profile_ids || e.assigned_user_ids || [];
          return assigned.includes(memberId);
        })
        .slice(0, 10);
      setParticipationHistory(memberEvents);
    } catch (error) {
      console.error('Failed to load participation history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getRankColor = (rank) => {
    const colors = {
      VAGRANT: 'text-zinc-500 bg-zinc-900',
      SCOUT: 'text-blue-400 bg-blue-950',
      VOYAGER: 'text-purple-400 bg-purple-950',
      COMMANDER: 'text-orange-400 bg-orange-950',
    };
    const color = colors[rank] || 'text-zinc-400 bg-zinc-900';
    return color;
  };

  return (
    <div className="bg-zinc-900/50 border-2 border-zinc-800 rounded p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase mb-2">{member.full_name}</h2>
          <div className="space-y-2">
            <p className="text-sm text-zinc-400 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {member.email}
            </p>
            {member.profile?.callsign && (
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-sm font-bold flex items-center gap-2 ${getRankColor(member.profile?.rank)}`}>
                  <Shield className="w-4 h-4" />
                  {getDisplayCallsign(member.profile) || member.profile.callsign} • {member.profile?.rank}
                </p>
                {member.profile?.membership && (
                  <span className="text-[10px] font-mono font-semibold uppercase border rounded px-1.5 py-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/50">
                    {getMembershipLabel(member.profile?.membership)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => setShowRoleAssignment(!showRoleAssignment)} variant="outline" size="sm">
          🔐 Manage Roles
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <Award className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="dossier">
            <Medal className="w-4 h-4 mr-2" />
            Dossier
          </TabsTrigger>
          <TabsTrigger value="participation">
            <Activity className="w-4 h-4 mr-2" />
            Participation
          </TabsTrigger>
          <TabsTrigger value="hangar">
            <Ship className="w-4 h-4 mr-2" />
            Hangar
          </TabsTrigger>
          <TabsTrigger value="skills">
            <Zap className="w-4 h-4 mr-2" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="commendations">
            <Medal className="w-4 h-4 mr-2" />
            Commendations
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
              <div className="text-xs text-zinc-400 mb-2">RANK</div>
              <div className="text-lg font-bold text-orange-400">{member.profile?.rank || 'VAGRANT'}</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
              <div className="text-xs text-zinc-400 mb-2">MEMBERSHIP</div>
              <div className="text-lg font-bold text-cyan-300">
                {getMembershipLabel(member.profile?.membership || 'VAGRANT')}
              </div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
              <div className="text-xs text-zinc-400 mb-2">CALLSIGN</div>
              <div className="text-lg font-bold text-white">{getDisplayCallsign(member.profile) || 'N/A'}</div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
              <div className="text-xs text-zinc-400 mb-2">STATUS</div>
              <div className="text-lg font-bold text-green-400">
                {member.profile?.onboarding_completed ? 'Active' : 'Pending'}
              </div>
            </div>
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
              <div className="text-xs text-zinc-400 mb-2">AI CONSENT</div>
              <div className="text-lg font-bold text-blue-400">
                {member.profile?.ai_consent ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>

          {member.profile?.bio && (
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
              <div className="text-xs text-zinc-400 mb-2">BIO</div>
              <div className="text-sm text-zinc-300">{member.profile.bio}</div>
            </div>
          )}

          {/* Role Assignment Section */}
          {showRoleAssignment && (
            <RoleAssignment member={member} onComplete={() => setShowRoleAssignment(false)} onMemberUpdate={onMemberUpdate} />
          )}
        </TabsContent>

        <TabsContent value="dossier" className="space-y-4">
          <MemberDossier
            member={member}
            participationHistory={participationHistory}
            onMemberUpdate={onMemberUpdate}
          />
        </TabsContent>

        {/* Participation Tab */}
        <TabsContent value="participation" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase">Recent Operations</h3>
            <span className="text-xs text-zinc-500">{participationHistory.length} total</span>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8 text-zinc-500 text-sm">Loading history...</div>
          ) : participationHistory.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No operations found</div>
          ) : (
            <div className="space-y-3">
              {participationHistory.map((event) => (
                <div key={event.id} className="p-4 bg-zinc-800/50 border border-zinc-700 rounded space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-white text-sm">{event.title}</h4>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      event.status === 'completed' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(event.start_time).toLocaleDateString()}
                  </p>
                  {event.description && <p className="text-xs text-zinc-400">{event.description}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hangar" className="space-y-4">
          <MemberHangar memberId={member.profile?.id || member.id} onMemberUpdate={onMemberUpdate} />
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <SkillAssessment member={member} participationHistory={participationHistory} />
        </TabsContent>

        <TabsContent value="commendations">
          <MemberCommendations memberId={member.profile?.id || member.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
