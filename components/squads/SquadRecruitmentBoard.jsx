import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Briefcase, Send, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function CreateRecruitmentDialog({ squad, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    positions_available: 1,
    required_skills: '',
    min_rank: ''
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.SquadRecruitment.create({
        ...data,
        squad_id: squad.id,
        posted_by: user.id,
        required_skills: data.required_skills.split(',').map(s => s.trim()).filter(Boolean)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-recruitments'] });
      toast.success('Recruitment posted');
      setOpen(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Post Recruitment</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
          <Input
            placeholder="Position Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
            required
          />
          <Textarea
            placeholder="Describe the role, expectations, and requirements..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="bg-zinc-900 border-zinc-800 min-h-[100px]"
          />
          <Input
            type="number"
            placeholder="Positions Available"
            value={formData.positions_available}
            onChange={(e) => setFormData({ ...formData, positions_available: parseInt(e.target.value) })}
            className="bg-zinc-900 border-zinc-800"
          />
          <Input
            placeholder="Required Skills (comma-separated)"
            value={formData.required_skills}
            onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
          />
          <Input
            placeholder="Minimum Rank (optional)"
            value={formData.min_rank}
            onChange={(e) => setFormData({ ...formData, min_rank: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#ea580c] hover:bg-[#c2410c]">Post Opening</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApplicationsDialog({ recruitment, trigger }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: applications = [] } = useQuery({
    queryKey: ['squad-applications', recruitment.id],
    queryFn: () => base44.entities.SquadApplication.filter({ recruitment_id: recruitment.id }),
    enabled: open
  });

  const { data: applicants = [] } = useQuery({
    queryKey: ['applicants', applications.map(a => a.applicant_id).join(',')],
    queryFn: async () => {
      if (applications.length === 0) return [];
      const users = await Promise.all(
        applications.map(a => base44.entities.User.get(a.applicant_id).catch(() => null))
      );
      return users.filter(Boolean).map((user, idx) => ({ ...user, application: applications[idx] }));
    },
    enabled: applications.length > 0
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ applicationId, status }) => {
      const user = await base44.auth.me();
      await base44.entities.SquadApplication.update(applicationId, {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      });
      if (status === 'approved') {
        const app = applications.find(a => a.id === applicationId);
        await base44.entities.SquadMembership.create({
          squad_id: recruitment.squad_id,
          user_id: app.applicant_id,
          role: 'member'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-applications'] });
      queryClient.invalidateQueries({ queryKey: ['squad-memberships'] });
      toast.success('Application reviewed');
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-3xl">
        <DialogHeader>
          <DialogTitle>Applications: {recruitment.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {applicants.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No applications yet</div>
          ) : (
            applicants.map((applicant) => (
              <Card key={applicant.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-white">
                        {applicant.callsign || applicant.rsi_handle || 'OPERATIVE'}
                      </div>
                      <div className="text-xs text-zinc-500 mb-2">{applicant.rank || 'Vagrant'}</div>
                      {applicant.application.message && (
                        <div className="text-sm text-zinc-400 bg-zinc-950 p-2 rounded mt-2">
                          {applicant.application.message}
                        </div>
                      )}
                      <Badge className={cn(
                        "mt-2 text-[9px]",
                        applicant.application.status === 'pending' && "bg-amber-900 text-amber-400",
                        applicant.application.status === 'approved' && "bg-emerald-900 text-emerald-400",
                        applicant.application.status === 'rejected' && "bg-red-900 text-red-400"
                      )}>
                        {applicant.application.status}
                      </Badge>
                    </div>
                    {applicant.application.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => reviewMutation.mutate({ 
                            applicationId: applicant.application.id, 
                            status: 'approved' 
                          })}
                          className="bg-emerald-900 hover:bg-emerald-800 text-emerald-400"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => reviewMutation.mutate({ 
                            applicationId: applicant.application.id, 
                            status: 'rejected' 
                          })}
                          className="bg-red-900 hover:bg-red-800 text-red-400"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SquadRecruitmentBoard({ squad, isLeader }) {
  const [applyingTo, setApplyingTo] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: recruitments = [] } = useQuery({
    queryKey: ['squad-recruitments', squad?.id],
    queryFn: () => base44.entities.SquadRecruitment.filter({ 
      squad_id: squad.id, 
      status: 'open' 
    }),
    enabled: !!squad
  });

  const applyMutation = useMutation({
    mutationFn: async ({ recruitmentId, message }) => {
      const user = await base44.auth.me();
      return base44.entities.SquadApplication.create({
        recruitment_id: recruitmentId,
        squad_id: squad.id,
        applicant_id: user.id,
        message
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-applications'] });
      toast.success('Application submitted');
      setApplyingTo(null);
      setApplicationMessage('');
    }
  });

  return (
    <div className="space-y-4">
      {isLeader && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="border-b border-zinc-900">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase font-bold tracking-wider text-zinc-400">
                Recruitment Management
              </CardTitle>
              <CreateRecruitmentDialog
                squad={squad}
                trigger={
                  <Button size="sm" className="bg-[#ea580c] hover:bg-[#c2410c]">
                    <Briefcase className="w-3 h-3 mr-2" />
                    Post Opening
                  </Button>
                }
              />
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recruitments.length === 0 ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500">
              No open recruitment positions
            </CardContent>
          </Card>
        ) : (
          recruitments.map((recruitment) => (
            <Card key={recruitment.id} className="bg-zinc-950 border-zinc-800">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <div className="font-bold text-white mb-1">{recruitment.title}</div>
                    <div className="text-xs text-zinc-500">{recruitment.description}</div>
                  </div>
                  
                  {recruitment.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recruitment.required_skills.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-[9px]">{skill}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <div className="text-xs text-zinc-500">
                      {recruitment.positions_available} position(s)
                    </div>
                    {isLeader ? (
                      <ApplicationsDialog
                        recruitment={recruitment}
                        trigger={
                          <Button size="sm" variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            View Applications
                          </Button>
                        }
                      />
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setApplyingTo(recruitment.id)}
                        className="bg-[#ea580c] hover:bg-[#c2410c] text-xs"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {applyingTo && (
        <Dialog open={!!applyingTo} onOpenChange={() => setApplyingTo(null)}>
          <DialogContent className="bg-zinc-950 border-zinc-800">
            <DialogHeader>
              <DialogTitle>Submit Application</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              applyMutation.mutate({ recruitmentId: applyingTo, message: applicationMessage });
            }} className="space-y-4">
              <Textarea
                placeholder="Tell us why you'd be a great fit for this role..."
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                className="bg-zinc-900 border-zinc-800 min-h-[120px]"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setApplyingTo(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#ea580c] hover:bg-[#c2410c]">
                  Submit Application
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}