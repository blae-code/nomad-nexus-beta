import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Square, AlertTriangle, Radio, Megaphone, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OperationQuickActions({ user, selectedEvent, events, incidents, userRole }) {
  const queryClient = useQueryClient();
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const canControlOps = userRole.permissions.includes('full_control') || userRole.permissions.includes('tactical_control');
  const canBroadcast = userRole.permissions.includes('broadcast');
  const canManagePersonnel = userRole.permissions.includes('personnel_assignment');
  const canTransitionPhase = userRole.permissions.includes('phase_transitions');

  const activeEvents = events.filter(e => e.status === 'active');
  const scheduledEvents = events.filter(e => e.status === 'scheduled');

  const startEventMutation = useMutation({
    mutationFn: (eventId) => base44.entities.Event.update(eventId, { status: 'active', phase: 'ACTIVE' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      toast.success('Operation activated');
    }
  });

  const endEventMutation = useMutation({
    mutationFn: (eventId) => base44.entities.Event.update(eventId, { status: 'completed', phase: 'DEBRIEF' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      toast.success('Operation completed');
    }
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      setShowNewEvent(false);
      toast.success('Operation created');
    }
  });

  const createIncidentMutation = useMutation({
    mutationFn: (data) => base44.entities.Incident.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['incidents']);
      setShowNewIncident(false);
      toast.success('Incident reported');
    }
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: (incidentId) => base44.entities.Incident.update(incidentId, { 
      status: 'resolved',
      resolved_by: user?.id,
      resolved_at: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['incidents']);
      toast.success('Incident resolved');
    }
  });

  return (
    <div className="space-y-4">
      {/* Current Operation Status */}
      <div className="border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">CURRENT OPERATION</h3>
          <Badge variant="outline" className="text-[10px]">{selectedEvent.phase}</Badge>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-bold text-zinc-200">{selectedEvent.title}</div>
          <div className="text-xs text-zinc-500">{selectedEvent.description}</div>
          {canTransitionPhase && selectedEvent.status === 'active' && (
            <Button
              size="sm"
              onClick={() => endEventMutation.mutate(selectedEvent.id)}
              className="gap-2 bg-red-900/50 hover:bg-red-900"
            >
              <Square className="w-3 h-3" />
              Complete Operation
            </Button>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {canControlOps && (
          <Dialog open={showNewEvent} onOpenChange={setShowNewEvent}>
            <DialogTrigger asChild>
              <Button className="h-20 flex flex-col gap-2 bg-emerald-950/50 border border-emerald-900/50 hover:bg-emerald-900/30">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span className="text-xs text-zinc-200 font-bold">NEW OPERATION</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Create New Operation</DialogTitle>
            </DialogHeader>
            <NewEventForm onSubmit={createEventMutation.mutate} />
          </DialogContent>
          </Dialog>
        )}

        <Dialog open={showNewIncident} onOpenChange={setShowNewIncident}>
          <DialogTrigger asChild>
            <Button className="h-20 flex flex-col gap-2 bg-red-950/50 border border-red-900/50 hover:bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-xs text-zinc-200 font-bold">REPORT INCIDENT</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Report Incident</DialogTitle>
            </DialogHeader>
            <NewIncidentForm onSubmit={createIncidentMutation.mutate} userId={user?.id} />
          </DialogContent>
        </Dialog>

        {canBroadcast && (
          <Dialog open={showBroadcast} onOpenChange={setShowBroadcast}>
          <DialogTrigger asChild>
            <Button className="h-20 flex flex-col gap-2 bg-orange-950/50 border border-orange-900/50 hover:bg-orange-900/30">
              <Megaphone className="w-5 h-5 text-orange-400" />
              <span className="text-xs text-zinc-200 font-bold">BROADCAST ALERT</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-200">Broadcast Alert</DialogTitle>
            </DialogHeader>
            <BroadcastForm />
          </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Permission Notice for Limited Roles */}
      {!canControlOps && (
        <div className="border border-zinc-800 bg-zinc-900/30 p-3">
          <p className="text-xs text-zinc-500 italic">
            Your role: <span className="text-zinc-300 font-bold">{userRole.label}</span> — Limited operational controls
          </p>
        </div>
      )}

      {/* Scheduled Operations - Only for commanders */}
      {canControlOps && scheduledEvents.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-950/50">
          <div className="px-4 py-2 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Scheduled Operations</h3>
          </div>
          <div className="p-4 space-y-2">
            {scheduledEvents.slice(0, 5).map(event => (
              <div key={event.id} className="flex items-center justify-between p-3 border border-zinc-800 bg-zinc-900/30">
                <div>
                  <div className="text-sm font-bold text-zinc-200">{event.title}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(event.start_time).toLocaleString()}
                  </div>
                </div>
                {canTransitionPhase && (
                  <Button
                    size="sm"
                    onClick={() => startEventMutation.mutate(event.id)}
                    disabled={startEventMutation.isPending}
                    className="gap-2 bg-emerald-900/50 hover:bg-emerald-900"
                  >
                    <Play className="w-3 h-3" />
                    Start
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Incidents */}
      <div className="border border-red-900/50 bg-red-950/20">
        <div className="px-4 py-2 border-b border-red-900/50 bg-red-950/30">
          <h3 className="text-xs font-bold text-red-300 uppercase tracking-wide">Active Incidents</h3>
        </div>
        <div className="p-4 space-y-2">
          {incidents.filter(i => i.status === 'active').length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No active incidents</p>
          ) : (
            incidents.filter(i => i.status === 'active').map(incident => (
              <div key={incident.id} className="flex items-center justify-between p-3 border border-red-900/50 bg-red-950/30">
                <div>
                  <div className="text-sm font-bold text-red-200">{incident.title}</div>
                  <div className="text-xs text-red-400">Severity: {incident.severity}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveIncidentMutation.mutate(incident.id)}
                  disabled={resolveIncidentMutation.isPending}
                  className="gap-2 border-emerald-800 text-emerald-300 hover:bg-emerald-950"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Resolve
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NewEventForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'focused',
    priority: 'STANDARD',
    start_time: new Date().toISOString()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Operation Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
        className="bg-zinc-900 border-zinc-800"
      />
      <Textarea
        placeholder="Operation Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="bg-zinc-900 border-zinc-800"
      />
      <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
        <SelectTrigger className="bg-zinc-900 border-zinc-800">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CRITICAL">Critical</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="STANDARD">Standard</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" className="w-full">Create Operation</Button>
    </form>
  );
}

function NewIncidentForm({ onSubmit, userId }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM',
    incident_type: 'other',
    reported_by: userId
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Incident Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
        className="bg-zinc-900 border-zinc-800"
      />
      <Textarea
        placeholder="Incident Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="bg-zinc-900 border-zinc-800"
      />
      <Select value={formData.severity} onValueChange={(v) => setFormData({ ...formData, severity: v })}>
        <SelectTrigger className="bg-zinc-900 border-zinc-800">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="CRITICAL">Critical</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
        </SelectContent>
      </Select>
      <Select value={formData.incident_type} onValueChange={(v) => setFormData({ ...formData, incident_type: v })}>
        <SelectTrigger className="bg-zinc-900 border-zinc-800">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="rescue">Rescue</SelectItem>
          <SelectItem value="combat">Combat</SelectItem>
          <SelectItem value="medical">Medical</SelectItem>
          <SelectItem value="technical">Technical</SelectItem>
          <SelectItem value="security">Security</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" className="w-full">Report Incident</Button>
    </form>
  );
}

function BroadcastForm() {
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState('all');

  const handleBroadcast = async () => {
    // Here you would send the broadcast via your messaging system
    toast.success(`Alert broadcast to ${channel}`);
    setMessage('');
  };

  return (
    <div className="space-y-4">
      <Select value={channel} onValueChange={setChannel}>
        <SelectTrigger className="bg-zinc-900 border-zinc-800">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Channels</SelectItem>
          <SelectItem value="command">Command Net</SelectItem>
          <SelectItem value="ops">Operations</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        placeholder="Broadcast message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="bg-zinc-900 border-zinc-800 min-h-24"
      />
      <Button onClick={handleBroadcast} className="w-full gap-2" disabled={!message}>
        <Radio className="w-4 h-4" />
        Send Broadcast
      </Button>
    </div>
  );
}