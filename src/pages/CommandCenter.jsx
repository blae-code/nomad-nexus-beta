import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/AuthProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';
import { AlertCircle, CheckCircle2, Flag, Target } from 'lucide-react';

const COMMAND_TYPES = ['ATTACK', 'DEFEND', 'MOVE', 'HOLD', 'SUPPORT', 'RECON'];
const PRIORITIES = ['STANDARD', 'HIGH', 'CRITICAL'];
const TARGET_TYPES = [
  { id: 'member', label: 'Individual' },
  { id: 'squad', label: 'Squad' },
  { id: 'net', label: 'Voice Net' },
  { id: 'event', label: 'Operation' },
];

export default function CommandCenter() {
  const { user } = useAuth();
  const activeOp = useActiveOp();
  const member = user?.member_profile_data || user;

  const [loading, setLoading] = useState(true);
  const [commands, setCommands] = useState([]);
  const [members, setMembers] = useState([]);
  const [squads, setSquads] = useState([]);
  const [voiceNets, setVoiceNets] = useState([]);
  const [events, setEvents] = useState([]);

  const [form, setForm] = useState({
    message: '',
    commandType: COMMAND_TYPES[0],
    priority: 'STANDARD',
    targetType: 'member',
    targetIds: [],
    requiresAck: true,
  });

  const commandAuthors = useMemo(
    () => commands.map((c) => c.issued_by_member_profile_id).filter(Boolean),
    [commands]
  );
  const { memberMap } = useMemberProfileMap(commandAuthors);

  const loadCatalogs = useCallback(async () => {
    try {
      const [memberList, squadList, netList, eventList] = await Promise.all([
        base44.entities.MemberProfile.list('-created_date', 200).catch(() => []),
        base44.entities.Squad.list('-created_date', 100).catch(() => []),
        base44.entities.VoiceNet.list('-created_date', 100).catch(() => []),
        base44.entities.Event.list('-start_time', 100).catch(() => []),
      ]);
      setMembers(memberList || []);
      setSquads(squadList || []);
      setVoiceNets(netList || []);
      setEvents(eventList || []);
    } catch (error) {
      console.error('Failed to load command catalogs:', error);
    }
  }, []);

  const loadCommands = useCallback(async () => {
    setLoading(true);
    try {
      const filter = activeOp?.activeEventId ? { event_id: activeOp.activeEventId } : {};
      const list = await base44.entities.TacticalCommand.filter(filter, '-created_date', 200).catch(() => []);
      setCommands(list || []);
    } catch (error) {
      console.error('Failed to load commands:', error);
    } finally {
      setLoading(false);
    }
  }, [activeOp?.activeEventId]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    loadCommands();
  }, [loadCommands]);

  useEffect(() => {
    if (!base44.entities.TacticalCommand?.subscribe) return undefined;
    const unsubscribe = base44.entities.TacticalCommand.subscribe((event) => {
      setCommands((prev) => {
        if (event.type === 'create') return [event.data, ...prev];
        if (event.type === 'update') return prev.map((c) => (c.id === event.id ? event.data : c));
        if (event.type === 'delete') return prev.filter((c) => c.id !== event.id);
        return prev;
      });
    });
    return () => unsubscribe?.();
  }, []);

  const handleSubmit = async () => {
    if (!form.message.trim() || form.targetIds.length === 0) return;
    try {
      await base44.functions.invoke('issueTacticalOrder', {
        eventId: activeOp?.activeEventId || null,
        message: form.message.trim(),
        commandType: form.commandType,
        priority: form.priority,
        targetType: form.targetType,
        targetIds: form.targetIds,
        requiresAck: form.requiresAck,
      });
      setForm((prev) => ({ ...prev, message: '', targetIds: [] }));
    } catch (error) {
      console.error('Failed to issue command:', error);
    }
  };

  const handleAcknowledge = async (commandId) => {
    try {
      await base44.functions.invoke('acknowledgeTacticalOrder', { commandId });
    } catch (error) {
      console.error('Failed to acknowledge command:', error);
    }
  };

  const targetOptions = useMemo(() => {
    if (form.targetType === 'member') {
      return members.map((m) => ({ id: m.id, label: m.display_callsign || m.callsign || m.full_name || m.email || m.id }));
    }
    if (form.targetType === 'squad') {
      return squads.map((s) => ({ id: s.id, label: s.name || s.code || s.id }));
    }
    if (form.targetType === 'net') {
      return voiceNets.map((n) => ({ id: n.id, label: n.label || n.name || n.code || n.id }));
    }
    return events.map((e) => ({ id: e.id, label: e.title || e.id }));
  }, [form.targetType, members, squads, voiceNets, events]);

  const activeEventLabel = activeOp?.activeEvent?.title || 'No active operation';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Command Center</h1>
        <p className="text-zinc-400 text-sm">Issue orders, track acknowledgements, and maintain control</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Active Operation</div>
            <div className="text-sm font-semibold text-orange-400 mt-2">{activeEventLabel}</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <Flag className="w-3 h-3" />
              Issue Command
            </div>
            <Textarea
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Order details..."
              className="min-h-[80px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.commandType}
                onChange={(e) => setForm((prev) => ({ ...prev, commandType: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                {COMMAND_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            <select
              value={form.targetType}
              onChange={(e) => setForm((prev) => ({ ...prev, targetType: e.target.value, targetIds: [] }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              {TARGET_TYPES.map((target) => (
                <option key={target.id} value={target.id}>{target.label}</option>
              ))}
            </select>

            <select
              multiple
              value={form.targetIds}
              onChange={(e) => {
                const selections = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                setForm((prev) => ({ ...prev, targetIds: selections }));
              }}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded h-24"
            >
              {targetOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={form.requiresAck}
                onChange={(e) => setForm((prev) => ({ ...prev, requiresAck: e.target.checked }))}
              />
              Require acknowledgement
            </label>

            <Button onClick={handleSubmit} className="w-full" disabled={!form.message.trim() || form.targetIds.length === 0}>
              Issue Command
            </Button>
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <Target className="w-3 h-3" />
              Active Orders
            </div>
            <div className="text-xs text-zinc-500">{commands.length} issued</div>
          </div>

          {loading ? (
            <div className="text-center text-zinc-500 py-8">Loading commands...</div>
          ) : commands.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">No commands issued yet.</div>
          ) : (
            <div className="space-y-3">
              {commands.map((command) => {
                const author = memberMap[command.issued_by_member_profile_id]?.label || command.issued_by_member_profile_id || 'Command';
                const acknowledgements = Array.isArray(command.acknowledged_by_member_profile_ids)
                  ? command.acknowledged_by_member_profile_ids
                  : [];
                const targets = Array.isArray(command.target_member_profile_ids)
                  ? command.target_member_profile_ids
                  : [];
                const ackCount = acknowledgements.length;
                const targetCount = targets.length || command.target_ids?.length || 0;
                const hasAcknowledged = acknowledgements.includes(member?.id);
                const isRecipient = targets.length === 0 ? true : targets.includes(member?.id);

                return (
                  <div key={command.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs text-orange-400 uppercase tracking-widest">{command.command_type || 'ORDER'}</div>
                        <div className="text-sm font-semibold text-white">{command.message}</div>
                      </div>
                      <div className="text-[10px] text-zinc-500">{command.priority}</div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span>Issued by {author}</span>
                      {command.created_date && <span>{new Date(command.created_date).toLocaleString()}</span>}
                    </div>
                    {command.requires_ack && (
                      <div className="flex items-center gap-2 text-xs">
                        {ackCount >= targetCount && targetCount > 0 ? (
                          <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> All acknowledged</span>
                        ) : (
                          <span className="text-orange-300 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {ackCount}/{targetCount || '—'} acknowledged</span>
                        )}
                      </div>
                    )}
                    {command.requires_ack && isRecipient && !hasAcknowledged && (
                      <Button size="sm" onClick={() => handleAcknowledge(command.id)}>
                        Acknowledge
                      </Button>
                    )}
                    {hasAcknowledged && (
                      <div className="text-[10px] text-green-400">Acknowledged</div>
                    )}
                    {targets.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500">
                        {targets.slice(0, 6).map((id) => (
                          <span key={id} className="px-2 py-1 border border-zinc-700 rounded">{memberMap[id]?.label || id}</span>
                        ))}
                        {targets.length > 6 && <span>+{targets.length - 6} more</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
