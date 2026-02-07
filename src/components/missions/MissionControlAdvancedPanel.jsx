import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, Clock, Medal, ShieldAlert, Star, Target, TrendingUp } from 'lucide-react';

function text(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function asDateMs(value) {
  const raw = text(value);
  if (!raw) return 0;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function metricTone(value) {
  if (value >= 75) return 'text-green-300';
  if (value >= 45) return 'text-yellow-300';
  return 'text-zinc-300';
}

function parseMissionLogs(eventLogs, eventId) {
  return (eventLogs || [])
    .filter((entry) => {
      const type = text(entry?.type).toUpperCase();
      if (!type.startsWith('MISSION_CONTROL_')) return false;
      const detailsEventId = text(entry?.details?.event_id || entry?.related_entity_id);
      return detailsEventId === eventId;
    })
    .sort((a, b) => asDateMs(a.created_date) - asDateMs(b.created_date));
}

function manifestFromLogs(logs) {
  const byId = new Map();
  for (const log of logs) {
    if (text(log?.type).toUpperCase() !== 'MISSION_CONTROL_MANIFEST') continue;
    const details = log?.details || {};
    const itemId = text(details?.item_id);
    if (!itemId) continue;
    byId.set(itemId, {
      id: itemId,
      label: text(details?.label),
      checked: Boolean(details?.checked),
      updated_at: details?.updated_at || log?.created_date,
    });
  }
  return Array.from(byId.values());
}

function countsByHour(logs) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const log of logs) {
    const date = new Date(log?.created_date || '');
    if (Number.isNaN(date.getTime())) continue;
    const hour = date.getHours();
    buckets[hour].count += 1;
  }
  return buckets;
}

