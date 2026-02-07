import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { useAuth } from '@/components/providers/AuthProvider';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useLatency } from '@/components/hooks/useLatency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Activity, AlertTriangle, CheckCircle2, Headphones, Lock, Mic, Radio, Shield, Waves } from 'lucide-react';

const PRIORITIES = ['STANDARD', 'HIGH', 'CRITICAL'];
const MOD_ACTIONS = ['MUTE', 'UNMUTE', 'DEAFEN', 'UNDEAFEN', 'KICK', 'LOCK_CHANNEL', 'UNLOCK_CHANNEL'];

function text(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function normalize(input) {
  return String(input || '').trim().toLowerCase();
}

function findHangoutNet(nets) {
  return nets.find((net) => {
    const code = normalize(net?.code);
    const label = normalize(net?.label || net?.name);
    const discipline = normalize(net?.discipline);
    const type = normalize(net?.type);
    return discipline === 'casual' && (
      type === 'general' ||
      code.includes('hang') ||
      code.includes('general') ||
      label.includes('hang') ||
      label.includes('lounge') ||
      label.includes('general')
    );
  }) || null;
}

function findContractNet(nets) {
  return nets.find((net) => {
    const code = normalize(net?.code);
    const label = normalize(net?.label || net?.name);
    return code.includes('contract') || code.includes('trade') || code.includes('job') || label.includes('contract') || label.includes('trade');
  }) || null;
}

function findOperationCommandNet(nets, eventId) {
  if (!eventId) return null;
  return nets.find((net) => String(net?.event_id || net?.eventId || '') === eventId && normalize(net?.type) === 'command')
    || nets.find((net) => String(net?.event_id || net?.eventId || '') === eventId)
    || null;
}

function formatDate(value) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleTimeString();
}

