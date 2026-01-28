import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Star, Edit, Users, UserMinus } from "lucide-react";
import { getRankColorClass } from "@/components/utils/rankUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function EditMemberDialog({ member, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    role: member.membership.role || 'member',
    custom_title: member.membership.custom_title || '',
    responsibilities: member.membership.responsibilities || ''
  });
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: () => base44.asServiceRole.entities.SquadMembership.update(member.membership.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-memberships'] });
      toast.success('Member updated');
      setOpen(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Edit Member: {member.callsign || member.rsi_handle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 uppercase block mb-2">Squad Role</label>
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leader">Leader</SelectItem>
                <SelectItem value="officer">Officer</SelectItem>
                <SelectItem value="specialist">Specialist</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Custom Title (e.g., 'Flight Surgeon', 'Logistics Officer')"
            value={formData.custom_title}
            onChange={(e) => setFormData({ ...formData, custom_title: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
          />
          <Textarea
            placeholder="Assigned responsibilities and duties..."
            value={formData.responsibilities}
            onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
            className="bg-zinc-900 border-zinc-800 min-h-[80px]"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#ea580c] hover:bg-[#c2410c]">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SquadRosterManager({ squad, isLeader }) {
  const queryClient = useQueryClient();

  const { data: memberships = [] } = useQuery({
    queryKey: ['squad-memberships', squad?.id],
    queryFn: () => base44.entities.SquadMembership.filter({ squad_id: squad.id, status: 'active' }),
    enabled: !!squad
  });

  const { data: members = [] } = useQuery({
    queryKey: ['squad-members', memberships.map(m => m.user_id).join(',')],
    queryFn: async () => {
      if (memberships.length === 0) return [];
      const users = await Promise.all(
        memberships.map(m => base44.entities.User.get(m.user_id).catch(() => null))
      );
      return users.filter(Boolean).map((user, idx) => ({
        ...user,
        membership: memberships[idx]
      }));
    },
    enabled: memberships.length > 0
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId) => base44.asServiceRole.entities.SquadMembership.delete(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-memberships'] });
      toast.success('Member removed');
    }
  });

  const roleOrder = { leader: 0, officer: 1, specialist: 2, member: 3 };
  const sortedMembers = [...members].sort((a, b) => 
    roleOrder[a.membership.role] - roleOrder[b.membership.role]
  );

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="border-b border-zinc-900">
        <CardTitle className="text-sm uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Squad Roster
          <Badge variant="outline" className="text-[9px] font-mono">
            {members.length} MEMBERS
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-zinc-900">
          {members.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No members in this squad yet
            </div>
          ) : (
            sortedMembers.map((member) => (
              <div key={member.id} className="p-4 hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded flex items-center justify-center text-lg font-bold",
                      member.membership.role === 'leader' && "bg-red-900/20 text-red-500",
                      member.membership.role === 'officer' && "bg-purple-900/20 text-purple-500",
                      member.membership.role === 'specialist' && "bg-blue-900/20 text-blue-500",
                      member.membership.role === 'member' && "bg-zinc-800 text-zinc-400"
                    )}>
                      {member.membership.role === 'leader' && <Shield className="w-5 h-5" />}
                      {member.membership.role === 'officer' && <Star className="w-5 h-5" />}
                      {(member.callsign || member.rsi_handle || 'O')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-white">
                          {member.callsign || member.rsi_handle || 'OPERATIVE'}
                        </div>
                        <Badge className={cn("text-[9px]", getRankColorClass(member.rank, 'bg'))}>
                          {member.rank || 'Vagrant'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "text-[9px]",
                          member.membership.role === 'leader' && "bg-red-900/20 text-red-400 border-red-900",
                          member.membership.role === 'officer' && "bg-purple-900/20 text-purple-400 border-purple-900",
                          member.membership.role === 'specialist' && "bg-blue-900/20 text-blue-400 border-blue-900",
                          member.membership.role === 'member' && "bg-zinc-800 text-zinc-400"
                        )}>
                          {member.membership.role}
                        </Badge>
                        {member.membership.custom_title && (
                          <Badge variant="outline" className="text-[9px]">
                            {member.membership.custom_title}
                          </Badge>
                        )}
                      </div>
                      {member.membership.responsibilities && (
                        <div className="text-xs text-zinc-500 mt-2 bg-zinc-900 p-2 rounded">
                          {member.membership.responsibilities}
                        </div>
                      )}
                    </div>
                  </div>
                  {isLeader && (
                    <div className="flex gap-1">
                      <EditMemberDialog
                        member={member}
                        trigger={
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-zinc-500 hover:text-[#ea580c]"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        }
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Remove ${member.callsign || member.rsi_handle} from squad?`)) {
                            removeMutation.mutate(member.membership.id);
                          }
                        }}
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-red-500"
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}