export default function MissionControlAdvancedPanel({ event, allEvents = [], onRefresh }) {
  const [logs, setLogs] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [reports, setReports] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const [positionForm, setPositionForm] = useState({ memberProfileId: '', x: '', y: '', z: '', location: '', note: '' });
  const [beaconForm, setBeaconForm] = useState({ severity: 'CRITICAL', message: '', location: '' });
  const [intelForm, setIntelForm] = useState({ summary: '', threatLevel: 'MEDIUM', source: '' });
  const [roleSwapForm, setRoleSwapForm] = useState({ fromMemberProfileId: '', toMemberProfileId: '', role: '' });
  const [manifestDraft, setManifestDraft] = useState('');
  const [recognitionForm, setRecognitionForm] = useState({ targetMemberProfileId: '', badgeName: '', commendation: '', ribbon: '', medal: '', note: '' });
  const [blueprintForm, setBlueprintForm] = useState({ blueprintName: '', notes: '' });
  const [scheduleForm, setScheduleForm] = useState({ proposedStartTime: '', rationale: '' });

  const assignedIds = useMemo(() => {
    const ids = Array.isArray(event?.assigned_member_profile_ids)
      ? event.assigned_member_profile_ids
      : Array.isArray(event?.assigned_user_ids)
        ? event.assigned_user_ids
        : [];
    return ids.map((id) => text(id)).filter(Boolean);
  }, [event]);

  const memberOptions = useMemo(() => {
    const byId = new Map((members || []).map((member) => [member.id, member]));
    return assignedIds.map((id) => {
      const profile = byId.get(id);
      return {
        id,
        label: text(profile?.display_callsign || profile?.callsign || profile?.full_name || id),
      };
    });
  }, [assignedIds, members]);

  const loadContext = useCallback(async () => {
    if (!event?.id) return;
    setLoading(true);
    try {
      const [eventLogs, statusRows, reportRows, memberRows] = await Promise.all([
        base44.entities.EventLog.list('-created_date', 700),
        base44.entities.PlayerStatus.list('-created_date', 200).catch(() => []),
        base44.entities.EventReport.filter({ event_id: event.id }, '-created_date').catch(() => []),
        base44.entities.MemberProfile.list('-created_date', 300).catch(() => []),
      ]);
      setLogs(parseMissionLogs(eventLogs || [], event.id));
      setStatuses(statusRows || []);
      setReports(reportRows || []);
      setMembers(memberRows || []);

      if (!positionForm.memberProfileId && assignedIds[0]) {
        setPositionForm((prev) => ({ ...prev, memberProfileId: assignedIds[0] }));
      }
      if (!roleSwapForm.fromMemberProfileId && assignedIds[0]) {
        setRoleSwapForm((prev) => ({ ...prev, fromMemberProfileId: assignedIds[0] }));
      }
      if (!roleSwapForm.toMemberProfileId && assignedIds[1]) {
        setRoleSwapForm((prev) => ({ ...prev, toMemberProfileId: assignedIds[1] }));
      }
      if (!recognitionForm.targetMemberProfileId && assignedIds[0]) {
        setRecognitionForm((prev) => ({ ...prev, targetMemberProfileId: assignedIds[0] }));
      }
    } catch (error) {
      setBanner({ type: 'error', message: `Failed loading advanced ops context: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [assignedIds, event?.id, positionForm.memberProfileId, recognitionForm.targetMemberProfileId, roleSwapForm.fromMemberProfileId, roleSwapForm.toMemberProfileId]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const runAction = async (payload, successMessage, reset) => {
    setBanner(null);
    try {
      const response = await invokeMemberFunction('updateMissionControl', {
        ...payload,
        eventId: event.id,
      });
      if (!response?.data?.success) {
        setBanner({ type: 'error', message: response?.data?.error || 'Mission control action failed.' });
        return false;
      }
      if (typeof reset === 'function') reset();
      setBanner({ type: 'success', message: successMessage || 'Mission control updated.' });
      await loadContext();
      await onRefresh?.();
      return true;
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Mission control action failed.' });
      return false;
    }
  };

  const timeline = logs;
  const manifestItems = useMemo(() => manifestFromLogs(logs), [logs]);
  const heatmap = useMemo(() => countsByHour(logs), [logs]);
  const recognitionRows = useMemo(
    () => logs.filter((entry) => text(entry?.type).toUpperCase() === 'MISSION_CONTROL_RECOGNITION').slice().reverse(),
    [logs]
  );
  const beaconRows = useMemo(
    () => logs.filter((entry) => text(entry?.type).toUpperCase() === 'MISSION_CONTROL_BEACON').slice().reverse(),
    [logs]
  );
  const intelRows = useMemo(
    () => logs.filter((entry) => text(entry?.type).toUpperCase() === 'MISSION_CONTROL_INTEL_UPLOAD').slice().reverse(),
    [logs]
  );
  const positionRows = useMemo(
    () => logs.filter((entry) => text(entry?.type).toUpperCase() === 'MISSION_CONTROL_POSITION').slice().reverse(),
    [logs]
  );

  const objectiveTotal = Array.isArray(event?.objectives) ? event.objectives.length : 0;
  const objectiveDone = Array.isArray(event?.objectives) ? event.objectives.filter((item) => item?.is_completed).length : 0;
  const objectivePct = objectiveTotal > 0 ? Math.round((objectiveDone / objectiveTotal) * 100) : 0;
  const participationBadges = recognitionRows.filter((entry) => text(entry?.details?.badge_name)).length;
  const commendations = recognitionRows.filter((entry) => text(entry?.details?.commendation)).length;
  const ribbonMedals = recognitionRows.filter((entry) => text(entry?.details?.ribbon) || text(entry?.details?.medal)).length;
  const activityScore = Math.min(100, (timeline.length * 4) + (reports.length * 7) + (objectivePct / 2));

  const onThisDay = useMemo(() => {
    const target = event?.start_time ? new Date(event.start_time) : null;
    if (!target || Number.isNaN(target.getTime())) return [];
    const month = target.getMonth();
    const day = target.getDate();
    const year = target.getFullYear();
    return (allEvents || [])
      .filter((row) => {
        if (!row?.start_time) return false;
        const d = new Date(row.start_time);
        return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getDate() === day && d.getFullYear() !== year;
      })
      .slice(0, 6);
  }, [allEvents, event?.start_time]);

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`p-3 rounded border text-xs ${banner.type === 'success' ? 'border-green-500/40 bg-green-500/10 text-green-200' : 'border-red-500/40 bg-red-500/10 text-red-200'}`}>
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 border border-zinc-700 rounded bg-zinc-900/40">
          <div className="text-[10px] uppercase text-zinc-500">Objective Completion</div>
          <div className={`text-lg font-bold mt-1 ${metricTone(objectivePct)}`}>{objectivePct}%</div>
          <div className="text-[10px] text-zinc-500">{objectiveDone}/{objectiveTotal || 0}</div>
        </div>
        <div className="p-3 border border-zinc-700 rounded bg-zinc-900/40">
          <div className="text-[10px] uppercase text-zinc-500">Activity Score</div>
          <div className={`text-lg font-bold mt-1 ${metricTone(activityScore)}`}>{activityScore}</div>
          <div className="text-[10px] text-zinc-500">Timeline + reports + objectives</div>
        </div>
        <div className="p-3 border border-zinc-700 rounded bg-zinc-900/40">
          <div className="text-[10px] uppercase text-zinc-500">Live Position Pings</div>
          <div className="text-lg font-bold text-white mt-1">{positionRows.length}</div>
          <div className="text-[10px] text-zinc-500">Operation tracker updates</div>
        </div>
        <div className="p-3 border border-zinc-700 rounded bg-zinc-900/40">
          <div className="text-[10px] uppercase text-zinc-500">Recognition Issued</div>
          <div className="text-lg font-bold text-white mt-1">{recognitionRows.length}</div>
          <div className="text-[10px] text-zinc-500">Badges/commendations/ribbons</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border border-zinc-800 rounded bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Target className="w-3.5 h-3.5" />Live Position Tracker</div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={positionForm.memberProfileId}
              onChange={(e) => setPositionForm((prev) => ({ ...prev, memberProfileId: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
              aria-label="Position member"
            >
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>{member.label}</option>
              ))}
            </select>
            <Input value={positionForm.location} onChange={(e) => setPositionForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Location tag" aria-label="Position location" />
            <Input value={positionForm.x} onChange={(e) => setPositionForm((prev) => ({ ...prev, x: e.target.value }))} placeholder="X" aria-label="Coordinate X" />
            <Input value={positionForm.y} onChange={(e) => setPositionForm((prev) => ({ ...prev, y: e.target.value }))} placeholder="Y" aria-label="Coordinate Y" />
            <Input value={positionForm.z} onChange={(e) => setPositionForm((prev) => ({ ...prev, z: e.target.value }))} placeholder="Z" aria-label="Coordinate Z" />
            <Input value={positionForm.note} onChange={(e) => setPositionForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Note" aria-label="Position note" />
          </div>
          <Button
            size="sm"
            onClick={() => runAction(
              {
                action: 'log_position_update',
                memberProfileId: positionForm.memberProfileId,
                coordinates: {
                  x: Number(positionForm.x || 0),
                  y: Number(positionForm.y || 0),
                  z: Number(positionForm.z || 0),
                },
                location: positionForm.location,
                note: positionForm.note,
              },
              'Position update logged.'
            )}
            disabled={!positionForm.memberProfileId}
          >
            Log Position
          </Button>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {positionRows.slice(0, 5).map((entry) => (
              <div key={entry.id} className="text-[11px] text-zinc-400 border border-zinc-800 rounded p-2">
                {text(entry?.details?.member_profile_id)} @ {text(entry?.details?.location, 'N/A')} · {entry?.created_date ? new Date(entry.created_date).toLocaleTimeString() : '--'}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border border-zinc-800 rounded bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5" />Emergency Beacon System</div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={beaconForm.severity}
              onChange={(e) => setBeaconForm((prev) => ({ ...prev, severity: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
              aria-label="Beacon severity"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <Input value={beaconForm.location} onChange={(e) => setBeaconForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Beacon location" aria-label="Beacon location" />
          </div>
          <Textarea value={beaconForm.message} onChange={(e) => setBeaconForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="Beacon message..." className="min-h-[72px]" />
          <Button
            size="sm"
            onClick={() => runAction(
              {
                action: 'trigger_emergency_beacon',
                severity: beaconForm.severity,
                location: beaconForm.location,
                message: beaconForm.message,
              },
              'Emergency beacon sent.',
              () => setBeaconForm((prev) => ({ ...prev, message: '' }))
            )}
            disabled={!beaconForm.message.trim()}
            className="bg-red-600 hover:bg-red-500"
          >
            Trigger Beacon
          </Button>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {beaconRows.slice(0, 5).map((entry) => (
              <div key={entry.id} className="text-[11px] text-zinc-400 border border-zinc-800 rounded p-2">
                <span className="text-red-300 uppercase mr-1">{text(entry?.details?.severity, 'CRITICAL')}</span>
                {text(entry?.details?.message)} · {entry?.created_date ? new Date(entry.created_date).toLocaleTimeString() : '--'}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border border-zinc-800 rounded bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" />Quick Intel Upload</div>
          <select
            value={intelForm.threatLevel}
            onChange={(e) => setIntelForm((prev) => ({ ...prev, threatLevel: e.target.value }))}
            className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
            aria-label="Threat level"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <Input value={intelForm.source} onChange={(e) => setIntelForm((prev) => ({ ...prev, source: e.target.value }))} placeholder="Source (optional)" />
          <Textarea value={intelForm.summary} onChange={(e) => setIntelForm((prev) => ({ ...prev, summary: e.target.value }))} placeholder="Intel summary..." className="min-h-[72px]" />
          <Button
            size="sm"
            onClick={() => runAction(
              {
                action: 'submit_quick_intel',
                summary: intelForm.summary,
                threatLevel: intelForm.threatLevel,
                source: intelForm.source,
              },
              'Intel uploaded.',
              () => setIntelForm((prev) => ({ ...prev, summary: '' }))
            )}
            disabled={!intelForm.summary.trim()}
          >
            Submit Intel
          </Button>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {intelRows.slice(0, 5).map((entry) => (
              <div key={entry.id} className="text-[11px] text-zinc-400 border border-zinc-800 rounded p-2">
                <span className="text-orange-300 uppercase mr-1">{text(entry?.details?.threat_level, 'MEDIUM')}</span>
                {text(entry?.details?.summary)}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border border-zinc-800 rounded bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" />Hot Role Swap + Manifest</div>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={roleSwapForm.fromMemberProfileId}
              onChange={(e) => setRoleSwapForm((prev) => ({ ...prev, fromMemberProfileId: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
              aria-label="From member"
            >
              {memberOptions.map((member) => (
                <option key={`from-${member.id}`} value={member.id}>{member.label}</option>
              ))}
            </select>
            <select
              value={roleSwapForm.toMemberProfileId}
              onChange={(e) => setRoleSwapForm((prev) => ({ ...prev, toMemberProfileId: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
              aria-label="To member"
            >
              {memberOptions.map((member) => (
                <option key={`to-${member.id}`} value={member.id}>{member.label}</option>
              ))}
            </select>
            <Input value={roleSwapForm.role} onChange={(e) => setRoleSwapForm((prev) => ({ ...prev, role: e.target.value }))} placeholder="Role" aria-label="Role name" />
          </div>
          <Button
            size="sm"
            onClick={() => runAction(
              {
                action: 'swap_role_assignment',
                fromMemberProfileId: roleSwapForm.fromMemberProfileId,
                toMemberProfileId: roleSwapForm.toMemberProfileId,
                role: roleSwapForm.role,
              },
              'Role swap logged and assignments updated.'
            )}
            disabled={!roleSwapForm.fromMemberProfileId || !roleSwapForm.toMemberProfileId}
          >
            Execute Role Swap
          </Button>
          <div className="border-t border-zinc-800 pt-3 space-y-2">
            <div className="flex gap-2">
              <Input value={manifestDraft} onChange={(e) => setManifestDraft(e.target.value)} placeholder="Add manifest item..." />
              <Button
                size="sm"
                onClick={() => runAction(
                  {
                    action: 'upsert_manifest_item',
                    label: manifestDraft,
                    checked: false,
                  },
                  'Manifest item added.',
                  () => setManifestDraft('')
                )}
                disabled={!manifestDraft.trim()}
              >
                Add
              </Button>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {manifestItems.length === 0 ? (
                <div className="text-[11px] text-zinc-500">No manifest checklist entries yet.</div>
              ) : (
                manifestItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => runAction(
                      {
                        action: 'upsert_manifest_item',
                        itemId: item.id,
                        label: item.label,
                        checked: !item.checked,
                      },
                      `Manifest item ${!item.checked ? 'checked' : 'unchecked'}.`
                    )}
                    className={`w-full text-left text-[11px] border rounded p-2 ${
                      item.checked ? 'border-green-500/40 bg-green-500/10 text-green-200' : 'border-zinc-700 bg-zinc-900/40 text-zinc-300'
                    }`}
                  >
                    {item.checked ? '✓ ' : '○ '}
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border border-zinc-800 rounded bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Star className="w-3.5 h-3.5" />Recognition Console</div>
          <select
            value={recognitionForm.targetMemberProfileId}
            onChange={(e) => setRecognitionForm((prev) => ({ ...prev, targetMemberProfileId: e.target.value }))}
            className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
            aria-label="Recognition target member"
          >
            {memberOptions.map((member) => (
              <option key={`recognition-${member.id}`} value={member.id}>{member.label}</option>
            ))}
          </select>
          <Input value={recognitionForm.badgeName} onChange={(e) => setRecognitionForm((prev) => ({ ...prev, badgeName: e.target.value }))} placeholder="Badge name" />
          <Input value={recognitionForm.ribbon} onChange={(e) => setRecognitionForm((prev) => ({ ...prev, ribbon: e.target.value }))} placeholder="Ribbon name" />
          <Input value={recognitionForm.medal} onChange={(e) => setRecognitionForm((prev) => ({ ...prev, medal: e.target.value }))} placeholder="Medal name" />
          <Textarea value={recognitionForm.commendation} onChange={(e) => setRecognitionForm((prev) => ({ ...prev, commendation: e.target.value }))} placeholder="Commendation..." className="min-h-[70px]" />
          <Button
            size="sm"
            onClick={() => runAction(
              {
                action: 'award_recognition',
                ...recognitionForm,
              },
              'Recognition awarded.',
              () => setRecognitionForm((prev) => ({ ...prev, badgeName: '', commendation: '', ribbon: '', medal: '', note: '' }))
            )}
            disabled={!recognitionForm.targetMemberProfileId}
          >
            Award Recognition
          </Button>
          <div className="text-[11px] text-zinc-500">
            Badges: {participationBadges} · Commendations: {commendations} · Ribbons/Medals: {ribbonMedals}
          </div>
        </div>

        <div className="p-4 border border-zinc-800 rounded bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Clock className="w-3.5 h-3.5" />Blueprints + Smart Scheduling</div>
          <Input value={blueprintForm.blueprintName} onChange={(e) => setBlueprintForm((prev) => ({ ...prev, blueprintName: e.target.value }))} placeholder="Blueprint/template used..." />
          <Input value={blueprintForm.notes} onChange={(e) => setBlueprintForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Blueprint notes..." />
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction(
              { action: 'record_blueprint_usage', blueprintName: blueprintForm.blueprintName, notes: blueprintForm.notes },
              'Blueprint usage logged.'
            )}
            disabled={!blueprintForm.blueprintName.trim()}
          >
            Record Blueprint Usage
          </Button>
          <Input type="datetime-local" value={scheduleForm.proposedStartTime} onChange={(e) => setScheduleForm((prev) => ({ ...prev, proposedStartTime: e.target.value }))} />
          <Input value={scheduleForm.rationale} onChange={(e) => setScheduleForm((prev) => ({ ...prev, rationale: e.target.value }))} placeholder="Scheduling rationale..." />
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction(
              {
                action: 'record_smart_schedule',
                proposedStartTime: scheduleForm.proposedStartTime ? new Date(scheduleForm.proposedStartTime).toISOString() : '',
                rationale: scheduleForm.rationale,
              },
              'Smart scheduling recommendation applied.'
            )}
            disabled={!scheduleForm.proposedStartTime}
          >
            Apply Smart Schedule
          </Button>
          <div className="text-[11px] text-zinc-500">Use this with AI planning modal for full blueprint/template workflows.</div>
        </div>

        <div className="p-4 border border-zinc-800 rounded bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Medal className="w-3.5 h-3.5" />On This Day + Historical Ops</div>
          {onThisDay.length === 0 ? (
            <div className="text-[11px] text-zinc-500">No prior operations on this date.</div>
          ) : (
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {onThisDay.map((item) => (
                <div key={item.id} className="border border-zinc-800 rounded p-2 text-[11px] text-zinc-300">
                  <div className="font-semibold text-white">{item.title || item.id}</div>
                  <div className="text-zinc-500 mt-1">{item.start_time ? new Date(item.start_time).toLocaleString() : 'Unknown date'}</div>
                </div>
              ))}
            </div>
          )}
          <div className="text-[11px] text-zinc-500">This powers historical replay context for planning and readiness drills.</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border border-zinc-800 rounded bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" />Operation Replay / Timeline Viewer</div>
          {timeline.length === 0 ? (
            <div className="text-[11px] text-zinc-500">No mission-control timeline records yet.</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {timeline.slice().reverse().map((entry) => (
                <div key={entry.id} className="border border-zinc-800 rounded p-2 bg-zinc-900/50">
                  <div className="text-[10px] text-zinc-500 uppercase">{text(entry?.type)}</div>
                  <div className="text-xs text-zinc-300 mt-1">{text(entry?.summary, 'Mission activity')}</div>
                  <div className="text-[10px] text-zinc-600 mt-1">{entry?.created_date ? new Date(entry.created_date).toLocaleString() : '--'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border border-zinc-800 rounded bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />Heat Map of Active Periods</div>
          <div className="grid grid-cols-6 gap-2">
            {heatmap.map((bucket) => {
              const intensity = Math.min(bucket.count * 18, 100);
              return (
                <div key={`hour-${bucket.hour}`} className="text-center">
                  <div className="h-9 rounded border border-zinc-800 overflow-hidden bg-zinc-900/50">
                    <div className="h-full bg-orange-500/40" style={{ width: `${intensity}%` }} />
                  </div>
                  <div className="text-[9px] text-zinc-500 mt-1">{String(bucket.hour).padStart(2, '0')}</div>
                </div>
              );
            })}
          </div>
          <div className="text-[11px] text-zinc-500">Hourly mission-control activity extracted from live timeline records.</div>
        </div>
      </div>

      <div className="p-3 border border-zinc-800 rounded bg-zinc-900/40 text-[11px] text-zinc-400">
        <span className="text-zinc-300">Live status references:</span>{' '}
        {loading ? 'Loading context...' : `${statuses.length} player statuses · ${reports.length} operation reports · ${logs.length} mission-control logs`}
      </div>
    </div>
  );
}