export default function OperationVoiceWorkbench({ channels = [] }) {
  const { user: authUser } = useAuth();
  const currentUser = authUser?.member_profile_data || authUser;
  const voiceNet = useVoiceNet();
  const activeOp = useActiveOp();
  const latency = useLatency();

  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [readiness, setReadiness] = useState({ isReady: false, reason: null, warning: null, envStatus: 'unknown' });
  const [roomStatus, setRoomStatus] = useState({});
  const [priorityFeed, setPriorityFeed] = useState([]);
  const [captionFeed, setCaptionFeed] = useState([]);
  const [moderationFeed, setModerationFeed] = useState([]);
  const [members, setMembers] = useState([]);
  const [latencyHistory, setLatencyHistory] = useState([]);

  const [priorityForm, setPriorityForm] = useState({ message: '', priority: 'STANDARD', lane: 'COMMAND', channelId: '' });
  const [captionForm, setCaptionForm] = useState({ speaker: '', text: '', severity: 'INFO' });
  const [moderationForm, setModerationForm] = useState({ targetMemberProfileId: '', moderationAction: 'MUTE', channelId: '', reason: '' });
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem('nexus.voice.accessibility');
    return saved
      ? JSON.parse(saved)
      : {
          text_fallback: true,
          show_visual_alerts: true,
          play_audio_cues: true,
          vibrate_alerts: false,
          caption_font_scale: 1,
        };
  });

  const nets = Array.isArray(voiceNet.voiceNets) ? voiceNet.voiceNets : [];
  const hangoutNet = useMemo(() => findHangoutNet(nets), [nets]);
  const contractNet = useMemo(() => findContractNet(nets), [nets]);
  const operationNet = useMemo(() => findOperationCommandNet(nets, activeOp?.activeEventId), [nets, activeOp?.activeEventId]);

  const memberMap = useMemo(() => {
    const map = {};
    for (const member of members) {
      map[member.id] = member.display_callsign || member.callsign || member.full_name || member.email || member.id;
    }
    return map;
  }, [members]);

  const packetLossEstimate = useMemo(() => {
    if (voiceNet.connectionState === 'ERROR') return 12;
    if (voiceNet.connectionState === 'RECONNECTING') return 6;
    if ((latency?.latencyMs || 0) > 180) return 3;
    return 0;
  }, [latency?.latencyMs, voiceNet.connectionState]);

  const jitterEstimate = useMemo(() => {
    if (latencyHistory.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < latencyHistory.length; i += 1) {
      sum += Math.abs(latencyHistory[i] - latencyHistory[i - 1]);
    }
    return Math.round(sum / (latencyHistory.length - 1));
  }, [latencyHistory]);

  useEffect(() => {
    if (!latency?.latencyMs) return;
    setLatencyHistory((prev) => [...prev.slice(-7), latency.latencyMs]);
  }, [latency?.latencyMs]);

  const loadSignals = useCallback(async () => {
    try {
      const [readyResp, calloutsResp, captionsResp, moderationResp, membersResp] = await Promise.all([
        invokeMemberFunction('verifyCommsReadiness', {}),
        invokeMemberFunction('updateCommsConsole', {
          action: 'list_priority_callouts',
          eventId: activeOp?.activeEventId || undefined,
        }),
        invokeMemberFunction('updateCommsConsole', {
          action: 'list_voice_captions',
          eventId: activeOp?.activeEventId || undefined,
          netId: voiceNet?.activeNetId || undefined,
          limit: 80,
        }),
        invokeMemberFunction('updateCommsConsole', {
          action: 'list_voice_moderation',
          eventId: activeOp?.activeEventId || undefined,
        }),
        base44.entities.MemberProfile.list('-created_date', 200).catch(() => []),
      ]);

      const readyPayload = readyResp?.data || readyResp || {};
      setReadiness({
        isReady: Boolean(readyPayload?.isReady),
        reason: readyPayload?.reason || null,
        warning: readyPayload?.warning || null,
        envStatus: readyPayload?.envStatus || 'unknown',
      });

      const calloutPayload = calloutsResp?.data || {};
      setPriorityFeed(Array.isArray(calloutPayload.callouts) ? calloutPayload.callouts : []);

      const captionsPayload = captionsResp?.data || {};
      setCaptionFeed(Array.isArray(captionsPayload.captions) ? captionsPayload.captions : []);

      const moderationPayload = moderationResp?.data || {};
      setModerationFeed(Array.isArray(moderationPayload.moderation) ? moderationPayload.moderation : []);

      setMembers(Array.isArray(membersResp) ? membersResp : []);

      const rooms = nets
        .map((net) => net.room_name || net.roomName || `nexus-net-${net.id || net.code}`)
        .filter(Boolean)
        .slice(0, 20);

      if (rooms.length > 0) {
        const roomResp = await invokeMemberFunction('getLiveKitRoomStatus', { rooms });
        const roomPayload = roomResp?.data || roomResp || {};
        setRoomStatus(roomPayload?.data && typeof roomPayload.data === 'object' ? roomPayload.data : {});
      } else {
        setRoomStatus({});
      }
    } catch (error) {
      setBanner({ type: 'error', message: error?.message || 'Failed to load voice operations context.' });
    }
  }, [activeOp?.activeEventId, nets, voiceNet?.activeNetId]);

  useEffect(() => {
    loadSignals();
  }, [loadSignals]);

  const runCommsAction = async (payload, successMessage, reset) => {
    setBusy(true);
    setBanner(null);
    try {
      const response = await invokeMemberFunction('updateCommsConsole', payload);
      const body = response?.data || {};
      if (!body?.success) {
        setBanner({ type: 'error', message: body?.error || 'Voice action failed.' });
        return false;
      }
      if (typeof reset === 'function') {
        reset();
      }
      setBanner({ type: 'success', message: successMessage });
      await loadSignals();
      return true;
    } catch (error) {
      setBanner({ type: 'error', message: error?.message || 'Voice action failed.' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const joinSpace = async (spaceKey) => {
    const targetNet = spaceKey === 'hangout' ? hangoutNet : spaceKey === 'operation' ? operationNet : contractNet;
    if (!targetNet) {
      setBanner({ type: 'error', message: `No ${spaceKey} voice net is available.` });
      return;
    }
    const joinResult = await voiceNet.joinNet(targetNet.id || targetNet.code, currentUser);
    if (joinResult?.requiresConfirmation) {
      return;
    }
    if (!joinResult?.success) {
      setBanner({ type: 'error', message: joinResult?.error || 'Unable to join voice net.' });
      return;
    }
    setBanner({ type: 'success', message: `Joined ${targetNet.label || targetNet.name || targetNet.code}.` });
  };

  const provisionOperationTopology = async (mode) => {
    if (!activeOp?.activeEventId) {
      setBanner({ type: 'error', message: 'Activate an operation in Mission Control to provision operation voice lanes.' });
      return;
    }
    setBusy(true);
    try {
      const response = await invokeMemberFunction('updateMissionControl', {
        action: 'provision_operation_voice_topology',
        eventId: activeOp.activeEventId,
        mode,
      });
      const body = response?.data || {};
      if (!body?.success) {
        setBanner({ type: 'error', message: body?.error || 'Unable to provision topology.' });
        return;
      }
      setBanner({ type: 'success', message: `Provisioned ${mode} operation topology.` });
      await loadSignals();
    } catch (error) {
      setBanner({ type: 'error', message: error?.message || 'Unable to provision topology.' });
    } finally {
      setBusy(false);
    }
  };

  const criticalCount = priorityFeed.filter((entry) => entry.priority === 'CRITICAL').length;

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`rounded border p-3 text-xs ${banner.type === 'success' ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="border border-zinc-800 rounded p-3 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Hangout Voice</div>
          <div className="text-xs text-zinc-300 mt-1">Always-on social voice room for members not in an operation.</div>
          <Button size="sm" className="mt-3 w-full" variant="outline" disabled={busy || !hangoutNet || !currentUser} onClick={() => joinSpace('hangout')}>
            Join Hangout
          </Button>
        </div>
        <div className="border border-zinc-800 rounded p-3 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Operation Voice</div>
          <div className="text-xs text-zinc-300 mt-1">Command + squad lanes for active operations (casual or focused).</div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button size="sm" variant="outline" disabled={busy || !activeOp?.activeEventId} onClick={() => provisionOperationTopology('casual')}>Provision Casual</Button>
            <Button size="sm" disabled={busy || !activeOp?.activeEventId} onClick={() => provisionOperationTopology('focused')}>Provision Focused</Button>
          </div>
          <Button size="sm" className="mt-2 w-full" disabled={busy || !operationNet || !currentUser} onClick={() => joinSpace('operation')}>Join Operation Net</Button>
        </div>
        <div className="border border-zinc-800 rounded p-3 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Contract Voice</div>
          <div className="text-xs text-zinc-300 mt-1">Optional ad-hoc comms for contract work, bounties, and logistics jobs.</div>
          <Button size="sm" className="mt-3 w-full" variant="outline" disabled={busy || !contractNet || !currentUser} onClick={() => joinSpace('contract')}>
            Join Contract Net
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Activity className="w-3.5 h-3.5" />Comms Health</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border border-zinc-800 rounded p-2 bg-zinc-900/50">
              <div className="text-zinc-500 uppercase text-[10px]">LiveKit Ready</div>
              <div className={`${readiness.isReady ? 'text-green-300' : 'text-red-300'} font-semibold mt-1`}>{readiness.isReady ? 'Ready' : 'Not Ready'}</div>
            </div>
            <div className="border border-zinc-800 rounded p-2 bg-zinc-900/50">
              <div className="text-zinc-500 uppercase text-[10px]">Connection</div>
              <div className="text-zinc-200 font-semibold mt-1">{voiceNet.connectionState}</div>
            </div>
            <div className="border border-zinc-800 rounded p-2 bg-zinc-900/50">
              <div className="text-zinc-500 uppercase text-[10px]">Latency</div>
              <div className="text-zinc-200 font-semibold mt-1">{latency?.latencyMs || 0} ms</div>
            </div>
            <div className="border border-zinc-800 rounded p-2 bg-zinc-900/50">
              <div className="text-zinc-500 uppercase text-[10px]">Jitter / Loss</div>
              <div className="text-zinc-200 font-semibold mt-1">{jitterEstimate} ms / {packetLossEstimate}%</div>
            </div>
          </div>
          {readiness.warning && <div className="text-[11px] text-orange-300">{readiness.warning}</div>}
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {Object.entries(roomStatus).slice(0, 8).map(([roomName, status]) => (
              <div key={roomName} className="text-[11px] text-zinc-300 border border-zinc-800 rounded p-2 flex items-center justify-between">
                <span className="truncate">{roomName}</span>
                <span className="text-zinc-500">{status?.participantCount || 0} active</span>
              </div>
            ))}
            {Object.keys(roomStatus).length === 0 && <div className="text-[11px] text-zinc-500">Room telemetry not available.</div>}
          </div>
          <Button size="sm" variant="outline" onClick={loadSignals} disabled={busy}>Refresh Health</Button>
        </div>

        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Shield className="w-3.5 h-3.5" />Priority Voice Callouts</div>
          <div className="grid grid-cols-3 gap-2">
            <select value={priorityForm.priority} onChange={(e) => setPriorityForm((prev) => ({ ...prev, priority: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm" aria-label="Callout priority">
              {PRIORITIES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
            </select>
            <Input value={priorityForm.lane} onChange={(e) => setPriorityForm((prev) => ({ ...prev, lane: e.target.value }))} placeholder="Lane" aria-label="Voice lane" />
            <select value={priorityForm.channelId} onChange={(e) => setPriorityForm((prev) => ({ ...prev, channelId: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm" aria-label="Relay channel">
              <option value="">No text relay</option>
              {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name || channel.id}</option>)}
            </select>
          </div>
          <Textarea value={priorityForm.message} onChange={(e) => setPriorityForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="Callout message" className="min-h-[70px]" />
          <div className="flex flex-wrap gap-2">
            {['GREEN GREEN', 'CONTACT FRONT', 'SCRAMBLE NOW', 'RTB', 'MEDIC NEEDED'].map((macro) => (
              <Button key={macro} type="button" size="sm" variant="outline" onClick={() => setPriorityForm((prev) => ({ ...prev, message: macro }))}>
                {macro}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            disabled={busy || !priorityForm.message.trim()}
            onClick={() => runCommsAction(
              {
                action: 'issue_priority_callout',
                eventId: activeOp?.activeEventId || undefined,
                message: priorityForm.message,
                priority: priorityForm.priority,
                lane: priorityForm.lane,
                channelId: priorityForm.channelId || undefined,
                requiresAck: priorityForm.priority !== 'STANDARD',
              },
              'Priority callout issued.',
              () => setPriorityForm((prev) => ({ ...prev, message: '' }))
            )}
          >
            Broadcast Callout
          </Button>
          <div className="text-[11px] text-zinc-400">Critical callouts in feed: <span className="text-red-300 font-semibold">{criticalCount}</span></div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {priorityFeed.slice(0, 6).map((entry) => (
              <div key={entry.id} className={`text-[11px] border rounded p-2 ${entry.priority === 'CRITICAL' ? 'border-red-500/40 bg-red-500/10 text-red-200' : entry.priority === 'HIGH' ? 'border-orange-500/40 bg-orange-500/10 text-orange-200' : 'border-zinc-800 bg-zinc-900/50 text-zinc-300'}`}>
                <span className="uppercase mr-1">{entry.priority}</span>
                {entry.message}
              </div>
            ))}
            {priorityFeed.length === 0 && <div className="text-[11px] text-zinc-500">No callouts logged yet.</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Waves className="w-3.5 h-3.5" />Accessibility + Captions</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.text_fallback} onChange={(e) => setPrefs((prev) => ({ ...prev, text_fallback: e.target.checked }))} />Text fallback</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.show_visual_alerts} onChange={(e) => setPrefs((prev) => ({ ...prev, show_visual_alerts: e.target.checked }))} />Visual alerts</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.play_audio_cues} onChange={(e) => setPrefs((prev) => ({ ...prev, play_audio_cues: e.target.checked }))} />Audio cues</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.vibrate_alerts} onChange={(e) => setPrefs((prev) => ({ ...prev, vibrate_alerts: e.target.checked }))} />Vibration alerts</label>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              localStorage.setItem('nexus.voice.accessibility', JSON.stringify(prefs));
              await runCommsAction(
                {
                  action: 'set_voice_alert_preferences',
                  eventId: activeOp?.activeEventId || undefined,
                  preferences: prefs,
                },
                'Accessibility preferences saved.'
              );
            }}
          >
            Save Preferences
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Input value={captionForm.speaker} onChange={(e) => setCaptionForm((prev) => ({ ...prev, speaker: e.target.value }))} placeholder="Speaker" aria-label="Caption speaker" />
            <select value={captionForm.severity} onChange={(e) => setCaptionForm((prev) => ({ ...prev, severity: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm" aria-label="Caption severity">
              <option value="INFO">Info</option>
              <option value="ALERT">Alert</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <Button
              size="sm"
              disabled={busy || !captionForm.text.trim()}
              onClick={() => runCommsAction(
                {
                  action: 'record_voice_caption',
                  eventId: activeOp?.activeEventId || undefined,
                  netId: voiceNet?.activeNetId || undefined,
                  speaker: captionForm.speaker,
                  text: captionForm.text,
                  severity: captionForm.severity,
                },
                'Caption recorded.',
                () => setCaptionForm((prev) => ({ ...prev, text: '' }))
              )}
            >
              Log Caption
            </Button>
          </div>
          <Textarea value={captionForm.text} onChange={(e) => setCaptionForm((prev) => ({ ...prev, text: e.target.value }))} placeholder="Caption text" className="min-h-[55px]" />
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {captionFeed.slice(0, 6).map((entry) => (
              <div key={entry.id} className="text-[11px] border border-zinc-800 rounded p-2 bg-zinc-900/50 text-zinc-300">
                <span className={`uppercase mr-1 ${entry.severity === 'CRITICAL' ? 'text-red-300' : entry.severity === 'ALERT' ? 'text-orange-300' : 'text-zinc-500'}`}>{entry.severity}</span>
                {entry.speaker ? `${entry.speaker}: ` : ''}{entry.text}
              </div>
            ))}
            {captionFeed.length === 0 && <div className="text-[11px] text-zinc-500">No captions yet.</div>}
          </div>
        </div>

        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Lock className="w-3.5 h-3.5" />Voice Moderation + Safety</div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={moderationForm.targetMemberProfileId}
              onChange={(e) => setModerationForm((prev) => ({ ...prev, targetMemberProfileId: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
              aria-label="Moderation target"
            >
              <option value="">Target member...</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>{memberMap[member.id] || member.id}</option>
              ))}
            </select>
            <select
              value={moderationForm.moderationAction}
              onChange={(e) => setModerationForm((prev) => ({ ...prev, moderationAction: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
              aria-label="Moderation action"
            >
              {MOD_ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
            <select
              value={moderationForm.channelId}
              onChange={(e) => setModerationForm((prev) => ({ ...prev, channelId: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
              aria-label="Moderation channel"
            >
              <option value="">Channel optional...</option>
              {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name || channel.id}</option>)}
            </select>
            <Input value={moderationForm.reason} onChange={(e) => setModerationForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason" aria-label="Moderation reason" />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || (!moderationForm.targetMemberProfileId && !['LOCK_CHANNEL', 'UNLOCK_CHANNEL'].includes(moderationForm.moderationAction))}
            onClick={() => runCommsAction(
              {
                action: 'moderate_voice_user',
                eventId: activeOp?.activeEventId || undefined,
                targetMemberProfileId: moderationForm.targetMemberProfileId || undefined,
                moderationAction: moderationForm.moderationAction,
                channelId: moderationForm.channelId || undefined,
                reason: moderationForm.reason,
              },
              'Moderation action logged.'
            )}
          >
            Execute Moderation
          </Button>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {moderationFeed.slice(0, 6).map((entry) => (
              <div key={entry.id} className="text-[11px] border border-zinc-800 rounded p-2 bg-zinc-900/50 text-zinc-300 flex items-center justify-between gap-2">
                <span>{entry.moderation_action} {entry.target_member_profile_id ? `-> ${memberMap[entry.target_member_profile_id] || entry.target_member_profile_id}` : ''}</span>
                <span className="text-zinc-500">{formatDate(entry.created_date)}</span>
              </div>
            ))}
            {moderationFeed.length === 0 && <div className="text-[11px] text-zinc-500">No moderation actions logged.</div>}
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <Mic className="w-3 h-3" />
            Operational safety logs are persisted for post-op review and debrief analytics.
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <Headphones className="w-3 h-3" />
            Text fallback mirrors critical voice callouts to support accessibility.
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Critical callouts trigger visual escalation in this panel.
          </div>
        </div>
      </div>

      {voiceNet.focusedConfirmation?.needsConfirmation && (
        <div className="border border-orange-500/40 rounded p-3 bg-orange-500/10 text-xs text-orange-200 flex items-center justify-between">
          <span>Focused net discipline confirmation required.</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => voiceNet.cancelFocusedJoin?.()}>Cancel</Button>
            <Button size="sm" onClick={() => voiceNet.confirmFocusedJoin?.()}>Join Focused Net</Button>
          </div>
        </div>
      )}
    </div>
  );
}
