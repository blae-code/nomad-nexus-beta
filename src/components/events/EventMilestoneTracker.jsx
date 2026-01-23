import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function EventMilestoneTracker({ eventId }) {
  const queryClient = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => base44.entities.Event.get(eventId),
    enabled: !!eventId
  });

  const { data: dutyAssignments = [] } = useQuery({
    queryKey: ['event-duty-assignments', eventId],
    queryFn: () => base44.entities.EventDutyAssignment.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: () => base44.entities.User.filter({ id: { $in: event?.assigned_user_ids || [] } }),
    enabled: !!eventId && !!event?.assigned_user_ids?.length
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ data }) => base44.entities.Event.update(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-detail']);
    }
  });

  // Calculate milestone completion
  const readinessChecklist = event?.readiness_checklist || {};
  const checklistItems = [
    { key: 'comms_provisioned', label: 'Comms Provisioned' },
    { key: 'minimum_attendance_met', label: 'Min Attendance' },
    { key: 'roles_assigned', label: 'Roles Assigned' },
    { key: 'assets_deployed', label: 'Assets Ready' }
  ];

  const completedChecklist = checklistItems.filter(item => readinessChecklist[item.key]).length;
  const checklistProgress = (completedChecklist / checklistItems.length) * 100;

  const objectivesCompleted = event?.objectives?.filter(o => o.is_completed).length || 0;
  const objectivesTotal = event?.objectives?.length || 0;
  const objectivesProgress = objectivesTotal > 0 ? (objectivesCompleted / objectivesTotal) * 100 : 0;

  const requiredRoles = dutyAssignments.filter(d => d.is_required).length;
  const filledRoles = dutyAssignments.filter(d => d.is_filled).length;
  const rolesProgress = requiredRoles > 0 ? (filledRoles / requiredRoles) * 100 : 100;

  const minParticipants = 3; // Configurable
  const participantsProgress = participants.length >= minParticipants ? 100 : (participants.length / minParticipants) * 100;

  // Auto-update phase based on milestones
  React.useEffect(() => {
    if (!event) return;

    const autoUpdatePhase = () => {
      const now = new Date();
      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;

      // Auto-transition to BRIEFING if all readiness checks pass
      if (event.phase === 'PLANNING' && checklistProgress === 100 && rolesProgress === 100) {
        updateEventMutation.mutate({
          data: {
            phase: 'BRIEFING',
            phase_transitioned_at: new Date().toISOString()
          }
        });
        toast.success('Event auto-advanced to BRIEFING phase');
      }

      // Auto-transition to ACTIVE if start time has passed and event is in BRIEFING
      if (event.phase === 'BRIEFING' && now >= startTime) {
        updateEventMutation.mutate({
          data: {
            phase: 'ACTIVE',
            status: 'active',
            phase_transitioned_at: new Date().toISOString()
          }
        });
        toast.success('Event auto-activated');
      }

      // Auto-transition to DEBRIEF if end time has passed
      if (event.phase === 'ACTIVE' && endTime && now >= endTime) {
        updateEventMutation.mutate({
          data: {
            phase: 'DEBRIEF',
            status: 'completed',
            phase_transitioned_at: new Date().toISOString()
          }
        });
        toast.success('Event auto-completed, entering debrief');
      }
    };

    const interval = setInterval(autoUpdatePhase, 30000); // Check every 30s
    autoUpdatePhase(); // Check immediately

    return () => clearInterval(interval);
  }, [event, checklistProgress, rolesProgress]);

  const milestones = [
    {
      id: 'readiness',
      label: 'Readiness Checklist',
      progress: checklistProgress,
      status: checklistProgress === 100 ? 'complete' : checklistProgress > 50 ? 'in-progress' : 'pending',
      detail: `${completedChecklist}/${checklistItems.length} items`
    },
    {
      id: 'roles',
      label: 'Required Roles',
      progress: rolesProgress,
      status: rolesProgress === 100 ? 'complete' : rolesProgress > 50 ? 'in-progress' : 'pending',
      detail: `${filledRoles}/${requiredRoles} filled`
    },
    {
      id: 'participants',
      label: 'Personnel',
      progress: participantsProgress,
      status: participantsProgress === 100 ? 'complete' : participantsProgress > 50 ? 'in-progress' : 'pending',
      detail: `${participants.length}/${minParticipants} min`
    },
    {
      id: 'objectives',
      label: 'Mission Objectives',
      progress: objectivesProgress,
      status: objectivesProgress === 100 ? 'complete' : objectivesProgress > 0 ? 'in-progress' : 'pending',
      detail: `${objectivesCompleted}/${objectivesTotal} complete`
    }
  ];

  const overallProgress = milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>MILESTONES</span>
          </div>
          <Badge
            className={cn(
              "text-[8px] h-4",
              overallProgress === 100 ? "bg-emerald-900/50 text-emerald-400 border-emerald-800" :
              overallProgress >= 50 ? "bg-cyan-900/50 text-cyan-400 border-cyan-800" :
              "bg-amber-900/50 text-amber-400 border-amber-800"
            )}
          >
            {Math.round(overallProgress)}% READY
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {milestones.map(milestone => (
          <div key={milestone.id} className="space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <div className="flex items-center gap-2">
                {milestone.status === 'complete' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                {milestone.status === 'in-progress' && <Clock className="w-3 h-3 text-cyan-500 animate-pulse" />}
                {milestone.status === 'pending' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                <span className="text-zinc-400 uppercase font-mono">{milestone.label}</span>
              </div>
              <span className="text-zinc-500 font-mono">{milestone.detail}</span>
            </div>
            <Progress
              value={milestone.progress}
              className={cn(
                "h-1",
                milestone.status === 'complete' && "[&>div]:bg-emerald-500",
                milestone.status === 'in-progress' && "[&>div]:bg-cyan-500",
                milestone.status === 'pending' && "[&>div]:bg-amber-500"
              )}
            />
          </div>
        ))}

        {/* Phase Prediction */}
        <div className="border-t border-zinc-800 pt-2 mt-2">
          <div className="text-[8px] text-zinc-600 uppercase font-bold mb-1 font-mono tracking-widest">
            AUTO-TRANSITION
          </div>
          <div className="text-[9px] text-zinc-500 space-y-0.5">
            {event?.phase === 'PLANNING' && (
              <div>→ Will advance to BRIEFING when readiness = 100%</div>
            )}
            {event?.phase === 'BRIEFING' && (
              <div>→ Will activate at start time ({new Date(event.start_time).toLocaleString()})</div>
            )}
            {event?.phase === 'ACTIVE' && event?.end_time && (
              <div>→ Will complete at end time ({new Date(event.end_time).toLocaleString()})</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}