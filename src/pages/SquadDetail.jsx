import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Calendar, Briefcase, ArrowLeft } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import SquadRosterManager from "@/components/squads/SquadRosterManager";
import SquadEventsManager from "@/components/squads/SquadEventsManager";
import SquadRecruitmentBoard from "@/components/squads/SquadRecruitmentBoard";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

export default function SquadDetailPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [squadId, setSquadId] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setSquadId(urlParams.get('id'));
    }
  }, []);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: squad, isLoading } = useQuery({
    queryKey: ['squad-detail', squadId],
    queryFn: () => base44.entities.Squad.get(squadId),
    enabled: !!squadId
  });

  const { data: membership } = useQuery({
    queryKey: ['my-squad-membership', squadId, currentUser?.id],
    queryFn: async () => {
      const memberships = await base44.entities.SquadMembership.filter({ 
        squad_id: squadId, 
        user_id: currentUser.id,
        status: 'active'
      });
      return memberships[0] || null;
    },
    enabled: !!squadId && !!currentUser
  });

  const isLeader = membership?.role === 'leader' || currentUser?.rank === 'Pioneer' || currentUser?.is_system_administrator;

  if (isLoading) {
    return (
      <PageShell title="Loading..." subtitle="SQUAD">
        <div className="p-12 text-center text-zinc-500">Loading squad details...</div>
      </PageShell>
    );
  }

  if (!squad) {
    return (
      <PageShell title="Not Found" subtitle="SQUAD">
        <div className="p-12 text-center text-zinc-500">Squad not found</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={squad.name}
      subtitle="SQUAD OPERATIONS"
    >
      <div className="px-6 py-6 space-y-6">
        <Link to={createPageUrl('AdminConsole')}>
          <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-300 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>

        {/* Squad Header */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-8 h-8 text-[#ea580c]" />
                  <div>
                    <h1 className="text-2xl font-bold text-white">{squad.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px]">
                        {squad.hierarchy_level}
                      </Badge>
                      {squad.is_invite_only && (
                        <Badge className="text-[9px] bg-amber-900 text-amber-400">
                          INVITE ONLY
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {squad.description && (
                  <p className="text-zinc-400 mt-2">{squad.description}</p>
                )}
                {squad.requirements && (
                  <div className="text-xs text-zinc-500 mt-2">
                    <span className="text-[#ea580c]">Requirements:</span> {squad.requirements}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="roster" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="roster" className="data-[state=active]:bg-zinc-800">
              <Users className="w-4 h-4 mr-2" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-zinc-800">
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="recruitment" className="data-[state=active]:bg-zinc-800">
              <Briefcase className="w-4 h-4 mr-2" />
              Recruitment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roster">
            <SquadRosterManager squad={squad} isLeader={isLeader} />
          </TabsContent>

          <TabsContent value="events">
            <SquadEventsManager squad={squad} isLeader={isLeader} />
          </TabsContent>

          <TabsContent value="recruitment">
            <SquadRecruitmentBoard squad={squad} isLeader={isLeader} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}